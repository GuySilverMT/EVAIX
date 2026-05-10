import React from 'react';
import { motion } from 'framer-motion';
import { X, Edit, Trash2, Search, Loader2 } from 'lucide-react';
import { trpc } from '../../utils/trpc.js';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { Badge } from '../../components/ui/badge.js';

interface ProviderModelModalProps {
    providerId: string;
    providerName: string;
    onClose: () => void;
}

export const ProviderModelModal: React.FC<ProviderModelModalProps> = ({
    providerId,
    providerName,
    onClose
}) => {
    const [filter, setFilter] = React.useState('');
    const { data: models, isLoading } = trpc.providerModel.list.useQuery({ providerId });

    const filteredModels = React.useMemo(() => {
        if (!models) return [];
        return models.filter(m =>
            m.displayName.toLowerCase().includes(filter.toLowerCase()) ||
            m.apiString.toLowerCase().includes(filter.toLowerCase())
        );
    }, [models, filter]);

    const deleteMutation = trpc.providerModel.delete.useMutation({
        onSuccess: () => toast.success('Model override deleted'),
        onError: (e) => toast.error(e.message),
    });

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                className="w-full max-w-4xl h-[70vh] bg-slate-950 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Edit className="text-purple-400" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white tracking-tight uppercase">
                                {providerName} <span className="text-slate-500">Model Overrides</span>
                            </h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                {filteredModels.length} Overrides
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <Input
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                placeholder="Filter overrides..."
                                className="h-8 w-48 pl-9 text-[11px] bg-slate-900 border-slate-700 text-slate-200 focus:border-purple-500"
                            />
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-full transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden p-6 bg-slate-950">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center text-slate-500">
                            <Loader2 className="w-6 h-6 animate-spin mr-2" />
                            Loading overrides...
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredModels.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <p className="text-sm">No model overrides found.</p>
                                    <p className="text-[10px] mt-1">Use the SuperAiButton to fetch and create overrides.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredModels.map((model) => (
                                        <div key={model.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                                                        {model.isEnabled ? 'Active' : 'Disabled'}
                                                    </Badge>
                                                    <span className="font-mono text-sm text-white truncate">{model.apiString}</span>
                                                    <span className="text-slate-400 text-[11px] ml-2">→ {model.displayName}</span>
                                                </div>
                                                {model.contextWindowOverride && (
                                                    <div className="text-[10px] text-slate-500 mt-1 ml-8">
                                                        Context: {model.contextWindowOverride.toLocaleString()}
                                                    </div>
                                                )}
                                                {(model.inputCostPer1kOverride || model.outputCostPer1kOverride) && (
                                                    <div className="text-[10px] text-slate-500 mt-1 ml-8">
                                                        Pricing: ${model.inputCostPer1kOverride?.toFixed(6) || '0'} in / ${model.outputCostPer1kOverride?.toFixed(6) || '0'} out
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2 ml-4">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-6 text-[9px]"
                                                    onClick={() => {/* Edit logic */ }}
                                                >
                                                    <Edit size={10} className="mr-1" /> Edit
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    className="h-6 text-[9px]"
                                                    onClick={() => deleteMutation.mutate({ id: model.id })}
                                                >
                                                    <Trash2 size={10} className="mr-1" /> Delete
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/30 flex justify-end">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="text-[10px] uppercase font-black tracking-widest"
                    >
                        Close
                    </Button>
                </div>
            </motion.div>
        </div>
    );
};
