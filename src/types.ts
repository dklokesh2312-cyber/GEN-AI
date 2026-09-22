export type ThreatSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type RedFlagCategory = 
  | "PAYMENT_DEMAND"
  | "DOMAIN_SENDER"
  | "INTERVIEW_PROCESS"
  | "CONTRACT_TERMS"
  | "URGENCY_DECEPTION";

export type ScamVerdict = 
  | "CRITICAL_SCAM"
  | "HIGH_RISK"
  | "SUSPICIOUS"
  | "LIKELY_LEGITIMATE"
  | "VERIFIED_SAFE";

export interface RedFlag {
  id: string;
  title: string;
  severity: ThreatSeverity;
  category: RedFlagCategory;
  evidenceSnippet: string;
  explanation: string;
  weight: number;
  active?: boolean;
}

export interface ThreatBreakdown {
  domainAndSenderScore: number;       // 0-25
  paymentDemandScore: number;         // 0-35
  communicationAnomaliesScore: number;// 0-20
  urgencyAndDeceptionScore: number;   // 0-20
}

export interface ExtractedEntities {
  organizationClaimed?: string;
  senderEmail?: string;
  detectedDomains: string[];
  detectedEmails: string[];
  detectedPaymentMethods: string[];
  detectedCommunicationChannels: string[];
  jobTitleOrProperty?: string;
  compensationOrRent?: string;
  interviewChannel?: string;
}

export interface DomainCheckResult {
  domain: string;
  tld: string;
  isFreeMail: boolean;
  isHighRiskTLD: boolean;
  dnsResolved: boolean;
  registrationDate: string | null;
  registrar: string;
  ageDays: number | null;
  rdapStatus: string;
  domainThreatScore: number;
  riskSignals: string[];
}

export interface ReportingAuthority {
  name: string;
  url: string;
  description: string;
}

export interface ActionableRemedies {
  verificationSteps: string[];
  safeResponseTemplate: string;
  reportingAuthorities: ReportingAuthority[];
}

export interface ScanInspectionResult {
  scamThreatIndex: number; // 0 - 100
  verdict: ScamVerdict;
  category: string;
  executiveSummary: string;
  redFlags: RedFlag[];
  positiveIndicators: string[];
  threatBreakdown: ThreatBreakdown;
  extractedEntities: ExtractedEntities;
  domainData?: DomainCheckResult | null;
  actionableRemedies: ActionableRemedies;
  isAiPowered: boolean;
  scannedAt: string;
}

export interface PresetSample {
  id: string;
  title: string;
  badge: string;
  category: "Job Scam" | "Rental Scam" | "Legitimate";
  domainOrUrl?: string;
  description: string;
  expectedThreatLevel: "High" | "Medium" | "Low";
  text: string;
}
