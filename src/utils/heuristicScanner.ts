import { 
  ScanInspectionResult, 
  RedFlag, 
  ExtractedEntities, 
  ThreatBreakdown, 
  ScamVerdict, 
  DomainCheckResult 
} from "../types";

const FREE_EMAIL_PROVIDERS = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
  "icloud.com", "proton.me", "protonmail.com", "zoho.com", "mail.com", "live.com"
];

const HIGH_RISK_TLDS = [
  "xyz", "top", "online", "work", "click", "site", "vip", "club",
  "buzz", "rest", "surf", "monster", "cfd", "sbs", "fit", "beauty"
];

const NOTABLE_TECH_COMPANIES = [
  { name: "Google", domain: "google.com" },
  { name: "Apple", domain: "apple.com" },
  { name: "Amazon", domain: "amazon.com" },
  { name: "Microsoft", domain: "microsoft.com" },
  { name: "Meta", domain: "meta.com" },
  { name: "Stripe", domain: "stripe.com" },
  { name: "Netflix", domain: "netflix.com" },
  { name: "Salesforce", domain: "salesforce.com" },
  { name: "Greystar", domain: "greystar.com" },
];

export function runHeuristicScan(
  rawText: string, 
  urlOrDomainInput?: string, 
  domainData?: DomainCheckResult | null
): ScanInspectionResult {
  const text = rawText || "";
  const lowerText = text.toLowerCase();
  const redFlags: RedFlag[] = [];
  const positiveIndicators: string[] = [];

  // 1. Entity Extraction
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  const detectedEmails = Array.from(new Set(text.match(emailRegex) || []));

  const urlRegex = /(?:https?:\/\/|www\.)[^\s<>"'{}|\\^`[\]]+/gi;
  const rawUrls = text.match(urlRegex) || [];
  const detectedDomains = Array.from(
    new Set([
      ...rawUrls.map(u => {
        try {
          const cleaned = u.replace(/^(?:https?:\/\/)?(?:www\.)?/, "").split("/")[0];
          return cleaned.toLowerCase();
        } catch {
          return u;
        }
      }),
      ...(urlOrDomainInput ? [urlOrDomainInput.replace(/^(?:https?:\/\/)?(?:www\.)?/, "").split("/")[0].toLowerCase()] : [])
    ])
  ).filter(d => d.includes("."));

  // Check detected payment methods
  const paymentKeywords = [
    { key: "zelle", label: "Zelle Transfer" },
    { key: "cashapp", label: "CashApp" },
    { key: "cash app", label: "CashApp" },
    { key: "$", label: "Cashtag ($)", regex: /\$[a-zA-Z0-9_]{3,}/i },
    { key: "venmo", label: "Venmo" },
    { key: "western union", label: "Western Union" },
    { key: "moneygram", label: "MoneyGram" },
    { key: "wire transfer", label: "Wire Transfer" },
    { key: "bitcoin", label: "Bitcoin / Cryptocurrency" },
    { key: "crypto", label: "Cryptocurrency" },
    { key: "apple pay", label: "Apple Pay" },
    { key: "gift card", label: "Gift Cards" },
    { key: "vanilla visa", label: "Vanilla Visa / Prepaid Card" },
    { key: "cashier's check", label: "Cashier's Check" },
    { key: "cashier check", label: "Cashier's Check" },
    { key: "certified check", label: "Certified Check" },
    { key: "mobile deposit", label: "Mobile Check Deposit" },
  ];

  const detectedPaymentMethods: string[] = [];
  for (const pm of paymentKeywords) {
    if (pm.regex ? pm.regex.test(text) : lowerText.includes(pm.key)) {
      if (!detectedPaymentMethods.includes(pm.label)) {
        detectedPaymentMethods.push(pm.label);
      }
    }
  }

  // Communication channels
  const commKeywords = [
    { key: "telegram", label: "Telegram" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "signal", label: "Signal" },
    { key: "google chat", label: "Google Chat / Hangouts" },
    { key: "skype", label: "Skype Chat" },
  ];
  const detectedCommunicationChannels: string[] = [];
  for (const c of commKeywords) {
    if (lowerText.includes(c.key)) {
      detectedCommunicationChannels.push(c.label);
    }
  }

  // Helper to extract surrounding quote/sentence for evidence
  function findSnippet(keyword: string | RegExp, maxLength = 140): string {
    if (typeof keyword === "string") {
      const idx = lowerText.indexOf(keyword.toLowerCase());
      if (idx === -1) return "";
      const start = Math.max(0, idx - 40);
      const end = Math.min(text.length, idx + keyword.length + 80);
      return (start > 0 ? "..." : "") + text.slice(start, end).replace(/\s+/g, " ").trim() + (end < text.length ? "..." : "");
    } else {
      const match = keyword.exec(text);
      if (!match) return "";
      const idx = match.index;
      const start = Math.max(0, idx - 30);
      const end = Math.min(text.length, idx + match[0].length + 70);
      return (start > 0 ? "..." : "") + text.slice(start, end).replace(/\s+/g, " ").trim() + (end < text.length ? "..." : "");
    }
  }

  // ==========================================
  // RULE SET 1: PAYMENT DEMANDS & FAKE CHECKS (Weight 0-35)
  // ==========================================

  // A. Check Overpayment & Equipment Vendor Trap
  const checkDepositMatch = lowerText.includes("check") && 
    (lowerText.includes("deposit") || lowerText.includes("vendor") || lowerText.includes("supplier") || lowerText.includes("equipment"));
  const wireBackMatch = lowerText.includes("transfer") || lowerText.includes("wire") || lowerText.includes("zelle") || lowerText.includes("send back") || lowerText.includes("remaining");

  if (checkDepositMatch && wireBackMatch) {
    redFlags.push({
      id: "rf-check-overpayment",
      title: "Check Overpayment & Vendor Wire Phishing Trap",
      severity: "CRITICAL",
      category: "PAYMENT_DEMAND",
      evidenceSnippet: findSnippet("check") || "Instructed to deposit check and wire balance to supplier",
      explanation: "Classic FTC #1 employment scam: The check is counterfeit. Under federal banking regulations, banks make deposited check funds temporarily available within 1-2 business days, but the check will bounce 1-2 weeks later. Any money you wired to their 'vendor' comes out of your personal funds forever.",
      weight: 35
    });
  } else if (lowerText.includes("cashier's check") || lowerText.includes("cashier check") || lowerText.includes("certified check") || lowerText.includes("mobile deposit")) {
    redFlags.push({
      id: "rf-cashier-check",
      title: "Paper Cashier / Certified Check Disbursement Required",
      severity: "HIGH",
      category: "PAYMENT_DEMAND",
      evidenceSnippet: findSnippet("cashier") || findSnippet("check"),
      explanation: "Legitimate enterprise employers ship enterprise IT hardware directly from corporate provisioning warehouses (e.g. Dell, Apple Enterprise). They never send checks to new hires to buy hardware themselves.",
      weight: 25
    });
  }

  // B. Pay for Onboarding / Training / Background Check Fee
  if (
    (lowerText.includes("training fee") || lowerText.includes("software license") || lowerText.includes("certification fee") || lowerText.includes("orientation fee") || lowerText.includes("background check fee") || lowerText.includes("uniform fee")) &&
    (lowerText.includes("pay") || lowerText.includes("purchase") || lowerText.includes("remit") || lowerText.includes("cost") || lowerText.includes("$"))
  ) {
    redFlags.push({
      id: "rf-advance-fee-employment",
      title: "Advance Fee Required (Mandatory Training/Software/Background)",
      severity: "CRITICAL",
      category: "PAYMENT_DEMAND",
      evidenceSnippet: findSnippet("fee") || findSnippet("training"),
      explanation: "Under Federal Fair Labor Standards and labor guidelines, legitimate employers cover all mandatory pre-employment screening and onboarding tool licensing. Promising to 'reimburse you on your first paycheck' is a signature advance-fee confidence trick.",
      weight: 30
    });
  }

  // C. Untraceable Consumer P2P Payment Demands (Zelle, CashApp, Bitcoin, Gift Cards)
  const peerToPeerPayments = detectedPaymentMethods.filter(p => 
    ["Zelle Transfer", "CashApp", "Cashtag ($)", "Venmo", "Western Union", "MoneyGram", "Bitcoin / Cryptocurrency", "Gift Cards", "Vanilla Visa / Prepaid Card"].includes(p)
  );

  if (peerToPeerPayments.length > 0) {
    redFlags.push({
      id: "rf-untraceable-payments",
      title: `Irreversible Payment Rails Demanded (${peerToPeerPayments.join(", ")})`,
      severity: "CRITICAL",
      category: "PAYMENT_DEMAND",
      evidenceSnippet: findSnippet(peerToPeerPayments[0]) || peerToPeerPayments.join(", "),
      explanation: "Zelle, CashApp, cryptocurrency, wire transfers, and retail gift cards have zero buyer fraud protection. Once transmitted, the funds are non-refundable and instantly cash-routed to overseas fraud syndicates.",
      weight: 30
    });
  }

  // D. Rental Deposit Sight-Unseen Trap
  const isRentalScenario = lowerText.includes("rent") || lowerText.includes("apartment") || lowerText.includes("tenant") || lowerText.includes("bedroom") || lowerText.includes("lease");
  if (isRentalScenario) {
    const sightUnseenTriggers = lowerText.includes("missionary") || lowerText.includes("out of country") || lowerText.includes("cannot meet") || lowerText.includes("window") || lowerText.includes("keys and official lease") || lowerText.includes("mail the keys") || lowerText.includes("dhl") || lowerText.includes("holding deposit");
    if (sightUnseenTriggers) {
      redFlags.push({
        id: "rf-rental-sight-unseen",
        title: "Sight-Unseen Rental Deposit & Absent Landlord Story",
        severity: "CRITICAL",
        category: "CONTRACT_TERMS",
        evidenceSnippet: findSnippet("keys") || findSnippet("deposit"),
        explanation: "Hallmark rental fraud pattern: The fraudster scrapes real estate listings from Zillow/Redfin, claims to be overseas or on a Christian missionary trip, refuses in-person walkthroughs, and demands a holding deposit before mailing fake keys via courier.",
        weight: 35
      });
    }
  }

  // ==========================================
  // RULE SET 2: DOMAIN, EMAIL & SENDER INTEGRITY (Weight 0-25)
  // ==========================================

  // A. Free Webmail used for formal corporate offer
  const freeMailUsed = detectedEmails.some(e => {
    const d = e.split("@")[1]?.toLowerCase();
    return FREE_EMAIL_PROVIDERS.includes(d);
  });

  if (freeMailUsed) {
    const matchingEmail = detectedEmails.find(e => FREE_EMAIL_PROVIDERS.includes(e.split("@")[1]?.toLowerCase())) || "";
    redFlags.push({
      id: "rf-freemail-sender",
      title: "Corporate Recruiter Using Free Public Webmail (@gmail / @yahoo)",
      severity: "HIGH",
      category: "DOMAIN_SENDER",
      evidenceSnippet: matchingEmail ? `Email address: ${matchingEmail}` : "Free webmail address detected",
      explanation: "Real corporate recruiters and established leasing agencies send contracts from verified company domains (@company.com). Scammers use disposable free accounts because they cost nothing and require no corporate credential verification.",
      weight: 25
    });
  }

  // B. Brand Impersonation / Mismatched Domain
  for (const comp of NOTABLE_TECH_COMPANIES) {
    if (lowerText.includes(comp.name.toLowerCase())) {
      const hasOfficialDomain = detectedEmails.some(e => e.toLowerCase().endsWith("@" + comp.domain)) ||
                                detectedDomains.some(d => d.toLowerCase() === comp.domain || d.toLowerCase().endsWith("." + comp.domain));
      if (!hasOfficialDomain && (detectedEmails.length > 0 || detectedDomains.length > 0)) {
        redFlags.push({
          id: `rf-impersonation-${comp.name.toLowerCase()}`,
          title: `Brand Impersonation Threat (${comp.name} claim with non-official domain)`,
          severity: "HIGH",
          category: "DOMAIN_SENDER",
          evidenceSnippet: `Claims affiliation with ${comp.name} but communication is routed via unofficial domain`,
          explanation: `The offer explicitly names ${comp.name}, but sender emails and URLs do not originate from ${comp.domain}. Impersonating well-known tech, banking, or logistics brands is the primary lure used in targeted spear-phishing.`,
          weight: 20
        });
        break;
      }
    }
  }

  // C. High-Risk TLD (.xyz, .top, .online, .click)
  const highRiskTLDDetected = detectedDomains.some(d => {
    const parts = d.split(".");
    const tld = parts[parts.length - 1];
    return HIGH_RISK_TLDS.includes(tld);
  });

  if (highRiskTLDDetected) {
    const suspiciousDomain = detectedDomains.find(d => HIGH_RISK_TLDS.includes(d.split(".").pop() || "")) || "";
    redFlags.push({
      id: "rf-high-risk-tld",
      title: `High-Risk Throwaway TLD Detected (.${suspiciousDomain.split(".").pop()})`,
      severity: "MEDIUM",
      category: "DOMAIN_SENDER",
      evidenceSnippet: suspiciousDomain,
      explanation: `Top-Level Domains like .xyz, .top, and .online are heavily utilized by bulletproof hosting and disposable phishing campaigns due to minimal registry oversight and rock-bottom promotional pricing.`,
      weight: 15
    });
  }

  // D. Domain Age data from RDAP (if supplied)
  if (domainData) {
    if (domainData.ageDays !== null && domainData.ageDays < 30) {
      redFlags.push({
        id: "rf-fresh-domain-age",
        title: `Ephemeral Infrastructure: Domain Age is ${domainData.ageDays} Days Old`,
        severity: "CRITICAL",
        category: "DOMAIN_SENDER",
        evidenceSnippet: `${domainData.domain} registered ${domainData.ageDays} day(s) ago`,
        explanation: "Established corporations operate domains registered years or decades ago. A domain created in the last 30 days claiming to be a national enterprise or established property company is a near-certain sign of malicious phishing infrastructure.",
        weight: 25
      });
    } else if (domainData.ageDays !== null && domainData.ageDays < 90) {
      redFlags.push({
        id: "rf-recent-domain-age",
        title: `Suspiciously Young Domain: Registered ${domainData.ageDays} Days Ago`,
        severity: "HIGH",
        category: "DOMAIN_SENDER",
        evidenceSnippet: `${domainData.domain} (age: ${domainData.ageDays} days)`,
        explanation: "Domain was registered within the past quarter. Phishing operators regularly purchase fresh domains once old ones are blacklisted by anti-abuse registries.",
        weight: 15
      });
    }
  }

  // ==========================================
  // RULE SET 3: INTERVIEW & PROTOCOL ANOMALIES (Weight 0-20)
  // ==========================================

  // A. Off-platform Chat Interviews (Telegram, WhatsApp, Signal)
  const isOffPlatformInterview = detectedCommunicationChannels.some(c => ["Telegram", "WhatsApp", "Signal", "Google Chat / Hangouts"].includes(c));
  if (isOffPlatformInterview) {
    const channelName = detectedCommunicationChannels.find(c => ["Telegram", "WhatsApp", "Signal", "Google Chat / Hangouts"].includes(c));
    redFlags.push({
      id: "rf-off-platform-interview",
      title: `Non-Standard Interview Channel: Shifted to ${channelName}`,
      severity: "HIGH",
      category: "INTERVIEW_PROCESS",
      evidenceSnippet: findSnippet(channelName || "Telegram") || `Shift to ${channelName}`,
      explanation: "Scammers systematically move communication to encrypted messaging apps like Telegram or WhatsApp to bypass email spam filters, evade corporate monitoring, and delete chat histories remotely.",
      weight: 20
    });
  }

  // B. Immediate / No-Interview Hiring Lure
  if (
    lowerText.includes("no interview") || 
    lowerText.includes("immediate hiring") || 
    lowerText.includes("on-the-spot") || 
    lowerText.includes("direct appointment") ||
    lowerText.includes("without interview") ||
    lowerText.includes("no prior experience is necessary")
  ) {
    redFlags.push({
      id: "rf-no-interview-hiring",
      title: "Immediate Hiring Lure Without Legitimate Vetting",
      severity: "HIGH",
      category: "INTERVIEW_PROCESS",
      evidenceSnippet: findSnippet("immediate") || findSnippet("no interview") || "Instant hiring without rigorous interview",
      explanation: "High-paying remote positions always require multiple rounds of behavioral or technical interviews. Unsolicited offers without substantial video or in-person evaluation are designed to trap desperate job seekers.",
      weight: 15
    });
  }

  // C. Premature Sensitive Data Harvesting (SSN / Banking upfront)
  if (
    (lowerText.includes("social security") || lowerText.includes("ssn") || lowerText.includes("driver's license") || lowerText.includes("passport scan") || lowerText.includes("routing number")) &&
    (lowerText.includes("prior to") || lowerText.includes("before orientation") || lowerText.includes("telegram") || lowerText.includes("enrollment"))
  ) {
    redFlags.push({
      id: "rf-identity-harvesting",
      title: "High-Risk Identity Theft: Premature SSN/Banking Demands",
      severity: "CRITICAL",
      category: "INTERVIEW_PROCESS",
      evidenceSnippet: findSnippet("social security") || findSnippet("ssn") || findSnippet("driver's license"),
      explanation: "Legitimate employers collect I-9 identity documentation through secure enterprise HR portals (Workday, BambooHR, Rippling) after formal offer signing, never via unencrypted chat or before candidate credentials are verified.",
      weight: 25
    });
  }

  // ==========================================
  // RULE SET 4: URGENCY, DECEPTION & MANIPULATION (Weight 0-20)
  // ==========================================

  // A. Artificial Urgency / Deadline Pressure
  if (
    lowerText.includes("within 24 hours") || 
    lowerText.includes("within 48 hours") || 
    lowerText.includes("strictly limited to the first") || 
    lowerText.includes("forfeit this offer") || 
    lowerText.includes("urgently") ||
    lowerText.includes("act immediately")
  ) {
    redFlags.push({
      id: "rf-urgency-pressure",
      title: "Psychological Coercion: Extreme Urgency & Forfeiture Pressure",
      severity: "MEDIUM",
      category: "URGENCY_DECEPTION",
      evidenceSnippet: findSnippet("24 hours") || findSnippet("urgently") || findSnippet("strictly limited"),
      explanation: "Artificial time pressure is a primary social engineering tactic used to bypass rational scrutiny and prevent the victim from consulting family, friends, or company HR lines.",
      weight: 15
    });
  }

  // B. Deceptive Religious / Pious Over-Assurance
  if (
    lowerText.includes("god bless") || 
    lowerText.includes("god fearing") || 
    lowerText.includes("church") || 
    lowerText.includes("missionary") || 
    lowerText.includes("100% genuine") || 
    lowerText.includes("kindly revert")
  ) {
    redFlags.push({
      id: "rf-pious-manipulation",
      title: "Deceptive Pious Guarantees & Archaic Phrasing ('God Bless', 'Kindly Revert')",
      severity: "LOW",
      category: "URGENCY_DECEPTION",
      evidenceSnippet: findSnippet("god bless") || findSnippet("kindly revert") || findSnippet("missionary"),
      explanation: "Scammers frequently invoke religious piety ('God fearing landlord', 'Christian mission in Spain') or distinctive linguistic artifacts ('kindly revert back') to disarm suspicions and simulate moral authority.",
      weight: 10
    });
  }

  // ==========================================
  // POSITIVE LEGITIMACY INDICATORS
  // ==========================================
  if (lowerText.includes("docusign") || lowerText.includes("adp") || lowerText.includes("workday") || lowerText.includes("bamboohr") || lowerText.includes("rippling")) {
    positiveIndicators.push("Industry standard enterprise signing portal (DocuSign/Workday/BambooHR) referenced.");
  }
  if (lowerText.includes("fdic") || lowerText.includes("escrow trust account") || lowerText.includes("rcw ") || lowerText.includes("state-capped")) {
    positiveIndicators.push("Formal escrow trust and statutory consumer protection disclosures present.");
  }
  if (lowerText.includes("in-person walkthrough") || lowerText.includes("physical inspection") || lowerText.includes("joint move-in")) {
    positiveIndicators.push("Explicit requirement for in-person physical property walkthrough before key exchange.");
  }
  if (lowerText.includes("never ask to buy equipment") || lowerText.includes("at no cost to you") || lowerText.includes("never accept zelle")) {
    positiveIndicators.push("Explicit anti-fraud warning protecting applicant from payment and equipment traps.");
  }
  if (lowerText.includes("restricted stock units") || lowerText.includes("401(k) retirement plan") || lowerText.includes("equity incentive plan")) {
    positiveIndicators.push("Structured equity vesting and standard corporate retirement benefit schedules.");
  }

  // ==========================================
  // SCORING SYNTHESIS
  // ==========================================
  let domainAndSenderScore = 0;
  let paymentDemandScore = 0;
  let communicationAnomaliesScore = 0;
  let urgencyAndDeceptionScore = 0;

  for (const rf of redFlags) {
    switch (rf.category) {
      case "DOMAIN_SENDER":
        domainAndSenderScore = Math.min(25, domainAndSenderScore + rf.weight);
        break;
      case "PAYMENT_DEMAND":
        paymentDemandScore = Math.min(35, paymentDemandScore + rf.weight);
        break;
      case "INTERVIEW_PROCESS":
        communicationAnomaliesScore = Math.min(20, communicationAnomaliesScore + rf.weight);
        break;
      case "URGENCY_DECEPTION":
      case "CONTRACT_TERMS":
        urgencyAndDeceptionScore = Math.min(20, urgencyAndDeceptionScore + rf.weight);
        break;
    }
  }

  // If domainData supplied, augment domain score
  if (domainData && domainData.domainThreatScore > 0) {
    domainAndSenderScore = Math.min(25, Math.max(domainAndSenderScore, Math.round(domainData.domainThreatScore * 0.25)));
  }

  // Calculate raw threat score
  let rawScore = domainAndSenderScore + paymentDemandScore + communicationAnomaliesScore + urgencyAndDeceptionScore;

  // Offset with positive indicators
  if (positiveIndicators.length > 0 && redFlags.length <= 1) {
    rawScore = Math.max(0, rawScore - (positiveIndicators.length * 15));
  }

  const scamThreatIndex = Math.min(100, Math.max(0, rawScore));

  // Determine Verdict
  let verdict: ScamVerdict = "LIKELY_LEGITIMATE";
  if (scamThreatIndex >= 75) {
    verdict = "CRITICAL_SCAM";
  } else if (scamThreatIndex >= 50) {
    verdict = "HIGH_RISK";
  } else if (scamThreatIndex >= 25) {
    verdict = "SUSPICIOUS";
  } else if (scamThreatIndex < 15 && positiveIndicators.length > 0) {
    verdict = "VERIFIED_SAFE";
  }

  // Category determination
  let category = "General Employment Offer";
  if (isRentalScenario) {
    category = "Rental Lease & Deposit Agreement";
  } else if (redFlags.some(r => r.id === "rf-check-overpayment")) {
    category = "Equipment Check Overpayment Scam";
  } else if (redFlags.some(r => r.id === "rf-advance-fee-employment")) {
    category = "Advance-Fee Training / Onboarding Trap";
  } else if (redFlags.some(r => r.id === "rf-off-platform-interview")) {
    category = "Off-Platform Telegram/WhatsApp Recruitment";
  } else if (verdict === "VERIFIED_SAFE" || verdict === "LIKELY_LEGITIMATE") {
    category = "Authentic Professional Opportunity";
  }

  // Summary generation
  let executiveSummary = "";
  if (verdict === "CRITICAL_SCAM") {
    executiveSummary = `CRITICAL THREAT: This document displays definitive markers of organized cyber fraud (Threat Index: ${scamThreatIndex}%). Key attack mechanics detected include ${redFlags.slice(0, 2).map(r => r.title).join(" and ")}. Do NOT send money, do not deposit any mailed checks, and do not provide your Social Security Number or banking credentials.`;
  } else if (verdict === "HIGH_RISK") {
    executiveSummary = `HIGH RISK WARNING: Several high-severity anomalies were uncovered (Threat Index: ${scamThreatIndex}%). The request bypasses standard security safeguards through ${redFlags[0]?.title || "irregular payment/interview demands"}. Direct verification via official corporate registry is strongly advised.`;
  } else if (verdict === "SUSPICIOUS") {
    executiveSummary = `ELEVATED CAUTION: Mild to moderate warning signs detected (Threat Index: ${scamThreatIndex}%). While not an outright confirmed attack, elements such as ${redFlags[0]?.title || "informal communication"} require independent verification.`;
  } else {
    executiveSummary = `LOW THREAT (Score: ${scamThreatIndex}%): No predatory advance fees, equipment checks, or high-risk domain anomalies were identified. Contains positive hallmarks of legitimate enterprise operations.`;
  }

  // Entities
  const extractedEntities: ExtractedEntities = {
    detectedDomains,
    detectedEmails,
    detectedPaymentMethods,
    detectedCommunicationChannels,
  };

  const threatBreakdown: ThreatBreakdown = {
    domainAndSenderScore,
    paymentDemandScore,
    communicationAnomaliesScore,
    urgencyAndDeceptionScore,
  };

  return {
    scamThreatIndex,
    verdict,
    category,
    executiveSummary,
    redFlags,
    positiveIndicators,
    threatBreakdown,
    extractedEntities,
    domainData: domainData || null,
    actionableRemedies: {
      verificationSteps: [
        "Never deposit any mailed or emailed cashier's check: Federal law requires banks to show funds quickly, but you are 100% financially liable when the check is returned as fraudulent 5-14 days later.",
        "Look up the real company's official corporate headquarters phone number from their authentic .com domain and ask for Human Resources or the named recruiter directly.",
        isRentalScenario 
          ? "Verify real property ownership through your county's public online property tax assessor registry to confirm the landlord's real name."
          : "Search the Secretary of State corporate registration database to confirm the hiring entity is an active, licensed business entity in good standing.",
        "Never conduct interviews or share sensitive tax/banking documents over Telegram, WhatsApp, or personal Google Chat accounts."
      ],
      safeResponseTemplate: isRentalScenario
        ? "Thank you for the information. In accordance with standard rental safety guidelines, I do not send holding deposits or sign lease agreements sight-unseen without a licensed representative conducting an in-person physical walkthrough at the unit and providing proof of title ownership. Please provide the physical leasing office address and property manager contact details."
        : "Thank you for the offer. Per standard employment verification procedures, I require all equipment to be provisioned directly by your corporate IT department without check reimbursements. Please provide your official @company.com corporate email, company registration number, and DocuSign verification link so my legal counsel can review.",
      reportingAuthorities: [
        {
          name: "Federal Trade Commission (FTC)",
          url: "https://reportfraud.ftc.gov/",
          description: "Official US government reporting agency for fake job offers, check scams, and deceptive business practices."
        },
        {
          name: "FBI Internet Crime Complaint Center (IC3)",
          url: "https://www.ic3.gov/",
          description: "Federal cybercrime reporting portal for wire fraud, identity theft, and cross-border financial phishing."
        },
        {
          name: "US Postal Inspection Service (USPIS)",
          url: "https://www.uspis.gov/report",
          description: "Investigates counterfeit checks and fraudulent documents mailed via FedEx, UPS, or USPS Priority."
        }
      ]
    },
    isAiPowered: false,
    scannedAt: new Date().toISOString()
  };
}
