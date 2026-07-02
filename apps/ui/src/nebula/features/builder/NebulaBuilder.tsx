import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useBuilderStore } from '../../../stores/builder.store.js';
import { ComponentManifest, type ComponentCategory } from '../../registry.js';
import { Canvas as BuilderCanvas } from '../../../components/nebula/system/Canvas.js';
import { PropertyPanel } from '../../../components/nebula/system/PropertyPanel.js';
import { BuilderToolbar } from '../../features/navigation/toolbars/BuilderToolbar.js';
import type { NebulaTree } from '@repo/nebula'; 
import { X, FolderOpen, Code, RefreshCw, Layers, FileCode, Plus, Search, Bot, Box, Zap } from 'lucide-react';
import { cn } from '../../../lib/utils.js';
import { useVFS } from '../../../hooks/useVFS.js';
import { SuperAiButton } from '../../../components/ui/SuperAiButton.js';
import { toast } from 'sonner';
import { FileExplorer } from '../../../components/FileExplorer.js';
import { trpc } from '../../../utils/trpc.js';

// --- UTILS ---
const flattenTree = (node: any, nodes: Record<string, any> = {}): string => {
    const id = node.id || `node-${Math.random().toString(36).substring(2, 9)}`;
    const children = Array.isArray(node.children) ? node.children : [];
    const childrenIds = children.map((child: any) => {
        if (typeof child === 'string') return child;
        return flattenTree(child, nodes);
    });

    nodes[id] = { ...node, id, children: childrenIds };
    return id;
};

const mapBadBuilderToNebula = (node: any): any => {
    const mapped = { ...node };
    if (node.role) {
        if (node.role === 'cell') mapped.type = 'Box';
        else if (node.role === 'text') mapped.type = 'Text';
        else if (node.role === 'icon') mapped.type = 'Icon';
        else if (node.role === 'dropdown') mapped.type = 'Component';
        else if (node.role === 'input') mapped.type = 'Input';
        else mapped.type = 'Box'; // Fallback

        // Preserve visual/layout constraints as props/style mappings if needed here
        if (!mapped.props) mapped.props = {};
        if (node.role === 'dropdown') mapped.componentName = 'Dropdown';
    }
    if (Array.isArray(node.children)) {
        mapped.children = node.children.map(mapBadBuilderToNebula);
    }
    return mapped;
};

const normalizeProject = (project: any): NebulaTree => {
    if (project.rootId && project.nodes) return project as NebulaTree;

    // Check if Bad Builder schema array
    let rootNode = project;
    if (Array.isArray(project) || project.role) {
        rootNode = { id: 'root', type: 'Box', children: Array.isArray(project) ? project : [project] };
    }

    rootNode = mapBadBuilderToNebula(rootNode);

    const nodes: Record<string, any> = {};
    const rootId = flattenTree(rootNode, nodes);
    return { rootId, nodes } as NebulaTree;
};

// --- TYPES ---
interface NebulaBuilderProps {
  initialTree: NebulaTree; 
  onSave: (newTree: NebulaTree) => void;
}

