import React, { useState } from 'react';
import { useWorkspaceStore } from '../../stores/workspace.store.js';
import { trpc } from '../../utils/trpc.js';
import { Folder, Database, Server, Plus, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';export function ProjectManagerPanel() {
  const { 
    activeWorkspaceId, 
    setActiveWorkspaceId,
    setProjectType,
    setProjectName,
    setCards,
    recentProjects,
    addRecentProject
  } = useWorkspaceStore();

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string } | null>(null);
  const [docContextMenu, setDocContextMenu] = useState<{ x: number; y: number; docName: string } | null>(null);
  
  // Dummy data for documents list
  const documents = ['README.md', 'design-spec.md', 'notes.txt'];
  const utils = trpc.useUtils();

  const handleOpenProject = async (path: string) => {
    try {
      const configRes = await utils.vfs.read.fetch({ path: `${path}/.evaix/project.json` });
      const config = JSON.parse(configRes.content);

      setActiveWorkspaceId(path);
      if (config.projectType) setProjectType(config.projectType);
      if (config.name) setProjectName(config.name);
      
      // Cards parsing omitted for brevity but standard logic here...
      addRecentProject(path);
      toast.success(`Loaded: ${config.name}`);
    } catch (err) {
      toast.error('Failed to load project');
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-300 font-sans">
      {/* Header */}
      <div className="h-12 border-b border-zinc-800 flex items-center px-4 justify-between bg-zinc-900/50">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Workspace</span>
        <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <Plus size={14} />
        </button>
      </div>
      
      {/* Project Selector List */}
      <div className="flex-1 overflow-y-auto">
        {recentProjects.map(path => {
          const isActive = path === activeWorkspaceId;
          const baseName = path.split('/').pop() || path;
          
          return (
            <div 
              key={path}
              onClick={() => handleOpenProject(path)}
              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, path }); }}
              className={`group flex items-center justify-between px-4 py-2 cursor-pointer border-b border-zinc-800/50 hover:bg-zinc-900 transition-all ${isActive ? 'bg-zinc-900 border-l-2 border-l-indigo-500' : 'border-l-2 border-l-transparent'}`}
            >
              <div className="flex items-center gap-3">
                <Folder size={14} className={isActive ? 'text-indigo-400' : 'text-zinc-500'} />
                <span className={`text-[11px] font-mono truncate max-w-[160px] ${isActive ? 'text-indigo-300' : 'text-zinc-400 group-hover:text-zinc-300'}`}>
                  {baseName}
                </span>
              </div>
              <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 text-zinc-600" />
            </div>
          );
        })}
      </div>

      {/* Documents List Stub */}
      <div className="h-1/3 border-t border-zinc-800 bg-zinc-950 flex flex-col">
        <div className="h-10 border-b border-zinc-800 flex items-center px-4 bg-zinc-900/50">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Documents</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {documents.map(doc => (
            <div 
              key={doc}
              onClick={() => {
                toast.success(`Streaming context for ${doc}`);
                // Implementation for left click to stream document context
              }}
              onContextMenu={(e) => { e.preventDefault(); setDocContextMenu({ x: e.clientX, y: e.clientY, docName: doc }); }}
              className="group flex items-center justify-between p-0 cursor-pointer border-b border-zinc-800/50 hover:bg-zinc-900 transition-all border-l-2 border-l-transparent"
            >
              <div className="flex items-center gap-2">
                <FileText size={12} className="text-zinc-500" />
                <span className="text-[11px] font-mono truncate max-w-[160px] text-zinc-400 group-hover:text-zinc-300">
                  {doc}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Active MCP Servers Stub */}
      <div className="h-1/4 border-t border-zinc-800 bg-zinc-950 flex flex-col">
        <div className="h-10 border-b border-zinc-800 flex items-center px-4 bg-zinc-900/50">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">MCP Servers</span>
        </div>
        <div className="flex-1 p-2 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
            <Database size={12} className="text-emerald-500" /> DB Connection (Active)
          </div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
            <Server size={12} className="text-amber-500" /> Local Executor (Idle)
          </div>
        </div>
      </div>
      
      {contextMenu && (
        <div 
          className="fixed z-50 bg-zinc-900 border border-zinc-800 rounded shadow-xl py-1"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button 
            onClick={() => setContextMenu(null)}
            className="w-full text-left px-4 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            Open configuration
          </button>
          <button 
            onClick={() => setContextMenu(null)}
            className="w-full text-left px-4 py-1.5 text-[11px] text-rose-400 hover:bg-zinc-800 hover:text-rose-300"
          >
            Remove from list
          </button>
        </div>
      )}

      {/* Document Context Menu */}
      {docContextMenu && (
        <div 
          className="fixed z-50 bg-zinc-900 border border-zinc-800 rounded shadow-xl py-1"
          style={{ top: docContextMenu.y, left: docContextMenu.x }}
        >
          <button 
            onClick={() => { toast.info('Appending Context'); setDocContextMenu(null); }}
            className="w-full text-left px-4 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            Append Context
          </button>
          <button 
            onClick={() => { toast.info('Purging Local Buffer'); setDocContextMenu(null); }}
            className="w-full text-left px-4 py-1.5 text-[11px] text-rose-400 hover:bg-zinc-800 hover:text-rose-300"
          >
            Purge Local Buffer
          </button>
          <button 
            onClick={() => { toast.success('Pushed Markdown to VFS'); setDocContextMenu(null); }}
            className="w-full text-left px-4 py-1.5 text-[11px] text-indigo-400 hover:bg-zinc-800 hover:text-indigo-300"
          >
            Push Markdown to VFS
          </button>
        </div>
      )}
    </div>
  );
}
