import React from "react";
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertOctagon, 
  AlertTriangle, 
  HelpCircle,
  TrendingUp,
  Server,
  CreditCard,
  MessageSquare,
  Zap
} from "lucide-react";
import { ThreatBreakdown, ScamVerdict } from "../types";

interface ThreatScoreGaugeProps {
  score: number; // 0 to 100
  verdict: ScamVerdict;
  category: string;
  threatBreakdown: ThreatBreakdown;
  activeRedFlagsCount: number;
}

export const ThreatScoreGauge: React.FC<ThreatScoreGaugeProps> = ({
  score,
  verdict,
  category,
  threatBreakdown,
  activeRedFlagsCount
}) => {
  // Determine color scheme based on score
  const isCritical = score >= 75;
  const isHigh = score >= 50 && score < 75;
  const isSuspicious = score >= 25 && score < 50;
  const isSafe = score < 25;

  const strokeColor = isCritical 
    ? "#f43f5e" // rose-500
    : isHigh 
    ? "#f97316" // orange-500
    : isSuspicious 
    ? "#eab308" // yellow-500
    : "#10b981"; // emerald-500

  const badgeBg = isCritical 
    ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
    : isHigh 
    ? "bg-orange-500/20 text-orange-300 border-orange-500/30"
    : isSuspicious 
    ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";

  // SVG Gauge calculations
  // Semi-circle arc from 180 deg to 0 deg
  const radius = 80;
  const strokeWidth = 14;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div id="threat-score-gauge-card" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
      
      {/* Background ambient glow matching threat severity */}
      <div 
        className="absolute top-0 right-0 w-64 h-64 blur-3xl opacity-15 pointer-events-none rounded-full"
        style={{ backgroundColor: strokeColor }}
      />

      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
            Scam Threat Index
          </h2>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeBg}`}>
          {isCritical && <AlertOctagon className="w-3.5 h-3.5" />}
          {isHigh && <AlertTriangle className="w-3.5 h-3.5" />}
          {isSuspicious && <HelpCircle className="w-3.5 h-3.5" />}
          {isSafe && <ShieldCheck className="w-3.5 h-3.5" />}
          {verdict.replace("_", " ")}
        </span>
      </div>

      {/* Radial Gauge Arc Display */}
      <div className="flex flex-col items-center justify-center my-2 relative">
        <div className="relative w-52 h-28 flex items-end justify-center">
          <svg className="w-52 h-28 overflow-visible" viewBox="0 0 200 110">
            {/* Background Arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="#1e293b"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Active Gauge Arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Centered Score */}
          <div className="absolute bottom-0 inset-x-0 flex flex-col items-center justify-center">
            <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-mono">
              {Math.round(score)}%
            </span>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider -mt-1">
              Threat Score
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between w-full max-w-[220px] text-[11px] text-slate-500 font-mono mt-2 pt-1 border-t border-slate-800/60">
          <span>0% Safe</span>
          <span>50% Caution</span>
          <span>100% Critical</span>
        </div>
      </div>

      {/* Target Category */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 my-4">
        <div className="text-[11px] font-medium text-slate-400">Classified Archetype:</div>
        <div className="text-sm font-semibold text-slate-100 flex items-center justify-between">
          <span>{category}</span>
          <span className="text-xs text-rose-400 font-mono">
            {activeRedFlagsCount} Red Flag{activeRedFlagsCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Vector Sub-Score Breakdown (0 to 100 points total) */}
      <div className="space-y-2.5 pt-1">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Threat Vector Weights</span>
          <span className="text-[11px] font-mono text-slate-500">Points Applied</span>
        </div>

        {/* 1. Payment Demand (0-35) */}
        <div>
          <div className="flex justify-between items-center text-xs text-slate-300 mb-1">
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-rose-400" />
              Payment Demands & Checks
            </span>
            <span className="font-mono text-xs font-semibold text-slate-200">
              {threatBreakdown.paymentDemandScore} / 35
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-rose-500 transition-all duration-500 rounded-full"
              style={{ width: `${(threatBreakdown.paymentDemandScore / 35) * 100}%` }}
            />
          </div>
        </div>

        {/* 2. Domain & Sender (0-25) */}
        <div>
          <div className="flex justify-between items-center text-xs text-slate-300 mb-1">
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-orange-400" />
              Domain & Sender Legitimacy
            </span>
            <span className="font-mono text-xs font-semibold text-slate-200">
              {threatBreakdown.domainAndSenderScore} / 25
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-orange-500 transition-all duration-500 rounded-full"
              style={{ width: `${(threatBreakdown.domainAndSenderScore / 25) * 100}%` }}
            />
          </div>
        </div>

        {/* 3. Communication Anomalies (0-20) */}
        <div>
          <div className="flex justify-between items-center text-xs text-slate-300 mb-1">
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-yellow-400" />
              Interview / Protocol Channel
            </span>
            <span className="font-mono text-xs font-semibold text-slate-200">
              {threatBreakdown.communicationAnomaliesScore} / 20
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-yellow-500 transition-all duration-500 rounded-full"
              style={{ width: `${(threatBreakdown.communicationAnomaliesScore / 20) * 100}%` }}
            />
          </div>
        </div>

        {/* 4. Urgency & Deception (0-20) */}
        <div>
          <div className="flex justify-between items-center text-xs text-slate-300 mb-1">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              Urgency & Psychological Coercion
            </span>
            <span className="font-mono text-xs font-semibold text-slate-200">
              {threatBreakdown.urgencyAndDeceptionScore} / 20
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-500 rounded-full"
              style={{ width: `${(threatBreakdown.urgencyAndDeceptionScore / 20) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
