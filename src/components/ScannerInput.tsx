import React, { useState, useRef } from "react";
import { 
  FileText, 
  Link as LinkIcon, 
  Sparkles, 
  Search, 
  UploadCloud, 
  RotateCcw, 
  ChevronDown, 
  BookOpen,
  Copy,
  Check
} from "lucide-react";
import { PRESET_SAMPLES } from "../data/samples";
import { PresetSample } from "../types";

interface ScannerInputProps {
  text: string;
  urlOrDomain: string;
  onTextChange: (val: string) => void;
  onUrlChange: (val: string) => void;
  onRunScan: () => void;
  onRunAiScan: () => void;
  onLoadSample: (sample: PresetSample) => void;
  onClear: () => void;
  isScanning: boolean;
  isAiScanning: boolean;
}

export const ScannerInput: React.FC<ScannerInputProps> = ({
  text,
  urlOrDomain,
  onTextChange,
  onUrlChange,
  onRunScan,
  onRunAiScan,
  onLoadSample,
  onClear,
  isScanning,
  isAiScanning,
}) => {
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        onTextChange(content);
      }
    };
    reader.readAsText(file);
  };

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        onTextChange(clipText);
      }
    } catch {
      // Fallback
    }
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  return (
    <div id="scanner-input-container" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      
      {/* Top Header & Presets Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase flex items-center gap-2">
            <FileText className="w-4 h-4 text-rose-400" />
            Inspect Offer Letter, Lease or URL
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Paste suspicious email text, appointment letter, rental contract, or recruiter URL
          </p>
        </div>

        {/* Preset Sample Selector */}
        <div className="flex items-center gap-2">
          <div className="relative inline-block w-full sm:w-auto">
            <select
              id="preset-sample-dropdown"
              onChange={(e) => {
                const sample = PRESET_SAMPLES.find((s) => s.id === e.target.value);
                if (sample) onLoadSample(sample);
              }}
              defaultValue=""
              className="w-full sm:w-60 bg-slate-950 text-slate-200 border border-slate-700 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-rose-500 appearance-none font-medium cursor-pointer pr-8"
            >
              <option value="" disabled>
                Load Real-World Scam Sample...
              </option>
              {PRESET_SAMPLES.map((sample) => (
                <option key={sample.id} value={sample.id}>
                  [{sample.category}] {sample.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Preset Quick Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
          <BookOpen className="w-3 h-3" /> Quick Presets:
        </span>
        {PRESET_SAMPLES.slice(0, 4).map((sample) => (
          <button
            key={sample.id}
            onClick={() => onLoadSample(sample)}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors"
          >
            {sample.title.split(" ")[0]} {sample.title.split(" ")[1]} ({sample.category})
          </button>
        ))}
      </div>

      {/* Main Textarea */}
      <div className="relative">
        <textarea
          id="scanner-text-input"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Paste appointment letter, employment offer email, or rental agreement here... (e.g. 'We are pleased to offer you the position... equipment check will be mailed via FedEx... deposit $4,500 via Zelle')"
          rows={7}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500/60 font-mono transition-colors resize-y leading-relaxed"
        />

        {/* Floating Quick Action Icons */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur rounded-lg p-1 border border-slate-800">
          <button
            onClick={handlePaste}
            title="Paste from clipboard"
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 text-xs flex items-center gap-1"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[10px]">Paste</span>
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Upload text or email file"
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 text-xs flex items-center gap-1"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[10px]">Upload</span>
          </button>

          {text && (
            <button
              onClick={onClear}
              title="Clear input"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.eml,.md,.log"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Sub-bar with word/char count */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 mt-1 font-mono">
          <span>{wordCount} words • {charCount} chars</span>
          {wordCount > 0 && wordCount < 20 && (
            <span className="text-amber-400/80">Tip: Long-form text provides higher forensic accuracy.</span>
          )}
        </div>
      </div>

      {/* URL or Sender Domain Input */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <input
            id="url-or-domain-input"
            type="text"
            value={urlOrDomain}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="Recruiter Domain or Job Posting URL (e.g. apexlogistics-inc.xyz or careers@google.com)"
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500/60 font-mono transition-colors"
          />
          <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Scan Action Buttons Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>Calculates dynamic Scam Threat Index (0–100%)</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Primary Instant Scan */}
          <button
            id="btn-run-heuristic-scan"
            onClick={onRunScan}
            disabled={isScanning || isAiScanning || (!text.trim() && !urlOrDomain.trim())}
            className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-rose-950/40 disabled:opacity-50"
          >
            <Search className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
            <span>{isScanning ? "Inspecting..." : "Scan Threat Index"}</span>
          </button>

          {/* Deep AI Forensic Scan Button */}
          <button
            id="btn-run-gemini-ai-scan"
            onClick={onRunAiScan}
            disabled={isScanning || isAiScanning || !text.trim()}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-purple-200 border border-purple-500/30 hover:border-purple-500/60 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
            title="Runs server-side Gemini 3.8 Flash model for semantic deception analysis"
          >
            <Sparkles className={`w-4 h-4 text-purple-400 ${isAiScanning ? "animate-spin" : ""}`} />
            <span>{isAiScanning ? "AI Analyzing..." : "Deep AI Forensics"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
