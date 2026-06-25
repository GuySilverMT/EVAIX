import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface TuningConfig {
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

interface TunerProps {
  config: TuningConfig;
  onChange: (cfg: TuningConfig) => void;
}

export const NaturalParameterTuner: React.FC<TunerProps> = ({ config, onChange }) => {
  
  // Logic to describe the vibe
  const getVibe = () => {
      const { temperature } = config;
      if (temperature < 0.3) return "Deterministic & Strict (Good for Code)";
      if (temperature < 0.7) return "Balanced & Focused (Good for Assistants)";
      if (temperature > 1.0) return "Chaotic & Creative (Good for Brainstorming)";
      return "Abstract & Random";
  };

  // Logic for warnings
  const getWarnings = () => {
      const w = [];
      if (config.temperature > 0.9 && config.topP < 0.5) {
          w.push("High Temperature with Low Top-P is contradictory. The model wants to be random but is forced to choose top tokens.");
      }
      if (config.frequencyPenalty > 1.0) {
          w.push("High Frequency Penalty often degrades code quality.");
      }
      return w;
  };

  const warnings = getWarnings();

  return (
    <div className="space-y-6 p-4 bg-[var(--bg-primary)] rounded border border-[var(--border-color)]">
        <div className="flex items-center justify-between">
             <h4 className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Neural Tuning</h4>
             <span className="text-[10px] text-[var(--color-primary)] font-mono">{getVibe()}</span>
        </div>

        {/* Temperature */}
        <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
                <span>Temperature (Creativity)</span>
                <span className="font-mono opacity-50">{config.temperature.toFixed(1)}</span>
            </div>
            <input 
                type="range" min={0} max={2} step={0.1}
                value={config.temperature}
                onChange={e => onChange({ ...config, temperature: parseFloat(e.target.value) })}
                className="w-full h-1 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
            />
        </div>

        {/* Top P */}
        <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
                <span>Top P (Nucleus Sampling)</span>
                <span className="font-mono opacity-50">{config.topP.toFixed(2)}</span>
            </div>
            <input 
                type="range" min={0} max={1} step={0.05}
                value={config.topP}
                onChange={e => onChange({ ...config, topP: parseFloat(e.target.value) })}
                className="w-full h-1 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
            />
        </div>

        {/* Frequency Penalty */}
        <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
                <span>Frequency Penalty</span>
                <span className="font-mono opacity-50">{config.frequencyPenalty.toFixed(2)}</span>
            </div>
            <input 
                type="range" min={-2} max={2} step={0.1}
                value={config.frequencyPenalty}
                onChange={e => onChange({ ...config, frequencyPenalty: parseFloat(e.target.value) })}
                className="w-full h-1 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
            />
        </div>

        {/* Presence Penalty */}
        <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
                <span>Presence Penalty</span>
                <span className="font-mono opacity-50">{config.presencePenalty.toFixed(2)}</span>
            </div>
            <input 
                type="range" min={-2} max={2} step={0.1}
                value={config.presencePenalty}
                onChange={e => onChange({ ...config, presencePenalty: parseFloat(e.target.value) })}
                className="w-full h-1 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
            />
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
            <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
                {warnings.map((msg, i) => (
                    <div key={i} className="flex gap-2 text-[10px] text-yellow-500">
                        <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                        {msg}
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};