// --- MAIN COMPONENT ---
export const NebulaBuilder = ({ initialTree, onSave }: NebulaBuilderProps) => {
  const [tree, setTree] = useState<NebulaTree>(initialTree);
  const [sidebarTab, setSidebarTab] = useState<'library' | 'assistant' | 'files'>('library');
  const [activeCategory, setActiveCategory] = useState<ComponentCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCodeModal, setShowCodeModal] = useState<boolean>(false);
  const [codeBuffer, setCodeBuffer] = useState('');
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  
  // AI State
  const [aiPrompt, setAiPrompt] = useState('');

  const { setIsDirty, saveTriggered, viewport } = useBuilderStore();
  const vfs = useVFS('', '/'); // Start at root (which now defaults to /home/guy/mono in backend)

  // TRPC Mutations
  const parseJsxMutation = trpc.nebula.parseJsx.useMutation();
  const generateCodeMutation = trpc.nebula.generateCode.useMutation();
  const dispatchMutation = trpc.orchestrator.dispatch.useMutation({
    onSuccess: (data) => {
        handleAiSuccess(data);
    }
  });

  // --- ACTIONS ---

  const handleSave = useCallback(() => {
    onSave(tree);
    setIsDirty(false);
    toast("Layout Saved", { description: "Nebula tree persisted to disk." });
  }, [tree, onSave, setIsDirty]);

  // Sync save button from toolbar
  useEffect(() => {
    if (saveTriggered > 0) handleSave();
  }, [saveTriggered, handleSave]);

  // Drag Start
  const handleDragStart = (e: React.DragEvent, componentType: string) => {
    e.dataTransfer.setData('nebula/type', componentType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // VFS Import
  const handleVfsSelect = async (path: string) => {
    const fileName = path.split('/').pop() || '';
    if (!/\.(tsx|jsx|ts|js|json)$/.test(fileName)) {
        toast.error("Invalid File Type", { description: "Please select a React/TS or JSON file." });
        return;
    }

    try {
        const content = await vfs.readFile(path);
        let newTree: NebulaTree;

        if (fileName.endsWith('.json')) {
            const project = JSON.parse(content);
            newTree = normalizeProject(project);
        } else {
            newTree = await parseJsxMutation.mutateAsync({ code: content });
        }

        setTree(newTree);
        setCurrentFile(path.split('/').pop() || path);
        setIsDirty(true);
        toast("File Imported", { description: `Successfully loaded ${path} into Nebula Tree.` });
    } catch (err) {
        toast.error("Open Error", { description: (err as Error).message });
    }
  };

  // Export
  const getExportedCode = useCallback(async () => {
    const result = await generateCodeMutation.mutateAsync({ tree });
    return result.code;
  }, [tree, generateCodeMutation]);

  const handleSaveJson = async () => {
    try {
      const json = JSON.stringify(tree, null, 2);
      await vfs.writeFile('nebula-project.json', json);
      toast.success("JSON Exported", { description: "Saved as nebula-project.json to VFS Root." });
    } catch (err) {
      toast.error("Export Failed", { description: (err as Error).message });
    }
  };

  // AI Context Getter
  const getAiContext = useCallback(() => {
     return {
         tree: tree,
         activeViewport: viewport,
         currentFile: currentFile
     };
  }, [tree, viewport, currentFile]);

  const handleAiSuccess = (response: any) => {
      console.log("AI Response:", response);
      if (response?.tree) {
          setTree(response.tree);
          toast("AI Generation Complete", { description: "Applied layout changes from Agent." });
      }
  };

  // Filter Components
  const componentList = useMemo(() => Object.entries(ComponentManifest)
    .filter(([_key, def]) => {
      if (def.meta.hidden) return false;
      const matchesSearch = _key.toLowerCase().includes(searchQuery.toLowerCase()) || def.meta.label.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (activeCategory === 'all') return def.meta.category !== 'system' && def.meta.category !== 'logic';
      return def.meta.category === activeCategory;
    }), [activeCategory, searchQuery]);

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-300 overflow-hidden font-sans">
      
      {/* 1. TOP BAR */}
      <div className="h-10 border-b border-zinc-800 flex items-center px-4 bg-zinc-950/50 backdrop-blur shrink-0 justify-between">
        <div className="flex items-center gap-4">
            <BuilderToolbar />
            {currentFile && (
                <div className="flex items-center gap-2 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-mono text-zinc-400">
                    <FileCode size={12} className="text-indigo-400" />
                    {currentFile}
                </div>
            )}
        </div>
         <div className="flex items-center gap-2 h-full">
            <button 
              onClick={() => { void handleSaveJson(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-zinc-800 rounded-sm text-[10px] uppercase font-bold text-zinc-500 hover:text-amber-400 transition-colors border border-transparent hover:border-zinc-700"
            >
               <Layers size={12} /> Save JSON
            </button>
            <button 
              onClick={() => { void (async () => { const code = await getExportedCode(); setCodeBuffer(code); setShowCodeModal(true); })(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-zinc-800 rounded-sm text-[10px] uppercase font-bold text-zinc-500 hover:text-indigo-400 transition-colors border border-transparent hover:border-zinc-700"
            >
               <Code size={12} /> View Code
            </button>
            <div className="h-4 w-px bg-zinc-800 mx-2" />
            <SuperAiButton 
                contextGetter={getAiContext}
                onSuccess={handleAiSuccess}
                defaultRoleId="nebula-architect"
                className="z-50 scale-90"
            />
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* CENTER (Canvas) */}
        <div className="flex-1 bg-zinc-950 flex flex-col relative overflow-hidden">
           {/* Canvas Wrapper */}
           <div className="flex-1 overflow-auto p-12 flex justify-center bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] custom-scrollbar">
              <div 
                className={cn(
                  "transition-all duration-500 shadow-2xl bg-zinc-900 border border-zinc-800 ring-4 ring-zinc-950 rounded-sm origin-top",
                  viewport === 'mobile' ? 'w-[390px]' : viewport === 'tablet' ? 'w-[768px]' : 'w-full h-full'
                )}
                style={{ minHeight: '800px' }}
              >
                 <BuilderCanvas 
                    tree={tree} 
                    setTree={(t: NebulaTree) => { setTree(t); setIsDirty(true); }}
                 />
              </div>
           </div>
        </div>
      </div>

      {/* EXPORT MODAL */}
      {showCodeModal && (
        <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center p-12 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-zinc-900 border border-zinc-700 w-full max-w-5xl h-[85vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
                 <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-2 tracking-widest uppercase">
                    <Code size={14} className="text-indigo-500" />
                    Nebula Engine: Generated Code
                 </h3>
                 <button onClick={() => setShowCodeModal(false)} className="text-zinc-500 hover:text-white p-2 transition-colors"><X size={18}/></button>
              </div>
              <div className="flex-1 relative bg-zinc-950">
                 <textarea 
                   className="w-full h-full bg-transparent p-6 font-mono text-xs text-zinc-400 focus:text-zinc-200 focus:outline-none resize-none leading-relaxed overflow-auto custom-scrollbar"
                   value={codeBuffer}
                   readOnly
                   spellCheck={false}
                 />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
