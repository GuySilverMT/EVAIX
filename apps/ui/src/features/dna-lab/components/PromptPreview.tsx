import React, { useMemo } from 'react';
import { trpc } from '../../../utils/trpc.js';
import { Eye, Info, Code, Bookmark } from 'lucide-react';

interface PromptPreviewProps {
    basePrompt: string;
    selectedTools: string[];
}

export const PromptPreview: React.FC<PromptPreviewProps> = ({ basePrompt, selectedTools }) => {
    const { data: docs, isLoading } = trpc.orchestrator.getBulkToolDocs.useQuery(
        { toolNames: selectedTools },
        { enabled: selectedTools.length > 0 }
    );

    const fullPrompt = useMemo(() => {
        let p = basePrompt;
        if (docs?.signatures) {
            p += "\n\n## 🛠️ TOOL SIGNATURES\n" + docs.signatures;
        }
        if (docs?.fullDocs) {
            p += "\n\n## 📖 TOOL DOCUMENTATION\n" + docs.fullDocs;
        }
        return p;
    }, [basePrompt, docs]);

    if (isLoading) return <div className="p-8 animate-pulse text-[var(--text-muted)]">Assembling System Context...</div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <div className="p-2 bg-blue-500/20 rounded-full text-blue-400">
                    <Info size={20} />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-blue-200">Context Simulation</h3>
                    <p className="text-xs text-blue-300/80">This is exactly what the AI agent will see when it starts a session.</p>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-widest flex items-center gap-2">
                        <Bookmark size={12} /> Full System Prompt
                    </label>
                    <div className="text-[10px] text-[var(--text-muted)]">
                        {fullPrompt.split(' ').length} words | {fullPrompt.length} characters
                    </div>
                </div>
                
                <div className="relative group">
                    <pre className="w-full h-[600px] overflow-auto bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-6 font-mono text-[11px] leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap custom-scrollbar">
                        {fullPrompt}
                    </pre>
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex gap-2">
                             <div className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-[9px] font-bold text-zinc-400">READ-ONLY</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="p-4 bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] rounded-lg">
                    <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase text-[var(--text-muted)] mb-3">
                        <Code size={14} /> Knowledge Injection
                    </h4>
                    <ul className="space-y-2 text-[11px] text-[var(--text-secondary)]">
                        <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Identity DNA Block ({basePrompt.length > 0 ? 'Injecting' : 'Empty'})
                        </li>
                        <li className="flex items-center gap-2">
                             <div className={cn("w-1.5 h-1.5 rounded-full", docs?.signatures ? "bg-green-500" : "bg-zinc-600")} />
                            Tool Signatures ({selectedTools.length} tools)
                        </li>
                        <li className="flex items-center gap-2">
                             <div className={cn("w-1.5 h-1.5 rounded-full", docs?.fullDocs ? "bg-green-500" : "bg-zinc-600")} />
                            Detailed Examples ({docs?.fullDocs ? 'Optimized' : 'None'})
                        </li>
                    </ul>
                 </div>

                 <div className="p-4 bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] rounded-lg">
                    <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase text-[var(--text-muted)] mb-3">
                        <Eye size={14} /> System Visibility
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                        Total context size is approximately <strong>{Math.ceil(fullPrompt.length / 4)} tokens</strong>. 
                        This fits well within the 128k context window of most modern models.
                    </p>
                 </div>
            </div>
        </div>
    );
};

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');
