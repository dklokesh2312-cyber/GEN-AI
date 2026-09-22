import React from "react";
import { 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  ShieldAlert, 
  CheckCircle, 
  Quote, 
  Sliders, 
  HelpCircle 
} from "lucide-react";
import { RedFlag, ThreatSeverity } from "../types";

interface ThreatFactorListProps {
  redFlags: RedFlag[];
  positiveIndicators: string[];
  onToggleRedFlag: (id: string) => void;
}

export const ThreatFactorList: React.FC<ThreatFactorListProps> = ({
  redFlags,
  positiveIndicators,
  onToggleRedFlag
}) => {
  const getSeverityBadge = (severity: ThreatSeverity) => {
    switch (severity) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <AlertOctagon className="w-3 h-3" /> CRITICAL
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">
            <AlertTriangle className="w-3 h-3" /> HIGH
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Info className="w-3 h-3" /> MEDIUM
          </span>
        );
      case "LOW":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
            <Info className="w-3 h-3" /> LOW
          </span>
        );
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "PAYMENT_DEMAND": return "Payment Demand";
      case "DOMAIN_SENDER": return "Domain & Sender";
      case "INTERVIEW_PROCESS": return "Interview Process";
      case "CONTRACT_TERMS": return "Contract Terms";
      case "URGENCY_DECEPTION": return "Urgency & Deception";
      default: return cat;
    }
  };

  return (
    <div id="threat-factor-inspector" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
            Detected Fraud Red Flags & Forensic Evidence
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>Interactive: Toggle factors to recalculate</span>
        </div>
      </div>

      {/* Red Flags List */}
      {redFlags.length === 0 ? (
        <div className="text-center py-8 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-slate-400">
          <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="font-semibold text-slate-200">No Malicious Red Flags Detected</p>
          <p className="text-xs text-slate-500 mt-1">
            This document does not display known advance-fee, check overpayment, or domain spoofing patterns.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {redFlags.map((flag) => {
            const isActive = flag.active !== false;
            return (
              <div
                key={flag.id}
                id={`redflag-${flag.id}`}
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  isActive 
                    ? flag.severity === "CRITICAL"
                      ? "bg-slate-950 border-rose-500/40 shadow-sm shadow-rose-950/20"
                      : flag.severity === "HIGH"
                      ? "bg-slate-950 border-orange-500/40"
                      : "bg-slate-950 border-slate-800"
                    : "bg-slate-950/40 border-slate-800/40 opacity-50"
                }`}
              >
                {/* Card Top Row */}
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {getSeverityBadge(flag.severity)}
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      {getCategoryLabel(flag.category)}
                    </span>
                    <span className={`text-xs font-mono font-bold ${isActive ? "text-rose-400" : "text-slate-500"}`}>
                      +{flag.weight} pts
                    </span>
                  </div>

                  {/* Toggle Factor Switch */}
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-400 hover:text-slate-200 select-none">
                    <span className="text-[11px] font-mono">
                      {isActive ? "Applied" : "Bypassed"}
                    </span>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={() => onToggleRedFlag(flag.id)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-rose-500 relative" />
                  </label>
                </div>

                {/* Title */}
                <h3 className={`text-sm font-bold tracking-tight mb-1.5 ${isActive ? "text-white" : "text-slate-400 line-through"}`}>
                  {flag.title}
                </h3>

                {/* Forensic Snippet Highlight */}
                {flag.evidenceSnippet && (
                  <div className="mb-2 p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-start gap-2 text-xs font-mono text-rose-300/90">
                    <Quote className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span className="break-words italic">"{flag.evidenceSnippet}"</span>
                  </div>
                )}

                {/* Explanation */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {flag.explanation}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Positive Legitimacy Indicators Section */}
      {positiveIndicators.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-2">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Positive Enterprise Safety Indicators Detected</span>
          </div>
          <ul className="space-y-1.5">
            {positiveIndicators.map((ind, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-2 bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>{ind}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
