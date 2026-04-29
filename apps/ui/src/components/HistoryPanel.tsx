import { useEffect, useState, useCallback } from 'react';
import { trpc } from '../utils/trpc.js';
import { History, RotateCcw, X, FileText, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Version {
    filename: string;
    path: string;
    timestamp: string;
}

export const HistoryPanel = ({ activeFile, onRestore, onClose }: { 
    activeFile: string, 
    onRestore: (content: string) => void,
    onClose: () => void 
}) => {
    const [versions, setVersions] = useState<Version[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const utils = trpc.useUtils();
    const basename = activeFile.split('/').pop() || '';

    const loadVersions = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await utils.vfs.list.fetch({ 
                path: '/home/guy/nebula-docs-versions',
                provider: 'local',
                cardId: 'history-panel'
            });
            
            const filtered = result
                .filter(f => f.type === 'file' && f.path.includes(basename))
                .map(f => {
                    const parts = f.path.split('/');
                    const filename = parts[parts.length - 1];
                    const timePart = filename.replace(`${basename}.`, '').replace('.md', '');
                    return {
                        filename,
                        path: f.path,
                        timestamp: timePart.replace(/-/g, ':')
                    };
                })
                .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
                
            setVersions(filtered);
        } catch (err) {
            console.error("Failed to load versions", err);
            toast.error("Failed to load history");
        } finally {
            setIsLoading(false);
        }
    }, [basename, utils.vfs.list]);

    useEffect(() => {
        void loadVersions();
    }, [loadVersions]);

    const handleRestore = async (vPath: string) => {
        try {
            const { content } = await utils.vfs.read.fetch({ 
                path: vPath, 
                provider: 'local' 
            });
            onRestore(content);
            toast.success("Version restored");
            onClose();
        } catch {
            toast.error("Failed to restore version");
        }
    };

    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col max-h-[80%] overflow-hidden">
                <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/50">
                    <div className="flex items-center gap-2">
                        <History size={16} className="text-purple-400" />
                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">Version History</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-4 bg-zinc-950/50 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
                            <FileText size={20} className="text-zinc-500" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white">{basename}</div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-tighter">Snapshots in /home/guy/nebula-docs-versions/</div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {isLoading ? (
                        <div className="h-40 flex flex-col items-center justify-center gap-3 text-zinc-500 animate-pulse">
                            <Clock size={24} className="animate-spin" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Scanning Chronology...</span>
                        </div>
                    ) : versions.length === 0 ? (
                        <div className="h-40 flex flex-col items-center justify-center gap-3 text-zinc-600">
                            <History size={24} className="opacity-20" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">No previous versions found</span>
                        </div>
                    ) : (
                        versions.map((v) => (
                            <div 
                                key={v.path} 
                                className="group flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800/50 border border-transparent hover:border-zinc-700 transition-all cursor-default"
                            >
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-zinc-400 font-mono">{v.timestamp}</span>
                                    <span className="text-[9px] text-zinc-600 mt-0.5">{v.filename}</span>
                                </div>
                                <button 
                                    onClick={() => void handleRestore(v.path)}
                                    className="px-3 py-1.5 bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <RotateCcw size={12} />
                                    Restore
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-3 border-t border-zinc-800 bg-zinc-900/30 flex justify-center">
                    <span className="text-[9px] text-zinc-600 text-center italic">
                        Versions are saved every time you hit Save on a .md or .txt file.
                    </span>
                </div>
            </div>
        </div>
    );
};
