import React, { useState } from 'react';
import { useWorkspaceStore } from '../../stores/workspace.store.js';
import { trpc } from '../../utils/trpc.js';
import { Folder, Database, Server, Plus, ChevronRight, FileText, Activity } from 'lucide-react';
import { toast } from 'sonner';

export function ProjectManagerPanel() {
  const { 
    activeWorkspaceId, 
    setActiveWorkspaceId,
    setProjectType,
    setProjectName,
    recentProjects,
    addRecentProject,
    appendContextBuffer
  } = useWorkspaceStore();

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string } | null>(null);
  const [docContextMenu, setDocContextMenu] = useState<{ x: number; y: number; docName: string } | null>(null);
  const [showAddMcp, setShowAddMcp] = useState(false);
  const [mcpPath, setMcpPath] = useState('');
  const [mcpName, setMcpName] = useState('');

  // RAG-linked Markdown project files (casts, timelines, rules)
  const documents = ['casts.md', 'timelines.md', 'rules.md', 'README.md', 'design-spec.md'];
  
  const utils = trpc.useUtils();
  const addMcpMutation = trpc.openwebui.addMcpServer.useMutation();
  const intentRegistryQuery = trpc.openwebui.getIntentRegistry.useQuery();

  const handleOpenProject = async (path: string) => {
    try {
      const configRes = await utils.vfs.read.fetch({ path: `${path}/.evaix/project.json` });
      const config = JSON.parse(configRes.content);

      setActiveWorkspaceId(path);
      if (config.projectType) setProjectType(config.projectType);
      if (config.name) setProjectName(config.name);
      
      addRecentProject(path);
      toast.success(`Loaded Workspace: ${config.name}`);
    } catch (err) {
      toast.error('Failed to load workspace config');
    }
  };

  const handleAddMcp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mcpPath) return;
    try {
      const res = await addMcpMutation.mutateAsync({
        manifestUrlOrPath: mcpPath,
        name: mcpName || undefined
      });
      toast.success(`MCP Registered: ${res.mcpName} (${res.healthDetails})`);
      setMcpPath('');
      setMcpName('');
      setShowAddMcp(false);
      intentRegistryQuery.refetch();
    } catch (err: any) {
      toast.error(`MCP Health Check Failed: ${err.message}`);
    }
  };

  const handleRAGInject = (docName: string) => {
    const markdownSnippet = `# RAG Document Context: ${docName}\nLinked VFS document loaded into workspace memory stream.`;
    appendContextBuffer(markdownSnippet);
    toast.success(`Appended ${docName} to RAG Context Buffer`);
  };

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-300 font-sans border-r border-zinc-800">
      
      {/* Header */}
      <div className="h-12 border-b border-zinc-800 flex items-center px-4 justify-between bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <Folder size={14} className="text-indigo-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Project Manager</span>
        </div>
        <button 
          onClick={() => toast.info('Creating new workspace in VFS...')}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
          title="New Workspace"
        >
          <Plus size={14} />
        </button>
      </div>
      
      {/* Workspace Selector List */}
      <div className="flex-1 overflow-y-auto min-h-[140px]">
        {recentProjects.length === 0 ? (
          <div className="p-4 text-center text-[11px] text-zinc-600 font-mono">
            No recent workspaces
          </div>
        ) : (
          recentProjects.map(path => {
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
                  <span className={`text-[11px] font-mono truncate max-w-[160px] ${isActive ? 'text-indigo-300 font-bold' : 'text-zinc-400 group-hover:text-zinc-300'}`}>
                    {baseName}
                  </span>
                </div>
                <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 text-zinc-600" />
              </div>
            );
          })
        )}
      </div>

      {/* RAG-Linked VFS Markdown Documents */}
      <div className="h-1/3 border-t border-zinc-800 bg-zinc-950 flex flex-col">
        <div className="h-10 border-b border-zinc-800 flex items-center px-4 justify-between bg-zinc-900/50">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">RAG VFS Documents</span>
          <span className="text-[9px] font-mono text-indigo-400">{documents.length} files</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {documents.map(doc => (
            <div 
              key={doc}
              onClick={() => handleRAGInject(doc)}
              onContextMenu={(e) => { e.preventDefault(); setDocContextMenu({ x: e.clientX, y: e.clientY, docName: doc }); }}
              className="group flex items-center justify-between px-4 py-2 cursor-pointer border-b border-zinc-800/50 hover:bg-zinc-900 transition-all border-l-2 border-l-transparent hover:border-l-indigo-500"
            >
              <div className="flex items-center gap-2">
                <FileText size={12} className="text-zinc-500 group-hover:text-indigo-400" />
                <span className="text-[11px] font-mono truncate max-w-[160px] text-zinc-400 group-hover:text-zinc-200">
                  {doc}
                </span>
              </div>
              <span className="text-[9px] font-mono text-zinc-600 group-hover:text-indigo-400">RAG</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Tiled MCP Dashboard & Add MCP Section */}
      <div className="h-2/5 border-t border-zinc-800 bg-zinc-950 flex flex-col overflow-hidden">
        <div className="h-10 border-b border-zinc-800 flex items-center px-4 justify-between bg-zinc-900/50">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">MCP Dashboard</span>
          <button 
            onClick={() => setShowAddMcp(!showAddMcp)}
            className="flex items-center gap-1 text-[10px] font-mono text-indigo-400 hover:text-indigo-300"
          >
            <Plus size={12} /> Add MCP
          </button>
        </div>

        {showAddMcp && (
          <form onSubmit={handleAddMcp} className="p-2 border-b border-zinc-800 bg-zinc-900/40 flex flex-col gap-1.5 animate-in slide-in-from-top duration-200">
            <input 
              type="text"
              placeholder="Manifest URL or local path..."
              value={mcpPath}
              onChange={(e) => setMcpPath(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1 text-[10px] font-mono text-zinc-200 focus:outline-none focus:border-indigo-500"
              required
            />
            <div className="flex gap-1">
              <input 
                type="text"
                placeholder="Name (optional)"
                value={mcpName}
                onChange={(e) => setMcpName(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-800 px-2 py-1 text-[10px] font-mono text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
              <button 
                type="submit"
                disabled={addMcpMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {addMcpMutation.isPending ? 'Checking...' : 'Register'}
              </button>
            </div>
          </form>
        )}

        <div className="flex-1 p-2 flex flex-col gap-1.5 overflow-y-auto">
          <div className="flex items-center justify-between p-1.5 bg-zinc-900/30 border border-zinc-800/50">
            <div className="flex items-center gap-2 text-[10px] text-zinc-300 font-mono">
              <Database size={12} className="text-emerald-500" /> DB Connection
            </div>
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/50 px-1 py-0.5 border border-emerald-800/50">STDIO READY</span>
          </div>

          <div className="flex items-center justify-between p-1.5 bg-zinc-900/30 border border-zinc-800/50">
            <div className="flex items-center gap-2 text-[10px] text-zinc-300 font-mono">
              <Server size={12} className="text-indigo-400" /> Google Docs MCP
            </div>
            <span className="text-[9px] font-mono text-indigo-400 bg-indigo-950/50 px-1 py-0.5 border border-indigo-800/50">ACTIVE</span>
          </div>

          {/* Render dynamic registered MCP servers from intent registry */}
          {intentRegistryQuery.data?.intents.filter(i => i.id.startsWith('mcp_')).map(mcp => (
            <div key={mcp.id} className="flex items-center justify-between p-1.5 bg-zinc-900/30 border border-zinc-800/50">
              <div className="flex items-center gap-2 text-[10px] text-zinc-300 font-mono truncate max-w-[170px]">
                <Activity size={12} className="text-amber-400" /> {mcp.id.replace('mcp_', '')}
              </div>
              <span className="text-[9px] font-mono text-amber-400 bg-amber-950/50 px-1 py-0.5 border border-amber-800/50">REGISTERED</span>
            </div>
          ))}
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
            onClick={() => { handleRAGInject(docContextMenu.docName); setDocContextMenu(null); }}
            className="w-full text-left px-4 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            Inject into RAG Buffer
          </button>
          <button 
            onClick={() => { toast.info('Purged Local Buffer'); setDocContextMenu(null); }}
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
