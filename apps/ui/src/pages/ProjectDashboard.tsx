import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Folder, LayoutGrid, Code, FileText, Globe, Layers, Cpu, Server, X } from 'lucide-react';
import { trpc } from '../utils/trpc.js';
import { useWorkspaceStore } from '../stores/workspace.store.js';
import { Button } from '../components/ui/button.js';
import { toast } from 'sonner';

export default function ProjectDashboard() {
  const navigate = useNavigate();
  const { setActiveWorkspaceId, setProjectType, initializeFromWorkspace } = useWorkspaceStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [projectTypeState, setProjectTypeState] = useState<'CODE' | 'WRITE' | 'RESEARCH' | 'DEPLOY'>('CODE');
  const [targetPlatform, setTargetPlatform] = useState<string>('None');

  // Fetch workspaces using the list query
  const { data: workspaces, refetch } = trpc.workspace.list.useQuery();

  // Create workspace mutation
  const createWorkspace = trpc.workspace.create.useMutation({
    onSuccess: (newWorkspace) => {
      toast.success(`Project "${newWorkspace.name}" created!`);
      // Update global store
      setActiveWorkspaceId(newWorkspace.id);
      setProjectType(newWorkspace.projectType);
      initializeFromWorkspace(newWorkspace.projectType);
      
      // Close modal and redirect
      setIsModalOpen(false);
      setName('');
      setProjectTypeState('CODE');
      setTargetPlatform('None');
      navigate(`/workspace/${newWorkspace.id}`);
    },
    onError: (error) => {
      toast.error('Failed to create project', { description: error.message });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Project name is required');
      return;
    }
    createWorkspace.mutate({
      name: name.trim(),
      projectType: projectTypeState,
      targetPlatform: projectTypeState === 'CODE' ? targetPlatform : undefined,
    });
  };

  const handleSelectProject = (ws: any) => {
    setActiveWorkspaceId(ws.id);
    setProjectType(ws.projectType);
    initializeFromWorkspace(ws.projectType);
    navigate(`/workspace/${ws.id}`);
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
            EVAIX Dashboard
          </h1>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 hover:shadow-[0_0_15px_rgba(79,70,229,0.4)] text-white text-[10px] font-bold uppercase tracking-wider h-9 px-4 transition-all duration-300 rounded-sm"
        >
          <Plus size={14} className="mr-1.5" /> Create New Project
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-10 z-10 overflow-y-auto">
        <div className="mb-8 flex flex-col gap-2">
          <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <LayoutGrid size={18} className="text-indigo-400" />
            Projects Fleet
          </h2>
          <p className="text-xs text-zinc-400 font-mono">
            Orchestrating active model contexts and custom agent workspace environments.
          </p>
        </div>

        {/* Projects Grid */}
        {!workspaces || workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-lg py-20 bg-zinc-900/10 backdrop-blur-sm">
            <Folder size={48} className="text-zinc-600 mb-4 animate-bounce" />
            <h3 className="text-sm font-bold text-zinc-400 mb-1">No Projects Found</h3>
            <p className="text-[10px] text-zinc-500 mb-6 font-mono">Get started by creating your first workspace.</p>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600/20 border border-indigo-500/50 hover:bg-indigo-600 text-indigo-400 hover:text-white text-[10px] font-bold uppercase tracking-wider h-8 px-4 transition-all rounded-sm"
            >
              <Plus size={12} className="mr-1.5" /> Initialize Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                onClick={() => handleSelectProject(ws)}
                className="group cursor-pointer border border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/60 hover:shadow-[0_0_25px_rgba(0,0,0,0.4)] hover:shadow-indigo-500/5 rounded-lg p-5 flex flex-col transition-all duration-300 transform hover:-translate-y-1 relative"
              >
                {/* Visual badge top right */}
                <div className="absolute top-4 right-4 text-[9px] font-mono uppercase px-2 py-0.5 rounded border border-zinc-800 bg-zinc-950/80 text-zinc-500 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-colors">
                  {ws.projectType}
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-indigo-500/50 transition-colors">
                    {getProjectIcon(ws.projectType)}
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate max-w-[180px]">
                      {ws.name}
                    </h3>
                    <span className="text-[9px] text-zinc-500 font-mono truncate max-w-[180px]">
                      {ws.rootPath}
                    </span>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                  <span>Created {new Date(ws.createdAt).toLocaleDateString()}</span>
                  {ws.projectType === 'CODE' && ws.targetPlatform && (
                    <span className="flex items-center gap-1 text-cyan-500 bg-cyan-950/20 border border-cyan-800/30 rounded-sm px-1.5 py-0.5">
                      <Cpu size={10} />
                      {ws.targetPlatform}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900/90 border border-zinc-800 w-full max-w-md rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-950">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-300 flex items-center gap-2">
                <Layers size={14} className="text-indigo-500" />
                Create New Project
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-zinc-850 rounded text-zinc-500 hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Project Name */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Project Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. e-commerce-app"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 outline-none focus:border-indigo-500 transition-colors font-mono"
                />
              </div>

              {/* Project Type */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Project Type</label>
                <select
                  value={projectTypeState}
                  onChange={(e) => setProjectTypeState(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 outline-none focus:border-indigo-500 transition-colors font-mono cursor-pointer"
                >
                  <option value="CODE">CODE (Engineering & Dev)</option>
                  <option value="WRITE">WRITE (Content & Copy)</option>
                  <option value="RESEARCH">RESEARCH (Web & Discovery)</option>
                  <option value="DEPLOY">DEPLOY (Terminal & Servers)</option>
                </select>
              </div>

              {/* Target Platform (Only visible if type is CODE) */}
              {projectTypeState === 'CODE' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Target Platform</label>
                  <select
                    value={targetPlatform}
                    onChange={(e) => setTargetPlatform(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 outline-none focus:border-indigo-500 transition-colors font-mono cursor-pointer"
                  >
                    <option value="Web">Web (HTML/JS/React)</option>
                    <option value="Android">Android (Mobile App)</option>
                    <option value="Node">Node.js (Backend Service)</option>
                    <option value="None">None (Generic Sandbox)</option>
                  </select>
                </div>
              )}

              {/* Submit / Cancel Buttons */}
              <div className="flex gap-3 pt-3 border-t border-zinc-800/60">
                <Button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-[10px] font-bold uppercase tracking-wider h-10 transition-all rounded-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createWorkspace.isLoading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white text-[10px] font-bold uppercase tracking-wider h-10 transition-all rounded-sm"
                >
                  {createWorkspace.isLoading ? 'Creating...' : 'Initialize'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
