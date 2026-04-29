import React, { useState, useEffect } from 'react';
import { trpc } from '../../../utils/trpc.js';
import { Save, Wrench, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface ToolPromptEditorProps {
    toolName: string;
    onClose: () => void;
}

export const ToolPromptEditor: React.FC<ToolPromptEditorProps> = ({ toolName, onClose }) => {
    const [content, setContent] = useState('');
    const utils = trpc.useContext();

    const { data, isLoading } = trpc.orchestrator.getToolExamples.useQuery({ toolName });
    
    const updateMutation = trpc.orchestrator.updateToolExamples.useMutation({
        onSuccess: () => {
            toast.success(`Updated prompt for ${toolName}`);
            void utils.orchestrator.getToolExamples.invalidate({ toolName });
            onClose();
        },
        onError: (err: any) => {
            toast.error(`Failed to update: ${err.message}`);
        }
    });

    useEffect(() => {
        if (data?.content) {
            setContent(data.content);
        }
    }, [data]);

    const handleSave = () => {
        updateMutation.mutate({ toolName, content });
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="h-12 flex items-center justify-between px-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/50">
                <div className="flex items-center gap-2">
                    <Wrench size={16} className="text-[var(--color-primary)]" />
                    <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-primary)]">Edit Tool DNA: {toolName}</span>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-muted)]">
                    <X size={16} />
                </button>
            </div>

            {/* Editor */}
            <div className="flex-1 p-4 flex flex-col gap-4">
                <div className="flex-1 relative">
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-primary)]/50">
                            <Sparkles size={24} className="animate-spin text-[var(--color-primary)] opacity-50" />
                        </div>
                    ) : null}
                    <label className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1 block">Behavioral Protocol & Usage Examples</label>
                    <textarea 
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        className="w-full h-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded p-4 font-mono text-xs leading-relaxed outline-none focus:border-[var(--color-primary)] custom-scrollbar resize-none"
                        placeholder="Define how the agent should use this tool and provide sharded examples..."
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="h-14 px-4 flex items-center justify-end border-t border-[var(--border-color)] bg-[var(--bg-primary)]/30">
                <button 
                    onClick={handleSave}
                    disabled={updateMutation.isLoading}
                    className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-6 py-2 rounded text-xs font-bold hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
                >
                    {updateMutation.isLoading ? <Sparkles size={14} className="animate-spin" /> : <Save size={14} />}
                    Save Protocol
                </button>
            </div>
        </div>
    );
};
