import { useState, useEffect, type FC } from 'react';
import { 
  Folder, FileText, ChevronRight, ChevronDown, ArrowUp, 
  RefreshCw, Eye, EyeOff, Brain, 
  FilePlus, FolderPlus, Save
} from 'lucide-react';
import type { VFile } from '../stores/FileSystemTypes.js';
import { cn } from '@/lib/utils.js';
import { SuperAiButton } from './ui/SuperAiButton.js';

interface FileExplorerProps {
  files: VFile[];
  onSelect: (path: string) => void;
  className?: string;
  currentPath?: string;
  onNavigate?: (path: string) => void;
  onCreateNode?: (type: 'file' | 'directory', name: string) => void;
  onRefresh?: () => void;
  onEmbedDir?: (path: string) => void;
  onLoadChildren?: (path: string) => Promise<VFile[]>;
  onDropItem?: (sourcePath: string, targetPath: string) => void;
  
  // New props for saving content from other views
  activeContent?: string;
  onSaveContent?: (path: string, content: string) => void;
}

// Helper: Estimate Tokens (Roughly 4 chars per token)
const estimateTokens = (size: number = 0) => {
  if (!size) return '';
  const tokens = Math.ceil(size / 4);
  if (tokens > 1000) return `~${(tokens / 1000).toFixed(1)}k tok`;
  return `~${tokens} tok`;
};

const FileNode = ({ 
  node, 
  onSelect, 
  onNavigate, 
  onLoadChildren, 
  onEmbedDir,
  depth = 0,
  showHidden
}: { 
  node: VFile, 
  onSelect: (p: string) => void,
  onNavigate?: (p: string) => void,
  onLoadChildren?: (path: string) => Promise<VFile[]>,
  onEmbedDir?: (path: string) => void,
  depth: number,
  showHidden: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<VFile[]>(node.children || []);
  const [isLoading, setIsLoading] = useState(false);
  const paddingLeft = depth * 12 + 12;

  if (!showHidden && node.path.split('/').pop()?.startsWith('.')) return null;

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type !== 'directory') return;
    
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    if (newIsOpen && children.length === 0 && onLoadChildren) {
      setIsLoading(true);
      try {
        const loaded = await onLoadChildren(node.path);
        setChildren(loaded);
      } catch (err) {
        console.error('Failed to load children:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ path: node.path, type: node.type }));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  return (
    <div>
      <div 
        draggable
        onDragStart={handleDragStart}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => node.type === 'directory' ? onNavigate?.(node.path) : onSelect(node.path)}
        className={cn(
            "flex items-center gap-2 py-1 pr-2 hover:bg-zinc-800 cursor-pointer group text-xs transition-colors select-none",
            node.type === 'directory' ? "text-zinc-300 font-bold" : "text-zinc-400"
        )}
        style={{ paddingLeft }}
      >
        <span onClick={(e) => { void handleToggle(e); }} className="flex items-center cursor-pointer min-w-[16px]">
          {node.type === 'directory' && (
             isLoading ? <RefreshCw size={10} className="animate-spin" /> : 
             isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          )}
        </span>
        {node.type === 'directory' ? (
            <Folder size={14} className="text-purple-400 shrink-0" />
        ) : (
            <FileText size={14} className="text-blue-400 shrink-0" />
        )}
        <span className="flex-1 truncate group-hover:text-white">
            {node.path.split('/').pop()}
        </span>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {node.type === 'file' && (
                <span className="text-[9px] text-zinc-600 font-mono">
                    {estimateTokens(node.size)}
                </span>
            )}
            {node.type === 'directory' && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onEmbedDir?.(node.path); }}
                    className="p-1 hover:bg-white/10 rounded text-green-500" 
                    title="Ingest for RAG"
                >
                    <Brain size={10} />
                </button>
            )}
        </div>
      </div>
      {isOpen && children.map(child => (
        <FileNode 
          key={child.path} 
          node={child} 
          onSelect={onSelect} 
          onNavigate={onNavigate}
          onLoadChildren={onLoadChildren}
          onEmbedDir={onEmbedDir}
          depth={depth + 1}
          showHidden={showHidden}
        />
      ))}
    </div>
  );
};

