import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Folder, LayoutGrid, Code, FileText, Globe, Layers, Cpu, Server, X, ChevronRight, ArrowUp, HardDrive, Database } from 'lucide-react';
import { trpc } from '../utils/trpc.js';
import { useWorkspaceStore } from '../stores/workspace.store.js';
import { Button } from '../components/ui/button.js';
import { toast } from 'sonner';

export default function ProjectDashboard() {
  const navigate = useNavigate();
  const { 
    setActiveWorkspaceId, 
    setProjectType, 
    setProjectName,
    setCards,
    recentProjects, 
    addRecentProject 
  } = useWorkspaceStore();

  const [pickerPath, setPickerPath] = useState('/home/guy');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isInitOpen, setIsInitOpen] = useState(false);

  // Form state for project initialization
  const [initName, setInitName] = useState('');
  const [initType, setInitType] = useState<'CODE' | 'WRITE' | 'RESEARCH' | 'DEPLOY'>('CODE');

  // VFS list query for the picker path
  const vfsListQuery = trpc.vfs.list.useQuery({ path: pickerPath }, { enabled: isPickerOpen });
  const utils = trpc.useUtils();

  const folders = useMemo(() => {
    if (!vfsListQuery.data) return [];
    return (vfsListQuery.data as any[])
      .filter((file: any) => file.type === 'directory')
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [vfsListQuery.data]);

  const getBasename = (path: string) => path.split('/').pop() || path;

  const handleGoUp = () => {
    const parts = pickerPath.split('/');
    if (parts.length > 2) {
      parts.pop();
      setPickerPath(parts.join('/'));
    } else {
      setPickerPath('/');
    }
  };

  const handleOpenFolder = async (path: string) => {
    try {
      // Try reading .evaix/project.json
      const configRes = await utils.vfs.read.fetch({ path: `${path}/.evaix/project.json` });
      const config = JSON.parse(configRes.content);

      // Hydrate workspace store
      setActiveWorkspaceId(path);
      if (config.projectType) setProjectType(config.projectType);
      if (config.name) setProjectName(config.name);
      if (typeof config.columns === 'number') useWorkspaceStore.getState().setColumns(config.columns);
      if (Array.isArray(config.cards)) setCards(config.cards);

      addRecentProject(path);
      toast.success(`Loaded workspace: ${config.name || 'Unnamed'}`);
      setIsPickerOpen(false);
      navigate(`/workspace/${encodeURIComponent(path)}`);
    } catch (err) {
      // If reading failed, prompt to initialize!
      setPickerPath(path);
      setInitName(path.split('/').pop() || '');
      setIsPickerOpen(false);
      setIsInitOpen(true);
    }
  };

  const handleInitialize = async () => {
    if (!initName.trim()) {
      toast.error('Project name is required');
      return;
    }

    const projectPath = pickerPath;

    // Default cards structure based on project type
    let defaultCards: any[] = [];
    if (initType === 'CODE') {
      defaultCards = [
        { id: '1', roleId: '', column: 0, screenspaceId: 1, metadata: { viewMode: 'files' } },
        { id: '2', roleId: '', column: 1, screenspaceId: 1, metadata: { viewMode: 'editor' } },
        { id: '3', roleId: '', column: 2, screenspaceId: 1, metadata: { viewMode: 'browser' } },
      ];
    } else if (initType === 'DEPLOY') {
      defaultCards = [
        { id: '1', roleId: '', column: 0, screenspaceId: 1, metadata: { viewMode: 'terminal' } },
        { id: '2', roleId: '', column: 1, screenspaceId: 1, metadata: { viewMode: 'terminal' } },
        { id: '3', roleId: '', column: 2, screenspaceId: 1, metadata: { viewMode: 'terminal' } },
      ];
    } else {
      defaultCards = [
        { id: '1', roleId: '', column: 0, screenspaceId: 1, metadata: { viewMode: 'files' } },
        { id: '2', roleId: '', column: 1, screenspaceId: 1, metadata: { viewMode: 'editor' } },
        { id: '3', roleId: '', column: 2, screenspaceId: 1, metadata: { viewMode: 'browser' } },
      ];
    }

    const projectConfig = {
      name: initName.trim(),
      projectType: initType,
      columns: 3,
      cards: defaultCards
    };

    try {
      // Write project.json
      await utils.client.vfs.write.mutate({
        path: `${projectPath}/.evaix/project.json`,
        content: JSON.stringify(projectConfig, null, 2),
        provider: 'local'
      });

      // Create data dir
      await utils.client.vfs.mkdir.mutate({
        path: `${projectPath}/.evaix/data`,
        provider: 'local'
      });

      // Hydrate workspace store
      setActiveWorkspaceId(projectPath);
      setProjectName(initName.trim());
      setProjectType(initType);
      useWorkspaceStore.getState().setColumns(3);
      setCards(defaultCards);

      addRecentProject(projectPath);
      toast.success(`Initialized workspace in ${initName}`);
      setIsInitOpen(false);
      navigate(`/workspace/${encodeURIComponent(projectPath)}`);
    } catch (err: any) {
      toast.error('Failed to initialize workspace', { description: err.message });
    }
  };

  const getProjectIcon = (type: string) => {
    switch (type) {
      case 'CODE':
        return <Code size={20} className="text-cyan-400 animate-pulse" />;
      case 'WRITE':
        return <FileText size={20} className="text-amber-400" />;
      case 'RESEARCH':
        return <Globe size={20} className="text-emerald-400 animate-pulse" />;
      case 'DEPLOY':
        return <Server size={20} className="text-rose-400" />;
      default:
        return <Folder size={20} className="text-indigo-400" />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col font-sans select-none relative overflow-hidden">
      {/* Decorative gradient glowing orb */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      {/* Grid line overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#1f1f23_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Header */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-900/40 backdrop-blur-md flex items-center justify-between px-8 z-10">
        <div className="flex items-center gap-3">
          <Layers className="text-indigo-500 w-6 h-6 animate-pulse" />
          <h1 className="text-sm font-black uppercase tracking-[0.25em] bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
            EVAIX Workspace Manager
          </h1>
        </div>
        <Button
          onClick={() => setIsPickerOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 hover:shadow-[0_0_15px_rgba(79,70,229,0.4)] text-white text-[10px] font-bold uppercase tracking-wider h-9 px-4 transition-all duration-300 rounded-sm"
        >
          <Folder size={14} className="mr-1.5" /> Open Directory
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-10 z-10 overflow-y-auto">
        <div className="mb-8 flex flex-col gap-2">
          <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <LayoutGrid size={18} className="text-indigo-400" />
            Recent Workspaces
          </h2>
          <p className="text-xs text-zinc-400 font-mono">
            Directly loading project settings, columns, and cards state from local folders.
          </p>
        </div>

        {/* Workspaces Grid */}
        {!recentProjects || recentProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-lg py-20 bg-zinc-900/10 backdrop-blur-sm">
            <Folder size={48} className="text-zinc-600 mb-4 animate-bounce" />
            <h3 className="text-sm font-bold text-zinc-400 mb-1">No Recent Workspaces</h3>
            <p className="text-[10px] text-zinc-500 mb-6 font-mono">Select a folder on your system to load or initialize EVAIX.</p>
            <Button
              onClick={() => setIsPickerOpen(true)}
              className="bg-indigo-600/20 border border-indigo-500/50 hover:bg-indigo-600 text-indigo-400 hover:text-white text-[10px] font-bold uppercase tracking-wider h-8 px-4 transition-all rounded-sm"
            >
              <Folder size={12} className="mr-1.5" /> Select Local Folder
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentProjects.map((projPath) => {
              const baseName = getBasename(projPath);
              return (
                <div
                  key={projPath}
                  onClick={() => handleOpenFolder(projPath)}
                  className="group cursor-pointer border border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/60 hover:shadow-[0_0_25px_rgba(0,0,0,0.4)] hover:shadow-indigo-500/5 rounded-lg p-5 flex flex-col transition-all duration-300 transform hover:-translate-y-1 relative"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-indigo-500/50 transition-colors">
                      <Folder size={20} className="text-indigo-400" />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate max-w-[180px]">
                        {baseName}
                      </h3>
                      <span className="text-[9px] text-zinc-500 font-mono truncate max-w-[180px]" title={projPath}>
                        {projPath}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Directory Picker Modal */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900/95 border border-zinc-800 w-full max-w-lg rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-950">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-300 flex items-center gap-2">
                <HardDrive size={14} className="text-indigo-500" />
                Select Workspace Directory
              </h3>
              <button
                onClick={() => setIsPickerOpen(false)}
                className="p-1 hover:bg-zinc-850 rounded text-zinc-500 hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Breadcrumbs & Navigation */}
            <div className="p-4 bg-zinc-900/40 border-b border-zinc-800/60 flex items-center gap-2">
              <Folder size={12} className="text-zinc-500" />
              <span className="text-[10px] font-mono text-zinc-400 break-all select-all flex-1">{pickerPath}</span>
              {pickerPath !== '/' && (
                <button
                  onClick={handleGoUp}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 text-zinc-300 transition-all"
                >
                  <ArrowUp size={10} /> Up
                </button>
              )}
            </div>

            {/* Folder List */}
            <div className="flex-1 overflow-y-auto p-2 min-h-[200px] space-y-0.5 font-mono">
              {vfsListQuery.isLoading ? (
                <div className="h-40 flex flex-col items-center justify-center text-zinc-500 gap-2">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[9px] uppercase tracking-wider">Loading directories...</span>
                </div>
              ) : folders.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-zinc-600 text-[10px]">
                  No subdirectories found
                </div>
              ) : (
                folders.map((dir: any) => (
                  <button
                    key={dir.path}
                    onClick={() => setPickerPath(dir.path)}
                    onDoubleClick={() => handleOpenFolder(dir.path)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-zinc-850 hover:text-white text-zinc-400 text-[11px] flex items-center justify-between group transition-colors"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Folder size={12} className="text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                      {getBasename(dir.path)}
                    </span>
                    <ChevronRight size={10} className="opacity-0 group-hover:opacity-100 text-zinc-600 transition-all" />
                  </button>
                ))
              )}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex justify-end gap-3">
              <Button
                onClick={() => setIsPickerOpen(false)}
                className="bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-[10px] font-bold uppercase tracking-wider h-9 transition-all rounded-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleOpenFolder(pickerPath)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider h-9 px-4 transition-all rounded-sm"
              >
                Open Current Folder
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Initialize Modal */}
      {isInitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-950">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-300 flex items-center gap-2">
                <Folder size={14} className="text-indigo-500" />
                Initialize EVAIX Workspace
              </h3>
              <button
                onClick={() => setIsInitOpen(false)}
                className="p-1 hover:bg-zinc-850 rounded text-zinc-500 hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Target Folder</span>
                <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded text-[10px] font-mono text-zinc-400 break-all">
                  {pickerPath}
                </div>
              </div>

              {/* Project Name */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ecommerce-platform"
                  value={initName}
                  onChange={(e) => setInitName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 outline-none focus:border-indigo-500 transition-colors font-mono"
                />
              </div>

              {/* Project Type */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Project Type</label>
                <select
                  value={initType}
                  onChange={(e) => setInitType(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 outline-none focus:border-indigo-500 transition-colors font-mono cursor-pointer"
                >
                  <option value="CODE">CODE (Engineering & Dev)</option>
                  <option value="WRITE">WRITE (Content & Copy)</option>
                  <option value="RESEARCH">RESEARCH (Web & Discovery)</option>
                  <option value="DEPLOY">DEPLOY (Terminal & Servers)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3 border-t border-zinc-800/60">
                <Button
                  onClick={() => setIsInitOpen(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-[10px] font-bold uppercase tracking-wider h-10 transition-all rounded-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInitialize}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider h-10 transition-all rounded-sm"
                >
                  Initialize
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
