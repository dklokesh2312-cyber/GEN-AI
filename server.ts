import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dns from "dns/promises";

// Initialize express app
const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// Free email providers list
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
  "icloud.com", "proton.me", "protonmail.com", "zoho.com", "mail.com",
  "gmx.com", "yandex.com", "live.com"
]);

// Suspicious high-abuse TLDs often used for disposable phishing
const HIGH_RISK_TLDS = new Set([
  "xyz", "top", "online", "work", "click", "site", "vip", "club",
  "buzz", "rest", "surf", "monster", "cfd", "sbs", "fit", "beauty"
]);

// Helper to extract clean domain/hostname from input string
function extractDomain(input: string): string {
  let cleaned = input.trim();
  // Strip protocol
  cleaned = cleaned.replace(/^(?:https?:\/\/)?(?:mailto:)?/, "");
  // Strip auth / paths / queries / ports
  cleaned = cleaned.split("/")[0].split("?")[0].split("#")[0].split(":")[0];
  // If an email address, take after @
  if (cleaned.includes("@")) {
    cleaned = cleaned.split("@")[1];
  }
  return cleaned.toLowerCase().trim();
}

// Domain age & RDAP lookup handler
app.post("/api/check-domain", async (req, res) => {
  const { domainInput } = req.body;
  if (!domainInput || typeof domainInput !== "string") {
    res.status(400).json({ error: "Domain input is required" });
    return;
  }

  const cleanDomain = extractDomain(domainInput);
  if (!cleanDomain || !cleanDomain.includes(".")) {
    res.status(400).json({ error: "Invalid domain format" });
    return;
  }

  const parts = cleanDomain.split(".");
  const tld = parts[parts.length - 1];
  const isFreeMail = FREE_EMAIL_DOMAINS.has(cleanDomain);
  const isHighRiskTLD = HIGH_RISK_TLDS.has(tld);

  let registrationDate: string | null = null;
  let registrar: string | null = null;
  let ageDays: number | null = null;
  let rdapStatus = "unknown";
  let dnsResolved = false;

  // Check DNS resolution
  try {
    const addresses = await dns.resolve4(cleanDomain);
    if (addresses && addresses.length > 0) {
      dnsResolved = true;
    }
  } catch {
    dnsResolved = false;
  }

  // Attempt RDAP lookup from rdap.org
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const rdapRes = await fetch(`https://rdap.org/domain/${cleanDomain}`, {
      headers: { Accept: "application/rdap+json" },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (rdapRes.ok) {
      const rdapData = await rdapRes.json();
      rdapStatus = "active";

      // Extract events
      if (Array.isArray(rdapData.events)) {
        const regEvent = rdapData.events.find((e: any) =>
          e.eventAction === "registration" || e.eventAction === "created"
        );
        if (regEvent && regEvent.eventDate) {
          registrationDate = regEvent.eventDate;
          const regTime = new Date(regEvent.eventDate).getTime();
          const now = Date.now();
          ageDays = Math.max(0, Math.floor((now - regTime) / (1000 * 60 * 60 * 24)));
        }
      }

      // Extract registrar
      if (Array.isArray(rdapData.entities)) {
        for (const entity of rdapData.entities) {
          if (entity.roles && entity.roles.includes("registrar")) {
            if (entity.vcardArray && entity.vcardArray[1]) {
              const fn = entity.vcardArray[1].find((v: any) => v[0] === "fn");
              if (fn && fn[3]) {
                registrar = String(fn[3]);
              }
            }
          }
        }
      }
    } else if (rdapRes.status === 404) {
      rdapStatus = "unregistered_or_not_found";
    }
  } catch {
    rdapStatus = "lookup_timeout_or_inconclusive";
  }

  // Calculate domain risk signals
  const riskSignals: string[] = [];
  let domainThreatScore = 0;

  if (isFreeMail) {
    riskSignals.push("Sender domain is a free public webmail provider (@" + cleanDomain + "). Enterprise employers and official landlords never use free mailboxes for formal offers.");
    domainThreatScore += 35;
  }

  if (isHighRiskTLD) {
    riskSignals.push(`Top-Level Domain (TLD) .${tld} is frequently associated with disposable cyber fraud campaigns and domain churning.`);
    domainThreatScore += 25;
  }

  if (ageDays !== null) {
    if (ageDays < 30) {
      riskSignals.push(`Critical: Domain was registered only ${ageDays} day(s) ago. Extremely high probability of throwaway phishing infrastructure.`);
      domainThreatScore += 45;
    } else if (ageDays < 90) {
      riskSignals.push(`Warning: Domain is freshly registered (${ageDays} days old). Legitimate enterprise operations typically have established domain history.`);
      domainThreatScore += 25;
    } else if (ageDays > 730) {
      // > 2 years
      riskSignals.push(`Established domain: Registered ${Math.floor(ageDays / 365)} years ago.`);
      domainThreatScore = Math.max(0, domainThreatScore - 15);
    }
  } else if (!isFreeMail) {
    riskSignals.push("Domain WHOIS/RDAP privacy shielded or non-standard registrar query.");
    domainThreatScore += 10;
  }

  res.json({
    domain: cleanDomain,
    tld: `.${tld}`,
    isFreeMail,
    isHighRiskTLD,
    dnsResolved,
    registrationDate,
    registrar: registrar || "Privacy Protected / Redacted",
    ageDays,
    rdapStatus,
    domainThreatScore: Math.min(100, Math.max(0, domainThreatScore)),
    riskSignals
  });
});

// Lazy Gemini SDK client helper
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// POST /api/inspect-scam
app.post("/api/inspect-scam", async (req, res) => {
  const { text, urlOrDomain, inspectionType } = req.body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    res.status(400).json({ error: "Offer letter or agreement text is required." });
    return;
  }

  const ai = getGeminiClient();

  if (!ai) {
    // If no API key is provided, return structured indicator explaining how to set up secret or use local heuristic engine
    res.status(200).json({
      fallbackMode: true,
      message: "GEMINI_API_KEY is not set. Using built-in heuristic deep forensic rules.",
      isAiPowered: false
    });
    return;
  }

  try {
    const prompt = `You are a Principal Cybercrime & Fraud Intelligence Analyst specializing in job offer phishing, pay-for-equipment employment scams, and rental lease deposit traps.

Analyze the following suspicious document or message excerpt:
"""
${text.slice(0, 10000)}
"""

Context / Associated URL or Domain: ${urlOrDomain || "None provided"}
Inspection Context: ${inspectionType || "Job Offer / Rental Agreement"}

Investigate for:
1. Pay-for-equipment scams (cashier check sent, victim told to wire money back to "vendor").
2. Upfront payment / fee traps (background check fees, onboarding software, uniform fees, application deposits via Zelle/CashApp/Crypto/Gift Cards).
3. Sight-unseen apartment rental traps (landlord claimed out of country/missionary, wire deposit to hold keys).
4. Off-platform or non-standard interview process (Telegram, WhatsApp, Google Chat text-only interview).
5. Linguistic hallmarks (excessive piety "God bless", grammatical oddities "kindly revert back", extreme urgency "lock in within 24 hours").
6. Domain/Email mismatch (impersonating a Fortune 500 company using a gmail.com address or typosquatted domain).

Respond ONLY with JSON conforming to the schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scamThreatIndex: {
              type: Type.NUMBER,
              description: "Overall Scam Threat Index from 0 to 100",
            },
            verdict: {
              type: Type.STRING,
              description: "One of: CRITICAL_SCAM, HIGH_RISK, SUSPICIOUS, LIKELY_LEGITIMATE, VERIFIED_SAFE",
            },
            category: {
              type: Type.STRING,
              description: "Category like Job Offer Phishing, Rental Deposit Trap, Equipment Overpayment, or Legitimate Offer",
            },
            executiveSummary: {
              type: Type.STRING,
              description: "Concise, authoritative 2-3 sentence forensic verdict for the victim.",
            },
            redFlags: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  severity: { type: Type.STRING, description: "CRITICAL, HIGH, MEDIUM, or LOW" },
                  category: { type: Type.STRING, description: "PAYMENT_DEMAND, DOMAIN_SENDER, INTERVIEW_PROCESS, CONTRACT_TERMS, or URGENCY_DECEPTION" },
                  evidenceSnippet: { type: Type.STRING, description: "Direct quote or excerpt from the input" },
                  explanation: { type: Type.STRING, description: "Why this is dangerous and how attackers exploit it" },
                  weight: { type: Type.NUMBER, description: "Score penalty contribution from 5 to 35" },
                },
                required: ["title", "severity", "category", "evidenceSnippet", "explanation", "weight"],
              },
            },
            positiveIndicators: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Legitimate hallmarks detected (if any)",
            },
            threatBreakdown: {
              type: Type.OBJECT,
              properties: {
                domainAndSenderScore: { type: Type.NUMBER, description: "0-25" },
                paymentDemandScore: { type: Type.NUMBER, description: "0-35" },
                communicationAnomaliesScore: { type: Type.NUMBER, description: "0-20" },
                urgencyAndDeceptionScore: { type: Type.NUMBER, description: "0-20" },
              },
              required: ["domainAndSenderScore", "paymentDemandScore", "communicationAnomaliesScore", "urgencyAndDeceptionScore"],
            },
            extractedEntities: {
              type: Type.OBJECT,
              properties: {
                organizationClaimed: { type: Type.STRING },
                senderEmail: { type: Type.STRING },
                compensationOrRent: { type: Type.STRING },
                paymentMethodsRequested: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                interviewChannel: { type: Type.STRING },
              },
            },
            actionableRemedies: {
              type: Type.OBJECT,
              properties: {
                verificationSteps: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                safeResponseTemplate: {
                  type: Type.STRING,
                  description: "A firm, safe counter-message to challenge the sender without tipping off or paying",
                },
                reportingAuthorities: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      url: { type: Type.STRING },
                      description: { type: Type.STRING }
                    },
                    required: ["name", "url", "description"]
                  }
                }
              },
              required: ["verificationSteps", "safeResponseTemplate", "reportingAuthorities"],
            },
          },
          required: [
            "scamThreatIndex",
            "verdict",
            "category",
            "executiveSummary",
            "redFlags",
            "positiveIndicators",
            "threatBreakdown",
            "actionableRemedies",
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    res.json({
      ...parsed,
      isAiPowered: true,
    });
  } catch (error: any) {
    console.error("Gemini Inspection Error:", error);
    res.status(500).json({
      error: "AI analysis failed: " + (error?.message || "Unknown error"),
      fallbackMode: true
    });
  }
});

// Boot Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Fake Offer & Phishing Inspector running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
