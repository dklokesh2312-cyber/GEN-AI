import React, { useState } from "react";
import { 
  ShieldCheck, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertTriangle, 
  FileCheck, 
  Building2, 
  Send 
} from "lucide-react";
import { ActionableRemedies } from "../types";

interface RemedyActionsCardProps {
  remedies: ActionableRemedies;
  isRental: boolean;
}

export const RemedyActionsCard: React.FC<RemedyActionsCardProps> = ({
  remedies,
  isRental
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyResponse = async () => {
    try {
      await navigator.clipboard.writeText(remedies.safeResponseTemplate);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div id="remedy-actions-card" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
            Actionable Counter-Measures & Safety Protocols
          </h2>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Victim Defense Matrix
        </span>
      </div>

      {/* 1. Step-by-Step Verification Checklist */}
      <div>
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
          Mandatory Verification Steps (Before Replying or Paying)
        </h3>
        <div className="space-y-2">
          {remedies.verificationSteps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-200">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[11px] font-mono">
                {idx + 1}
              </span>
              <p className="leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Pre-drafted Safe Challenge Response */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-amber-400" />
            Safe Challenge Response Letter
          </h3>
          <button
            id="btn-copy-safe-response"
            onClick={handleCopyResponse}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Letter</span>
              </>
            )}
          </button>
        </div>

        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-300 leading-relaxed break-words select-all">
          {remedies.safeResponseTemplate}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          Tip: Legitimate employers and landlords will readily cooperate with this standard request. Scammers will typically ghost or push higher urgency.
        </p>
      </div>

      {/* 3. Official Reporting Channels */}
      <div className="pt-2 border-t border-slate-800">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-rose-400" />
          Report to Official Law Enforcement & Regulatory Bodies
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {remedies.reportingAuthorities.map((auth, idx) => (
            <a
              key={idx}
              href={auth.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 flex flex-col justify-between transition-colors group"
            >
              <div>
                <div className="text-xs font-bold text-slate-100 group-hover:text-rose-400 flex items-center justify-between">
                  <span>{auth.name}</span>
                  <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-rose-400" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {auth.description}
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-500 mt-2">
                File Report &rarr;
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
