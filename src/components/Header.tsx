import React from "react";
import { ShieldAlert, ShieldCheck, AlertTriangle, Activity, Lock, ExternalLink } from "lucide-react";

interface HeaderProps {
  currentThreatScore?: number;
  verdict?: string;
  isAiActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ currentThreatScore, verdict, isAiActive }) => {
  return (
    <header id="app-header" className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 via-red-500/10 to-amber-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-inner">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">
                Fake Offer Letter & Phishing Inspector
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Threat Shield v2.4
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Job offer, appointment letter & rental deposit security analyzer
            </p>
          </div>
        </div>

        {/* Live Status & Quick Telemetry */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Engine: <strong className="text-slate-100">Active</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>FTC/IC3 Rules: <strong className="text-slate-100">Enforced</strong></span>
          </div>

          {currentThreatScore !== undefined && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold border ${
              currentThreatScore >= 75
                ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                : currentThreatScore >= 45
                ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
            }`}>
              {currentThreatScore >= 75 ? (
                <ShieldAlert className="w-3.5 h-3.5" />
              ) : currentThreatScore >= 45 ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              <span>Threat Index: <strong>{currentThreatScore}%</strong></span>
            </div>
          )}

          {isAiActive && (
            <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
              Gemini AI Armed
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
