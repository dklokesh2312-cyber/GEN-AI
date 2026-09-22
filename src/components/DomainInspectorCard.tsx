import React, { useState } from "react";
import { 
  Globe, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  ShieldAlert, 
  Server, 
  Mail, 
  RefreshCw 
} from "lucide-react";
import { DomainCheckResult } from "../types";

interface DomainInspectorCardProps {
  initialDomain?: string;
  domainData: DomainCheckResult | null;
  onCheckDomain: (domain: string) => Promise<void>;
  isLoading: boolean;
}

export const DomainInspectorCard: React.FC<DomainInspectorCardProps> = ({
  initialDomain = "",
  domainData,
  onCheckDomain,
  isLoading
}) => {
  const [inputVal, setInputVal] = useState(initialDomain);

  // Sync if initialDomain changes
  React.useEffect(() => {
    if (initialDomain && initialDomain !== inputVal) {
      setInputVal(initialDomain);
    }
  }, [initialDomain]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onCheckDomain(inputVal.trim());
    }
  };

  const getAgeBadge = (ageDays: number | null) => {
    if (ageDays === null) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400 border border-slate-700">
          <Clock className="w-3 h-3" /> Age Unconfirmed
        </span>
      );
    }
    if (ageDays < 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
          <ShieldAlert className="w-3.5 h-3.5" /> High Risk: Freshly Registered ({ageDays}d old)
        </span>
      );
    }
    if (ageDays < 90) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
          <AlertTriangle className="w-3.5 h-3.5" /> Caution: Young Domain ({ageDays}d old)
        </span>
      );
    }
    const years = (ageDays / 365).toFixed(1);
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
        <CheckCircle2 className="w-3.5 h-3.5" /> Established Domain ({years} yrs / {ageDays}d)
      </span>
    );
  };

  return (
    <div id="domain-inspector-card" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
            Domain Age & Infrastructure Inspector
          </h2>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          RDAP / WHOIS Telemetry
        </span>
      </div>

      {/* Query Bar */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <input
            id="domain-input-field"
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="e.g. apexlogistics-inc.xyz or hr@company.com"
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors font-mono"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
        </div>
        <button
          id="btn-inspect-domain"
          type="submit"
          disabled={isLoading || !inputVal.trim()}
          className="px-4 py-2 bg-cyan-600/90 hover:bg-cyan-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Globe className="w-4 h-4" />
          )}
          <span>Inspect</span>
        </button>
      </form>

      {/* Inspection Results Display */}
      {domainData ? (
        <div className="space-y-3">
          {/* Main Status Strip */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[11px] text-slate-400 font-mono">Analyzed Target Domain</div>
              <div className="text-sm font-bold text-slate-100 font-mono flex items-center gap-1.5">
                <span>{domainData.domain}</span>
                {domainData.isHighRiskTLD && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    High Risk TLD ({domainData.tld})
                  </span>
                )}
                {domainData.isFreeMail && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Free Webmail
                  </span>
                )}
              </div>
            </div>

            <div>{getAgeBadge(domainData.ageDays)}</div>
          </div>

          {/* Detailed Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Created / Registered:
              </span>
              <span className="font-mono text-slate-200">
                {domainData.registrationDate 
                  ? new Date(domainData.registrationDate).toLocaleDateString()
                  : "Shielded / Hidden"}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-slate-500" />
                Registrar Authority:
              </span>
              <span className="font-mono text-slate-200 truncate max-w-[140px]" title={domainData.registrar}>
                {domainData.registrar || "Redacted / Privacy"}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                DNS Resolution:
              </span>
              <span className="font-mono flex items-center gap-1">
                {domainData.dnsResolved ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> Active Host
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-400" /> Inactive / Unresolved
                  </span>
                )}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                Domain Risk Penalty:
              </span>
              <span className={`font-mono font-bold ${domainData.domainThreatScore > 30 ? "text-rose-400" : "text-slate-200"}`}>
                +{domainData.domainThreatScore} pts
              </span>
            </div>
          </div>

          {/* Risk Signals List */}
          {domainData.riskSignals.length > 0 && (
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Domain Risk Analysis:
              </div>
              <ul className="space-y-1">
                {domainData.riskSignals.map((signal, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{signal}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-5 px-3 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
          <Globe className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-60" />
          <p>No domain inspected yet. Enter an alleged recruiter domain or email address above to verify domain age.</p>
        </div>
      )}
    </div>
  );
};
