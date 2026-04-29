import React from 'react';
import { motion } from 'framer-motion';
import { X, Search, Database, ExternalLink, RefreshCw } from 'lucide-react';
import { trpc } from '../../utils/trpc.js';
import { UniversalDataGrid } from '../../components/UniversalDataGrid.js';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';

interface ModelInventoryModalProps {
    providerId: string;
    providerName: string;
    onClose: () => void;
}

export const ModelInventoryModal: React.FC<ModelInventoryModalProps> = ({
    providerId,
    providerName,
    onClose
}) => {
    const [filter, setFilter] = React.useState('');
    const { data, isLoading } = trpc.model.listByProvider.useQuery({ providerId });

    const models = React.useMemo(() => {
        if (!data?.models) return [];
        return data.models.filter(m =>
            m.name.toLowerCase().includes(filter.toLowerCase()) ||
            (m.id as string).toLowerCase().includes(filter.toLowerCase())
        ).map(m => {
            const caps = (m.capabilities as any) || {};
            return {
                id: m.id,
                name: m.name,
                context: caps.contextWindow || '?',
                max_out: caps.maxOutput || '?',
                vision: caps.hasVision ? 'YES' : 'no',
                tools: caps.supportsFunctionCalling ? 'YES' : 'no',
                embedding: caps.hasEmbedding ? 'YES' : 'no',
                image: caps.hasImageGen ? 'YES' : 'no',
                price_in: (caps.specs as any)?.inputCostPer1k || 0,
                price_out: (caps.specs as any)?.outputCostPer1k || 0,
                last_seen: new Date(m.lastSeenAt).toLocaleString(),
            };
        });
    }, [data, filter]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                className="w-full max-w-6xl h-[85vh] bg-slate-950 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Database className="text-blue-400" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white tracking-tight uppercase">
                                {providerName} <span className="text-slate-500">Inventory</span>
                            </h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                {models.length} Models Found in Registry
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <Input
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                placeholder="Filter models..."
                                className="h-8 w-64 pl-9 text-[11px] bg-slate-900 border-slate-700 text-slate-200 focus:border-blue-500"
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

                {/* Grid Content */}
                <div className="flex-1 overflow-hidden p-6 bg-slate-950">
                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-500">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            >
                                <RefreshCw size={32} className="text-blue-500" />
                            </motion.div>
                            <span className="text-[10px] uppercase font-black tracking-widest text-blue-400">Querying Model Registry…</span>
                        </div>
                    ) : (
                        <div className="h-full rounded-lg border border-slate-800 overflow-hidden shadow-inner bg-slate-900/20">
                            <UniversalDataGrid
                                data={models}
                                headers={['id', 'name', 'context', 'max_out', 'vision', 'tools', 'embedding', 'image', 'price_in', 'price_out', 'last_seen']}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/30 flex justify-between items-center text-[10px]">
                    <div className="flex gap-4 text-slate-500 font-mono">
                        <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> API String</span>
                        <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-700" /> Registry Meta</span>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[9px] uppercase font-black tracking-widest bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                            onClick={() => window.open(`https://console.x.ai`, '_blank')} // Fallback example
                        >
                            <ExternalLink size={12} className="mr-1.5" /> Documentation
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[9px] uppercase font-black tracking-widest bg-blue-600 hover:bg-blue-500 text-white border-transparent"
                            onClick={onClose}
                        >
                            Done
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