export const FileExplorer: FC<FileExplorerProps> = ({ 
  files, onSelect, className, currentPath, onNavigate,
  onCreateNode, onRefresh, onEmbedDir, onLoadChildren, activeContent, onSaveContent
}) => {
  const [pathInput, setPathInput] = useState(currentPath || '');
  const [showHidden, setShowHidden] = useState(false);
  const [isCreating, setIsCreating] = useState<'file' | 'folder' | 'save' | null>(null);
  const [newNodeName, setNewNodeName] = useState('');

  useEffect(() => { setPathInput(currentPath || ''); }, [currentPath]);

  const handleNavigate = () => onNavigate?.(pathInput);
  
  const handleCreateSubmit = () => {
      if (newNodeName.trim()) {
          if (isCreating === 'save' && onSaveContent && activeContent !== undefined) {
              const fullPath = (currentPath ? currentPath.replace(/\/$/, '') + '/' : '') + newNodeName;
              onSaveContent(fullPath, activeContent);
          } else if (onCreateNode && (isCreating === 'file' || isCreating === 'folder')) {
              onCreateNode(isCreating === 'file' ? 'file' : 'directory', newNodeName);
          }
          setIsCreating(null);
          setNewNodeName('');
      }
  };

  return (
    <div className={cn("flex flex-col h-full bg-zinc-950", className)}>
       <div className="flex flex-col gap-2 p-2 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-1">
             <button onClick={() => {
                 const parent = currentPath?.split('/').slice(0, -1).join('/') || '/';
                 onNavigate?.(parent);
             }} className="p-1 hover:bg-white/10 rounded text-zinc-400">
                <ArrowUp size={14} />
             </button>
             <div className="flex-1 relative group">
                <input 
                  className="w-full bg-black/40 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:border-purple-500 outline-none font-mono"
                  value={pathInput}
                  onChange={(e) => setPathInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
                />
             </div>
             <button onClick={() => setShowHidden(!showHidden)} className={cn("p-1 rounded", showHidden ? "text-white bg-white/10" : "text-zinc-500 hover:text-zinc-300")}>
                {showHidden ? <Eye size={14} /> : <EyeOff size={14} />}
             </button>
             <button onClick={onRefresh} className="p-1 hover:bg-white/10 rounded text-zinc-400">
                <RefreshCw size={14} />
             </button>
          </div>

          <div className="flex items-center justify-between">
             <div className="flex gap-1 items-center">
                <button onClick={() => setIsCreating('file')} className="flex items-center gap-1 px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-[10px] text-zinc-300"><FilePlus size={10} /> File</button>
                <button onClick={() => setIsCreating('folder')} className="flex items-center gap-1 px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-[10px] text-zinc-300"><FolderPlus size={10} /> Folder</button>
                <SuperAiButton 
                   contextGetter={() => ({ currentPath, files })}
                   className="scale-75"
                />
             </div>
             
             <button onClick={() => onEmbedDir?.(currentPath || '.')} className="flex items-center gap-1 px-2 py-0.5 bg-green-900/20 hover:bg-green-900/40 border border-green-900/50 rounded text-[10px] text-green-400"><Brain size={10} /> Ingest</button>

             {/* 🟢 GOOD: Renamed to Save New File */}
             {activeContent !== undefined && onSaveContent && (
                <button 
                    onClick={() => {
                        setIsCreating('save');
                        setNewNodeName(`saved-card-${Date.now()}.md`);
                    }} 
                    className="flex items-center gap-1 px-2 py-0.5 bg-amber-900/20 hover:bg-amber-900/40 border border-amber-900/50 rounded text-[10px] text-amber-400 ml-1"
                    title="Save current editor content to a new file"
                >
                    <Save size={10} /> Save New File
                </button>
             )}
          </div>
          
          {isCreating && (
            <div className="flex items-center gap-2 px-1 py-1 animate-in fade-in slide-in-from-top-1">
               {isCreating === 'folder' ? <Folder size={14} className="text-purple-400"/> : 
                isCreating === 'save' ? <Save size={14} className="text-amber-400"/> :
                <FileText size={14} className="text-blue-400"/>}
               <input 
                  autoFocus
                  className="flex-1 bg-black border border-blue-500 rounded px-1 text-xs text-white outline-none"
                  placeholder={isCreating === 'save' ? "Save as filename..." : `New ${isCreating} name...`}
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateSubmit();
                    if (e.key === 'Escape') setIsCreating(null);
                  }}
                  onBlur={() => setIsCreating(null)}
               />
            </div>
          )}
       </div>

       <div className="flex-1 overflow-y-auto p-1">
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
                <Folder size={24} className="opacity-20" />
                <span className="text-xs">Directory Empty</span>
            </div>
          ) : (
            files.map(f => (
              <FileNode 
                key={f.path} 
                node={f} 
                onSelect={onSelect} 
                onNavigate={onNavigate}
                onLoadChildren={onLoadChildren}
                onEmbedDir={onEmbedDir}
                depth={0} 
                showHidden={showHidden}
              />
            ))
          )}
       </div>
    </div>
  );
};
