import React, { useState, useEffect, useMemo } from "react";
import { Header } from "./components/Header";
import { ThreatScoreGauge } from "./components/ThreatScoreGauge";
import { ThreatFactorList } from "./components/ThreatFactorList";
import { DomainInspectorCard } from "./components/DomainInspectorCard";
import { ScannerInput } from "./components/ScannerInput";
import { RemedyActionsCard } from "./components/RemedyActionsCard";
import { InteractiveThreatSimulator } from "./components/InteractiveThreatSimulator";
import { PRESET_SAMPLES } from "./data/samples";
import { runHeuristicScan } from "./utils/heuristicScanner";
import { 
  ScanInspectionResult, 
  DomainCheckResult, 
  PresetSample, 
  RedFlag,
  ScamVerdict
} from "./types";
import { 
  ShieldAlert, 
  Search, 
  Activity, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  SlidersHorizontal,
  ExternalLink
} from "lucide-react";

export default function App() {
  // Input state
  const [text, setText] = useState<string>("");
  const [urlOrDomain, setUrlOrDomain] = useState<string>("");
  
  // Status state
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isAiScanning, setIsAiScanning] = useState<boolean>(false);
  const [isDomainChecking, setIsDomainChecking] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Results state
  const [domainData, setDomainData] = useState<DomainCheckResult | null>(null);
  const [scanResult, setScanResult] = useState<ScanInspectionResult | null>(null);

  // Active Red Flags state for dynamic recalculation
  const [activeFlagIds, setActiveFlagIds] = useState<Set<string>>(new Set());

  // Interactive Simulator Toggles
  const [simulatorFactors, setSimulatorFactors] = useState([
    {
      id: "sim-check-deposit",
      name: "Check Overpayment / Hardware Vendor Wire Mandate",
      category: "Payment" as const,
      weight: 35,
      active: true,
      description: "Counterfeit check sent to buy supplies from 'accredited vendor' via wire."
    },
    {
      id: "sim-freemail-sender",
      name: "Alleged Fortune 500 Recruiter Using @gmail.com",
      category: "Domain" as const,
      weight: 25,
      active: true,
      description: "Recruiter refuses or lacks corporate domain email address."
    },
    {
      id: "sim-domain-fresh",
      name: "Ephemeral Domain (< 30 Days Registered)",
      category: "Domain" as const,
      weight: 25,
      active: true,
      description: "Target domain registered less than a month ago."
    },
    {
      id: "sim-off-platform-chat",
      name: "Interview Shifted to Telegram / WhatsApp",
      category: "Communication" as const,
      weight: 20,
      active: true,
      description: "Unsolicited text interview to evade corporate filtering."
    },
    {
      id: "sim-extreme-urgency",
      name: "Artificial 24-Hour Forfeiture Deadline",
      category: "Urgency" as const,
      weight: 15,
      active: true,
      description: "High pressure tactic to force rash financial decisions."
    },
    {
      id: "sim-safe-docusign",
      name: "Verified Enterprise DocuSign / I-9 Portal",
      category: "Protection" as const,
      weight: -20,
      active: false,
      description: "Legitimate corporate e-sign & identity verification pipeline."
    },
    {
      id: "sim-physical-walkthrough",
      name: "In-Person Walkthrough & Escrow Trust Clause",
      category: "Protection" as const,
      weight: -25,
      active: false,
      description: "Key exchange occurs only after physical joint inspection."
    }
  ]);

  // Load default sample on initial mount to immediately demonstrate full capabilities
  useEffect(() => {
    const defaultSample = PRESET_SAMPLES[0];
    setText(defaultSample.text);
    setUrlOrDomain(defaultSample.domainOrUrl || "");
    
    // Run initial scan
    const initialResult = runHeuristicScan(defaultSample.text, defaultSample.domainOrUrl);
    setScanResult(initialResult);
    setActiveFlagIds(new Set(initialResult.redFlags.map(f => f.id)));

    // Automatically check domain for default sample
    if (defaultSample.domainOrUrl) {
      handleCheckDomain(defaultSample.domainOrUrl);
    }
  }, []);

  // Domain inquiry handler
  const handleCheckDomain = async (domainQuery: string) => {
    if (!domainQuery.trim()) return;
    setIsDomainChecking(true);
    try {
      const res = await fetch("/api/check-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainInput: domainQuery.trim() })
      });

      if (res.ok) {
        const data: DomainCheckResult = await res.json();
        setDomainData(data);
        // If we already have a scan result, update it with fresh domain telemetry
        if (text) {
          const updated = runHeuristicScan(text, domainQuery, data);
          setScanResult(updated);
          setActiveFlagIds(new Set(updated.redFlags.map(f => f.id)));
        }
      }
    } catch (err) {
      console.warn("Domain check network error:", err);
    } finally {
      setIsDomainChecking(false);
    }
  };

  // Run Standard Heuristic Scan
  const handleRunScan = async () => {
    if (!text.trim() && !urlOrDomain.trim()) return;
    setIsScanning(true);
    setAiError(null);

    // If a domain was supplied and not checked yet, check it
    let currentDomainData = domainData;
    if (urlOrDomain.trim()) {
      try {
        const dRes = await fetch("/api/check-domain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domainInput: urlOrDomain.trim() })
        });
        if (dRes.ok) {
          currentDomainData = await dRes.json();
          setDomainData(currentDomainData);
        }
      } catch {
        // Continue
      }
    }

    const result = runHeuristicScan(text, urlOrDomain, currentDomainData);
    setScanResult(result);
    setActiveFlagIds(new Set(result.redFlags.map(f => f.id)));
    setIsScanning(false);
  };

  // Run Gemini AI Deep Analysis
  const handleRunAiScan = async () => {
    if (!text.trim()) return;
    setIsAiScanning(true);
    setAiError(null);

    try {
      const res = await fetch("/api/inspect-scam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          urlOrDomain: urlOrDomain.trim() || undefined,
          inspectionType: text.toLowerCase().includes("rent") ? "Rental Lease Agreement" : "Job Offer Appointment"
        })
      });

      const data = await res.json();

      if (data.fallbackMode) {
        // API key not set or fallback triggered; run heuristic scan with alert
        const heuristic = runHeuristicScan(text, urlOrDomain, domainData);
        setScanResult({
          ...heuristic,
          executiveSummary: `${data.message} ${heuristic.executiveSummary}`,
          isAiPowered: false
        });
        setActiveFlagIds(new Set(heuristic.redFlags.map(f => f.id)));
        setAiError(data.message || "Using local heuristic engine");
      } else if (res.ok && data.scamThreatIndex !== undefined) {
        // AI result successfully received
        const redFlagsWithIds = (data.redFlags || []).map((rf: any, index: number) => ({
          ...rf,
          id: `ai-rf-${index}`,
          active: true
        }));

        setScanResult({
          scamThreatIndex: data.scamThreatIndex,
          verdict: data.verdict as ScamVerdict,
          category: data.category || "Suspected Phishing Campaign",
          executiveSummary: data.executiveSummary || "",
          redFlags: redFlagsWithIds,
          positiveIndicators: data.positiveIndicators || [],
          threatBreakdown: data.threatBreakdown || {
            domainAndSenderScore: 20,
            paymentDemandScore: 35,
            communicationAnomaliesScore: 20,
            urgencyAndDeceptionScore: 15
          },
          extractedEntities: {
            detectedDomains: data.extractedEntities?.senderEmail ? [data.extractedEntities.senderEmail] : [],
            detectedEmails: data.extractedEntities?.senderEmail ? [data.extractedEntities.senderEmail] : [],
            detectedPaymentMethods: data.extractedEntities?.paymentMethodsRequested || [],
            detectedCommunicationChannels: data.extractedEntities?.interviewChannel ? [data.extractedEntities.interviewChannel] : []
          },
          domainData: domainData,
          actionableRemedies: data.actionableRemedies || {
            verificationSteps: ["Verify with official corporate directory", "Never wire funds or purchase equipment"],
            safeResponseTemplate: "I require all equipment to be provisioned directly by corporate IT.",
            reportingAuthorities: [
              { name: "FTC", url: "https://reportfraud.ftc.gov/", description: "Federal Trade Commission" }
            ]
          },
          isAiPowered: true,
          scannedAt: new Date().toISOString()
        });
        setActiveFlagIds(new Set(redFlagsWithIds.map((f: any) => f.id)));
      } else {
        throw new Error(data.error || "Failed to inspect");
      }
    } catch (err: any) {
      console.warn("AI scan error:", err);
      // Fallback to heuristic
      const heuristic = runHeuristicScan(text, urlOrDomain, domainData);
      setScanResult(heuristic);
      setActiveFlagIds(new Set(heuristic.redFlags.map(f => f.id)));
      setAiError("Gemini scan encountered a temporary error; displayed results are powered by the local heuristic rules engine.");
    } finally {
      setIsAiScanning(false);
    }
  };

  // Load sample handler
  const handleLoadSample = (sample: PresetSample) => {
    setText(sample.text);
    setUrlOrDomain(sample.domainOrUrl || "");
    setAiError(null);

    // Trigger domain check if URL present
    if (sample.domainOrUrl) {
      handleCheckDomain(sample.domainOrUrl);
    } else {
      setDomainData(null);
    }

    const result = runHeuristicScan(sample.text, sample.domainOrUrl);
    setScanResult(result);
    setActiveFlagIds(new Set(result.redFlags.map(f => f.id)));
  };

  // Clear handler
  const handleClear = () => {
    setText("");
    setUrlOrDomain("");
    setDomainData(null);
    setScanResult(null);
    setActiveFlagIds(new Set());
    setAiError(null);
  };

  // Red Flag active toggle handler for dynamic recalculation
  const handleToggleRedFlag = (flagId: string) => {
    setActiveFlagIds(prev => {
      const next = new Set(prev);
      if (next.has(flagId)) {
        next.delete(flagId);
      } else {
        next.add(flagId);
      }
      return next;
    });
  };

  // Simulator factor toggle handler
  const handleToggleSimulatorFactor = (factorId: string) => {
    setSimulatorFactors(prev => prev.map(f => f.id === factorId ? { ...f, active: !f.active } : f));
  };

  // Reset simulator to scanned baseline
  const handleResetSimulator = () => {
    if (!scanResult) return;
    setSimulatorFactors(prev => prev.map(f => ({
      ...f,
      active: f.weight > 0 ? (scanResult.scamThreatIndex > 50) : false
    })));
  };

  // Calculate dynamic simulator score
  const simulatedScore = useMemo(() => {
    let score = 0;
    for (const factor of simulatorFactors) {
      if (factor.active) {
        score += factor.weight;
      }
    }
    return Math.min(100, Math.max(0, score));
  }, [simulatorFactors]);

  // Dynamically recalculated threat score based on user toggling detected red flags
  const { dynamicallyCalculatedScore, dynamicVerdict } = useMemo(() => {
    if (!scanResult) return { dynamicallyCalculatedScore: 0, dynamicVerdict: "LIKELY_LEGITIMATE" as ScamVerdict };
    
    // Sum active weights
    let score = 0;
    for (const flag of scanResult.redFlags) {
      if (activeFlagIds.has(flag.id)) {
        score += flag.weight;
      }
    }

    // Offset with positive indicators
    if (scanResult.positiveIndicators.length > 0 && activeFlagIds.size <= 1) {
      score = Math.max(0, score - (scanResult.positiveIndicators.length * 15));
    }

    const finalScore = Math.min(100, Math.max(0, score));

    let verdict: ScamVerdict = "LIKELY_LEGITIMATE";
    if (finalScore >= 75) verdict = "CRITICAL_SCAM";
    else if (finalScore >= 50) verdict = "HIGH_RISK";
    else if (finalScore >= 25) verdict = "SUSPICIOUS";
    else if (finalScore < 15 && scanResult.positiveIndicators.length > 0) verdict = "VERIFIED_SAFE";

    return { dynamicallyCalculatedScore: finalScore, dynamicVerdict: verdict };
  }, [scanResult, activeFlagIds]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* App Header */}
      <Header 
        currentThreatScore={scanResult ? dynamicallyCalculatedScore : undefined}
        verdict={scanResult ? dynamicVerdict : undefined}
        isAiActive={scanResult?.isAiPowered}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Banner Alert if AI fallback notice */}
        {aiError && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{aiError}</span>
            </div>
            <button 
              onClick={() => setAiError(null)}
              className="text-amber-400 hover:text-white font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Input Panel */}
        <ScannerInput
          text={text}
          urlOrDomain={urlOrDomain}
          onTextChange={setText}
          onUrlChange={setUrlOrDomain}
          onRunScan={handleRunScan}
          onRunAiScan={handleRunAiScan}
          onLoadSample={handleLoadSample}
          onClear={handleClear}
          isScanning={isScanning}
          isAiScanning={isAiScanning}
        />

        {/* Results Section */}
        {scanResult ? (
          <div className="space-y-6">
            
            {/* Executive Verdict Callout */}
            <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
              dynamicallyCalculatedScore >= 75
                ? "bg-gradient-to-r from-rose-950/40 via-slate-900 to-rose-950/30 border-rose-500/50 shadow-lg shadow-rose-950/30"
                : dynamicallyCalculatedScore >= 50
                ? "bg-gradient-to-r from-orange-950/40 via-slate-900 to-amber-950/30 border-orange-500/50"
                : dynamicallyCalculatedScore >= 25
                ? "bg-gradient-to-r from-yellow-950/40 via-slate-900 to-yellow-950/30 border-yellow-500/50"
                : "bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/30 border-emerald-500/50"
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                      Forensic Executive Verdict
                    </span>
                    {scanResult.isAiPowered && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Gemini AI Grounded
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                    {scanResult.category}: {dynamicVerdict.replace("_", " ")}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed max-w-4xl">
                    {scanResult.executiveSummary}
                  </p>
                </div>

                <div className="shrink-0 flex items-center md:flex-col justify-between md:justify-center p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-right md:text-center min-w-[140px]">
                  <span className="text-[11px] font-mono text-slate-400 uppercase">
                    Scam Threat Index
                  </span>
                  <span className={`text-3xl font-extrabold font-mono ${
                    dynamicallyCalculatedScore >= 75 ? "text-rose-400" :
                    dynamicallyCalculatedScore >= 50 ? "text-orange-400" :
                    dynamicallyCalculatedScore >= 25 ? "text-yellow-400" :
                    "text-emerald-400"
                  }`}>
                    {Math.round(dynamicallyCalculatedScore)}%
                  </span>
                  <span className="text-[10px] font-medium text-slate-500">
                    {activeFlagIds.size} of {scanResult.redFlags.length} flags applied
                  </span>
                </div>
              </div>
            </div>

            {/* Two-Column Diagnostic Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Radial Threat Gauge & Domain Intelligence (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                <ThreatScoreGauge 
                  score={dynamicallyCalculatedScore}
                  verdict={dynamicVerdict}
                  category={scanResult.category}
                  threatBreakdown={scanResult.threatBreakdown}
                  activeRedFlagsCount={activeFlagIds.size}
                />

                <DomainInspectorCard
                  initialDomain={urlOrDomain || (scanResult.extractedEntities.detectedDomains[0] || "")}
                  domainData={domainData}
                  onCheckDomain={handleCheckDomain}
                  isLoading={isDomainChecking}
                />
              </div>

              {/* Right Column: Red Flag Inspector & Forensic Evidence (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <ThreatFactorList
                  redFlags={scanResult.redFlags.map(rf => ({
                    ...rf,
                    active: activeFlagIds.has(rf.id)
                  }))}
                  positiveIndicators={scanResult.positiveIndicators}
                  onToggleRedFlag={handleToggleRedFlag}
                />

                {/* Counter-Measures & Safe Response Letter */}
                <RemedyActionsCard
                  remedies={scanResult.actionableRemedies}
                  isRental={scanResult.category.toLowerCase().includes("rent")}
                />
              </div>
            </div>

            {/* Dynamic Threat Factor Simulator Section */}
            <InteractiveThreatSimulator
              factors={simulatorFactors}
              onToggleFactor={handleToggleSimulatorFactor}
              onResetToScanned={handleResetSimulator}
              simulatedScore={simulatedScore}
            />

          </div>
        ) : (
          /* Empty / Waiting state */
          <div className="text-center py-16 px-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
            <ShieldAlert className="w-12 h-12 text-rose-500/80 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Ready for Document or URL Inspection
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Select one of the preset real-world scams above or paste your appointment letter to calculate the Scam Threat Index, check domain age, and inspect payment red flags.
            </p>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Fake Offer Letter & Phishing Inspector • Cybercrime Forensic Analysis</span>
          <div className="flex items-center gap-4 text-slate-400">
            <a 
              href="https://reportfraud.ftc.gov/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-rose-400 transition-colors flex items-center gap-1 text-[11px]"
            >
              FTC Report Fraud <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <a 
              href="https://www.ic3.gov/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-rose-400 transition-colors flex items-center gap-1 text-[11px]"
            >
              FBI IC3 Portal <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
