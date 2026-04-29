import React, { useState, useMemo } from 'react';
import { Brain, Eye, EyeOff, Zap, Lock, Unlock } from 'lucide-react';

// Represents the state of a single Card's brain
export interface CardAgentState {
  roleId: string;        // The abstract role (e.g. "Junior Coder")
  modelId: string | null; // The concrete model (e.g. "gpt-4o")
  isLocked: boolean;     // If true, use modelId. If false, use Dynamic Selector.
  
  // Runtime Tweaks (Overrides Role defaults) - All Volcano SDK parameters
  temperature: number;              // 0-2: Controls randomness
  maxTokens: number;                // Maximum tokens to generate
  topP?: number;                    // 0-1: Nucleus sampling
  frequencyPenalty?: number;        // -2 to 2: Reduces token frequency repetition
  presencePenalty?: number;         // -2 to 2: Encourages topic diversity
  stop?: string[];                  // Stop sequences to end generation
  seed?: number;                    // For deterministic outputs
  responseFormat?: 'text' | 'json_object'; // Force JSON output
  
  // NEW: Parameter Safety Feedback
  adjustedParameters?: Record<string, unknown>;
}

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  capabilities?: {
    vision?: boolean;
    reasoning?: boolean;
    coding?: boolean;
  };
  supportsTools?: boolean;
  isUncensored?: boolean;
  costPer1k?: number;
}

interface AgentSettingsProps {
  config: CardAgentState;
  availableRoles: { id: string; name: string; category: string }[]; 
  availableModels: ModelOption[];
  onUpdate: (newConfig: CardAgentState) => void;
  fileSystem?: {
    currentPath: string;
    onNavigate: (path: string) => void;
  };
}

