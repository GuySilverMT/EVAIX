import React, { useMemo } from 'react';
import type { Model } from '../../../types/role.js';
import DualRangeSlider from '../../../components/ui/DualRangeSlider.js';
import { Check, Cpu, Eye, Image, Mic, Zap, FileText, Shield, Hammer, FlaskConical, Terminal, type LucideIcon } from 'lucide-react';
import { cn } from '../../../lib/utils.js';

export type FilterMode = 'CHAT' | 'VISION' | 'AUDIO' | 'EMBEDDING' | 'REASONING' | 'IMAGE_GEN' | 'COMPLIANCE' | 'JUDGE' | 'RESEARCH';

export interface FilterCriteria {
    minContext: number;
    maxContext: number;
    mode: FilterMode;
    preferences: {
        reasoning?: boolean;
        uncensored?: boolean;
    };
    hardCodedModelId?: string | null;
}

interface ModelFilterProps {
    allModels: Model[];
    criteria: FilterCriteria;
    onChange: (newCriteria: FilterCriteria) => void;
    viewMode: 'DNA_ONLY' | 'HARD_SELECTION'; // Role Creation vs Hard Override
    className?: string;
}

export const ModelFilter: React.FC<ModelFilterProps> = ({
    allModels, criteria, onChange, viewMode, className
}) => {

    // 1. Scoring and Filter Logic
    const stats = useMemo(() => {
        const providerMap: Record<string, { total: number; matching: Array<Model & { score: number }> }> = {};
        let totalMatching = 0;

        allModels.forEach(m => {
            const pName = m.providerLabel || m.providerId || 'Unknown';
            if (!providerMap[pName]) providerMap[pName] = { total: 0, matching: [] };

            providerMap[pName].total++;

            const caps = m.specs || {};
            const context = caps.contextWindow || 0;

            // Categorical Filtering (Mutually Exclusive)
            let isMatch = false;

            switch (criteria.mode) {
                case 'CHAT':
                    // Check ChatModel existence + Heuristics
                    if (m.chatModel) {
                        isMatch = true;
                    } else if (caps.primaryTask && caps.primaryTask !== 'chat' && !caps.isMultimodal) {
                        isMatch = false;
                    } else if (m.embeddingModel || m.audioModel || m.complianceModel) {
                        isMatch = !!(caps.hasReasoning || caps.hasCoding || caps.isMultimodal || !caps.primaryTask);
                    } else {
                        isMatch = true;
                    }
                    break;
                case 'VISION':
                    isMatch = !!m.modalities?.includes("VISION") || !!m.visionModel || !!caps.hasVision || !!caps.isMultimodal;
                    break;
                case 'AUDIO':
                    // Check AudioModel existence + Capabilities
                    isMatch = !!m.audioModel || !!caps.hasTTS || !!caps.hasAudioInput || !!caps.hasAudioOutput;
                    break;
                case 'EMBEDDING':
                    isMatch = !!m.embeddingModel || !!caps.hasEmbedding;
                    break;
                case 'REASONING':
                    isMatch = !!m.modalities?.includes("REASONING") || !!caps.hasReasoning || !!caps.hasCoding;
                    break;
                case 'IMAGE_GEN':
                    isMatch = !!m.imageModel || !!caps.hasImageGen;
                    break;
                case 'COMPLIANCE':
                    isMatch = !!m.complianceModel || !!caps.hasModeration;
                    break;
                case 'JUDGE':
                    isMatch = !!m.rewardModel || !!caps.hasReward;
                    break;
                case 'RESEARCH':
                    isMatch = !!caps.isMedical || !!caps.isWeather || !!caps.isScience;
                    break;
            }

            if (!isMatch) return;

            // Preference Hard Filters
            if (criteria.preferences.reasoning && !caps.hasReasoning) return;
            if (criteria.preferences.uncensored && !caps.uncensored) return;

            // Context Check - Relax for specialized models (often 0 or undefined context in registry)
            const isGeneralModel = criteria.mode === 'CHAT' || criteria.mode === 'VISION' || criteria.mode === 'REASONING';
            const withinRange = context >= criteria.minContext && context <= criteria.maxContext;

            if (isGeneralModel && !withinRange) return;
            if (!isGeneralModel && context > 0 && !withinRange) return;

            // Calculate score
            let score = 100;
            if (criteria.preferences.reasoning && caps.hasReasoning) score += 30;
            if (criteria.preferences.uncensored && caps.uncensored) score += 20;

            // Multimodal bonus in both Chat and Vision
            if (caps.isMultimodal) score += 15;

            // Context window bonus
            score += Math.min((context / 10000), 50);

            providerMap[pName].matching.push({ ...m, score });
            totalMatching++;
        });

        // Sort by score
        Object.values(providerMap).forEach(provider => {
            provider.matching.sort((a, b) => (b.score || 0) - (a.score || 0));
        });

        return { providerMap, totalMatching };
    }, [allModels, criteria]);

    const setMode = (mode: FilterMode) => {
        onChange({ ...criteria, mode, hardCodedModelId: null });
    };

    return (
        <div className={cn("flex flex-col gap-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4", className)}>

            {/* A. Category Selector (Mutually Exclusive) */}
            <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Category Selection</label>
                <div className="grid grid-cols-5 gap-1">
                    <ModeToggle label="Chat" active={criteria.mode === 'CHAT'} onClick={() => setMode('CHAT')} icon={Cpu} />
                    <ModeToggle label="Vision" active={criteria.mode === 'VISION'} onClick={() => setMode('VISION')} icon={Eye} />
                    <ModeToggle label="Audio" active={criteria.mode === 'AUDIO'} onClick={() => setMode('AUDIO')} icon={Mic} />
                    <ModeToggle label="Reasoning" active={criteria.mode === 'REASONING'} onClick={() => setMode('REASONING')} icon={Terminal} />
                    <ModeToggle label="Embed" active={criteria.mode === 'EMBEDDING'} onClick={() => setMode('EMBEDDING')} icon={FileText} />
                    <ModeToggle label="Comp" active={criteria.mode === 'COMPLIANCE'} onClick={() => setMode('COMPLIANCE')} icon={Shield} />
                    <ModeToggle label="Judge" active={criteria.mode === 'JUDGE'} onClick={() => setMode('JUDGE')} icon={Hammer} />
                    <ModeToggle label="Study" active={criteria.mode === 'RESEARCH'} onClick={() => setMode('RESEARCH')} icon={FlaskConical} />
                    <ModeToggle label="Image" active={criteria.mode === 'IMAGE_GEN'} onClick={() => setMode('IMAGE_GEN')} icon={Image} />
                </div>
            </div>

            {/* B. Preferences & Context */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Context Range</label>
                        <div className="flex items-center gap-2">
                             <input 
                                type="number" 
                                value={criteria.minContext} 
                                onChange={e => {
                                    const val = parseInt(e.target.value) || 0;
                                    onChange({ ...criteria, minContext: val });
                                }}
                                className="w-16 bg-[var(--bg-background)] border border-[var(--border-color)] text-[10px] rounded px-1 py-0.5 outline-none font-mono text-[var(--color-primary)]"
                             />
                             <span className="text-[8px] text-[var(--text-muted)] italic">to</span>
                             <input 
                                type="number" 
                                value={criteria.maxContext} 
                                onChange={e => {
                                    const val = parseInt(e.target.value) || 0;
                                    onChange({ ...criteria, maxContext: val });
                                }}
                                className="w-16 bg-[var(--bg-background)] border border-[var(--border-color)] text-[10px] rounded px-1 py-0.5 outline-none font-mono text-[var(--color-primary)]"
                             />
                        </div>
                    </div>
                    <DualRangeSlider
                        min={2048} max={500000} step={1024}
                        value={[criteria.minContext, Math.min(criteria.maxContext, 500000)]}
                        onChange={([min, max]: [number, number]) => onChange({ ...criteria, minContext: min, maxContext: max })}
                    />
                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                        <input 
                            type="checkbox" 
                            checked={criteria.maxContext > 500000}
                            onChange={e => onChange({ ...criteria, maxContext: e.target.checked ? 999999999 : 128000 })}
                            className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-800 text-purple-600 focus:ring-1 focus:ring-purple-600 focus:ring-offset-0"
                        />
                        <span className="text-[9px] font-bold uppercase text-zinc-400">Unlimited Max (500k+)</span>
                    </label>
                </div>
                <div className="flex gap-2 items-end">
                    <CapToggle label="Thinking" active={!!criteria.preferences.reasoning}
                        onClick={() => onChange({ ...criteria, preferences: { ...criteria.preferences, reasoning: !criteria.preferences.reasoning } })}
                        icon={Cpu}
                    />
                    <CapToggle label="Uncensored" active={!!criteria.preferences.uncensored}
                        onClick={() => onChange({ ...criteria, preferences: { ...criteria.preferences, uncensored: !criteria.preferences.uncensored } })}
                        icon={Zap}
                    />
                </div>
            </div>

            {/* C. Provider Table */}
            <div className="border rounded border-[var(--border-color)] overflow-hidden">
                <div className="grid grid-cols-12 gap-2 bg-[var(--bg-primary)] px-3 py-2 border-b border-[var(--border-color)] text-[10px] font-bold text-[var(--text-muted)] uppercase">
                    <div className="col-span-4">Provider</div>
                    <div className="col-span-3 text-center">Fit / Total</div>
                    <div className="col-span-5 text-right">{viewMode === 'HARD_SELECTION' ? 'Selection' : 'Status'}</div>
                </div>

                <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                    {Object.entries(stats.providerMap)
                        .filter(([_, data]) => data.matching.length > 0 || (viewMode === 'DNA_ONLY' && data.total > 0))
                        .map(([provider, data]) => {
                            const isSelectedProvider = criteria.hardCodedModelId && data.matching.some(m => m.id === criteria.hardCodedModelId);

                            return (
                                <div key={provider} className={cn("grid grid-cols-12 gap-2 px-3 py-2 items-center border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-primary)]/50 transition-colors", isSelectedProvider && "bg-[var(--color-primary)]/5")}>
                                    <div className="col-span-4 text-xs font-bold text-[var(--text-secondary)]">{provider}</div>
                                    <div className="col-span-3 text-xs font-mono text-center">
                                        <span className={data.matching.length > 0 ? "text-[var(--color-success)]" : "text-[var(--text-muted)]"}>{data.matching.length}</span>
                                        <span className="text-[var(--text-muted)]"> / {data.total}</span>
                                    </div>
                                    <div className="col-span-5 text-right">
                                        {viewMode === 'HARD_SELECTION' ? (
                                            <select
                                                className="w-full bg-[var(--bg-background)] border border-[var(--border-color)] text-[var(--text-secondary)] text-[10px] rounded px-1 py-1 outline-none"
                                                value={criteria.hardCodedModelId || ''}
                                                onChange={(e) => onChange({ ...criteria, hardCodedModelId: e.target.value || null })}
                                                disabled={data.matching.length === 0}
                                            >
                                                <option value="" className="text-[var(--text-secondary)]">Auto-Select</option>
                                                <optgroup label={provider}>
                                                    {data.matching.map(m => (
                                                        <option key={m.id} value={m.id} className="text-[var(--text-secondary)]">
                                                            {m.name} {m.isFreeTier ? '🎁 [FREE]' : ''} ({Math.round(m.score)})
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            </select>
                                        ) : (
                                            <div className="text-[10px] text-[var(--text-muted)] italic">
                                                {data.matching.length > 0 ? 'Active' : 'Offline'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>

            <div className="flex justify-end items-center text-[10px] text-[var(--text-muted)] px-1">
                <span className="font-bold text-[var(--color-primary)]">{stats.totalMatching} matches</span>
            </div>
        </div>
    );
};

const ModeToggle = ({ label, icon: Icon, active, onClick }: { label: string; icon: LucideIcon; active: boolean; onClick: () => void }) => (
    <button onClick={onClick} type="button" className={cn(
        "flex flex-col items-center justify-center p-2 rounded border transition-all gap-1",
        active ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]" : "bg-[var(--bg-background)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--text-muted)]"
    )}>
        <Icon size={14} />
        <span className="text-[8px] font-bold uppercase">{label}</span>
    </button>
);

const CapToggle = ({ label, icon: Icon, active, onClick }: { label: string; icon: LucideIcon; active: boolean; onClick: () => void }) => (
    <button onClick={onClick} type="button" className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded border transition-all text-[10px] font-bold",
        active ? "bg-blue-500/10 border-blue-500 text-blue-500" : "bg-[var(--bg-background)] border-[var(--border-color)] text-[var(--text-muted)]"
    )}>
        <Icon size={12} />
        <span>{label}</span>
        {active && <Check size={10} className="ml-auto" />}
    </button>
);
