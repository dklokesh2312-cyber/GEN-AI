import React from "react";
import { Sliders, ShieldAlert, Sparkles, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";

interface ThreatFactorToggle {
  id: string;
  name: string;
  category: "Payment" | "Domain" | "Communication" | "Urgency" | "Protection";
  weight: number; // positive = threat, negative = safety offset
  active: boolean;
  description: string;
}

interface InteractiveThreatSimulatorProps {
  factors: ThreatFactorToggle[];
  onToggleFactor: (id: string) => void;
  onResetToScanned: () => void;
  simulatedScore: number;
}

export const InteractiveThreatSimulator: React.FC<InteractiveThreatSimulatorProps> = ({
  factors,
  onToggleFactor,
  onResetToScanned,
  simulatedScore,
}) => {
  return (
    <div id="interactive-threat-simulator" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
            Dynamic Threat Factor Simulator
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs flex items-center gap-1.5 font-mono">
            <span className="text-slate-400">Simulated Index:</span>
            <span className={`font-bold px-2 py-0.5 rounded text-xs ${
              simulatedScore >= 75 ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
              simulatedScore >= 45 ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
              "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
            }`}>
              {Math.round(simulatedScore)}%
            </span>
          </div>

          <button
            onClick={onResetToScanned}
            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Simulate how modifying variables (e.g. demanding an official company domain or eliminating wire transfers) drives the dynamic threat calculation:
      </p>

      {/* Toggles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {factors.map((factor) => {
          const isThreat = factor.weight > 0;
          return (
            <div
              key={factor.id}
              onClick={() => onToggleFactor(factor.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                factor.active
                  ? isThreat
                    ? "bg-slate-950 border-rose-500/40 hover:border-rose-500/60"
                    : "bg-slate-950 border-emerald-500/40 hover:border-emerald-500/60"
                  : "bg-slate-950/40 border-slate-800/40 opacity-50 hover:opacity-75"
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                    isThreat 
                      ? "bg-rose-500/20 text-rose-300"
                      : "bg-emerald-500/20 text-emerald-300"
                  }`}>
                    {isThreat ? `+${factor.weight}% Threat` : `${factor.weight}% Safety`}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    {factor.category}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-100">
                  {factor.name}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {factor.description}
                </div>
              </div>

              {/* Status Indicator */}
              <div className="shrink-0 mt-1">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  factor.active 
                    ? isThreat ? "bg-rose-500 text-white" : "bg-emerald-500 text-slate-950"
                    : "bg-slate-800 text-slate-500"
                }`}>
                  {factor.active ? "✓" : "×"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