export const AgentSettings: React.FC<AgentSettingsProps> = ({ config, availableRoles, availableModels, onUpdate }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [showAdjustmentDetails, setShowAdjustmentDetails] = useState(false);

  // Derive initial category from current role
  const initialCategory = useMemo(() => {
    if (!config.roleId) return '';
    const role = availableRoles.find(r => r.id === config.roleId);
    return role?.category || '';
  }, [config.roleId, availableRoles]);

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  // Update selectedCategory if config.roleId changes externally (and category mismatches)
  // Actually, we probably only want to set it if it's currently empty or if the role changes to something outside the current category?
  // Let's just sync it when config.roleId changes, if it's not empty.
  // But be careful not to override user selection if they are browsing.
  // Let's just use initial state for now, or a useEffect if we want strict sync.
  // A useEffect is safer for "controlled" behavior.
  React.useEffect(() => {
      if (config.roleId) {
          const role = availableRoles.find(r => r.id === config.roleId);
          if (role?.category) {
              setSelectedCategory(role.category);
          }
      }
  }, [config.roleId, availableRoles]);

  const groupedRoles = useMemo(() => {
    const groups: Record<string, typeof availableRoles> = {};
    availableRoles.forEach(role => {
      const category = role.category || 'Uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(role);
    });
    // Sort roles within each category alphabetically
    Object.keys(groups).forEach(category => {
      groups[category].sort((a, b) => a.name.localeCompare(b.name));
    });
    return groups;
  }, [availableRoles]);

  return (
    <div className="h-full w-full bg-zinc-950 text-zinc-300 flex flex-col font-mono text-xs overflow-y-auto">
      <div className="p-3 space-y-4">
        
        {/* 1. ROLE ASSIGNMENT - Compact */}
        <div className="space-y-2">
          {/* Category Selector */}
          <select
            value={(() => {
               // If we have a local state for category, use it.
               // Otherwise, try to derive from current role.
               // But we need state to allow switching categories without selecting a role yet.
               // So let's use a state variable.
               return selectedCategory;
            })()} 
            onChange={(e) => {
                setSelectedCategory(e.target.value);
                // Optional: Clear role when category changes? Or keep it if it happens to be in the new category (unlikely)
                // For now, just change category filter.
            }}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs focus:ring-cyan-500/50 outline-none"
          >
            <option value="">All Categories</option>
            {Object.keys(groupedRoles).sort().map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Role Selector */}
          <select 
            value={config.roleId} 
            onChange={(e) => onUpdate({ ...config, roleId: e.target.value, isLocked: false })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs focus:ring-cyan-500/50 outline-none"
          >
            <option value="">Select a Role...</option>
            {selectedCategory 
                ? (groupedRoles[selectedCategory] || []).map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))
                : availableRoles.sort((a, b) => a.name.localeCompare(b.name)).map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))
            }
          </select>
        </div>

        {/* 2. MODEL ALLOCATION - Compact */}
        <div className="p-2 rounded border border-zinc-800 bg-zinc-900/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-[var(--color-text-secondary)] flex items-center gap-1">
              <Brain size={10} /> MODEL
            </span>
            <button 
              onClick={() => onUpdate({ ...config, isLocked: !config.isLocked })}
              className={`p-0.5 rounded hover:bg-zinc-800 ${config.isLocked ? 'text-amber-500' : 'text-green-500'}`}
              title={config.isLocked ? "Manual Override" : "Dynamic"}
            >
              {config.isLocked ? <Lock size={10} /> : <Unlock size={10} />}
            </button>
          </div>

          {config.isLocked ? (
            <select 
              value={config.modelId || ''} 
              onChange={(e) => onUpdate({ ...config, modelId: e.target.value })}
              className="w-full bg-black border border-amber-900/30 text-amber-500 rounded px-2 py-1.5 text-xs outline-none"
            >
              <option value="">Select model...</option>
              {availableModels.map(m => {
                const caps = [];
                if (m.capabilities?.vision) caps.push('V');
                if (m.capabilities?.reasoning) caps.push('R');
                if (m.supportsTools) caps.push('T');
                return (
                  <option key={m.id} value={m.id}>
                    {m.name} {caps.length > 0 ? `[${caps.join(',')}]` : ''}
                  </option>
                );
              })}
            </select>
          ) : (
            <div className="flex items-center justify-between bg-black border border-zinc-800 rounded px-2 py-1">
              <div className="flex items-center gap-1">
                <Zap size={10} className={isRevealed ? "text-blue-400" : "text-green-500 animate-pulse"} />
                <span className={`text-[10px] font-bold ${isRevealed ? "text-zinc-200" : "text-[var(--color-text-secondary)]"}`}>
                  {isRevealed 
                    ? (availableModels.find(m => m.id === config.modelId)?.name || "Allocating...") 
                    : "Dynamic Free Tier"}
                </span>
              </div>
              <button 
                onClick={() => setIsRevealed(!isRevealed)}
                className="text-zinc-600 hover:text-zinc-300"
              >
                {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
          )}
        </div>

        {/* 3. PARAMETERS - Compact with number inputs */}
        <div className="space-y-2 pt-2 border-t border-zinc-900">
          <div className="flex justify-between items-center">
            <span className="text-[8px] uppercase text-zinc-600 font-bold">PARAMETERS</span>
            {config.adjustedParameters && Object.keys(config.adjustedParameters).length > 0 && (
              <button 
                onClick={() => setShowAdjustmentDetails(!showAdjustmentDetails)}
                className="px-1 py-0.5 bg-yellow-900/20 border border-yellow-700 text-yellow-500 rounded text-[8px]"
              >
                ⚠️
              </button>
            )}
          </div>

          {/* Adjustment Details */}
          {showAdjustmentDetails && config.adjustedParameters && (
            <div className="bg-zinc-900 border border-yellow-700/50 rounded p-2 text-[8px]">
              {Object.entries(config.adjustedParameters).map(([key, val]) => (
                <div key={key} className="text-[var(--color-text-secondary)]">
                  {key}: {(val as { reason?: string })?.reason || String(val)}
                </div>
              ))}
            </div>
          )}
          
          {/* Temperature */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] text-[var(--color-text-secondary)] w-16">Temp</span>
            <input 
              type="number"
              min={0} max={2} step={0.1}
              value={config.temperature}
              onChange={(e) => onUpdate({ ...config, temperature: parseFloat(e.target.value) || 0 })}
              className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[10px] text-cyan-400"
            />
          </div>

          {/* Max Tokens */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] text-[var(--color-text-secondary)] w-16">Tokens</span>
            <input 
              type="number"
              min={256} max={8192} step={256}
              value={config.maxTokens}
              onChange={(e) => onUpdate({ ...config, maxTokens: parseInt(e.target.value) || 2048 })}
              className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[10px] text-cyan-400"
            />
          </div>

          {/* Top P */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] text-[var(--color-text-secondary)] w-16">Top P</span>
            <input 
              type="number"
              min={0} max={1} step={0.05}
              value={config.topP ?? 1.0}
              onChange={(e) => onUpdate({ ...config, topP: parseFloat(e.target.value) || 1.0 })}
              className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[10px] text-purple-400"
            />
          </div>

          {/* Frequency Penalty */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] text-[var(--color-text-secondary)] w-16">Freq</span>
            <input 
              type="number"
              min={-2} max={2} step={0.1}
              value={config.frequencyPenalty ?? 0}
              onChange={(e) => onUpdate({ ...config, frequencyPenalty: parseFloat(e.target.value) || 0 })}
              className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[10px] text-green-400"
            />
          </div>

          {/* Presence Penalty */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] text-[var(--color-text-secondary)] w-16">Presence</span>
            <input 
              type="number"
              min={-2} max={2} step={0.1}
              value={config.presencePenalty ?? 0}
              onChange={(e) => onUpdate({ ...config, presencePenalty: parseFloat(e.target.value) || 0 })}
              className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[10px] text-amber-400"
            />
          </div>

          {/* Seed */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] text-[var(--color-text-secondary)] w-16">Seed</span>
            <input
              type="number"
              value={config.seed ?? ''}
              onChange={(e) => onUpdate({ ...config, seed: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="Random"
              className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[10px] text-cyan-400"
            />
          </div>

          {/* Response Format */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] text-[var(--color-text-secondary)] w-16">Format</span>
            <select
              value={config.responseFormat ?? 'text'}
              onChange={(e) => onUpdate({ ...config, responseFormat: e.target.value as 'text' | 'json_object' })}
              className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300"
            >
              <option value="text">Text</option>
              <option value="json_object">JSON</option>
            </select>
          </div>

          {/* Stop Sequences */}
          <div className="space-y-1">
            <span className="text-[9px] text-[var(--color-text-secondary)]">Stop Sequences</span>
            <input
              type="text"
              value={config.stop?.join(', ') ?? ''}
              onChange={(e) => onUpdate({ ...config, stop: e.target.value ? e.target.value.split(',').map(s => s.trim()) : undefined })}
              placeholder="\\n\\n, END"
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300"
            />
          </div>
        </div>
      </div>
    </div>
  );
};