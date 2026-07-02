import React, { useState } from 'react';
import { Folder, FolderPlus, FilePlus, Shield, ChevronRight, ChevronDown, Trash2, Link, Layers, Plus } from 'lucide-react';
import { useProjectStore, type ProjectNode } from '../../stores/project.store.js';
import { toast } from 'sonner';

export function ProjectManagerCard() {
  const { projects, activeProjectId, createProject, deleteProject, setActiveProject, attachDocToProject, addProjectScopedRole } = useProjectStore();
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [newDocPath, setNewDocPath] = useState('');
  const [newRoleName, setNewRoleName] = useState('');

  const handleCreate = () => {
    if (!newProjectName.trim()) return;
    const created = createProject(newProjectName.trim(), selectedParentId);
    toast.success(`Created project node "${created.name}"`);
    setNewProjectName('');
  };

  const handleAttachDoc = () => {
    if (!activeProjectId || !newDocPath.trim()) return;
    attachDocToProject(activeProjectId, newDocPath.trim());
    toast.success(`Attached document "${newDocPath}"`);
    setNewDocPath('');
  };

  const handleAddRole = () => {
    if (!activeProjectId || !newRoleName.trim()) return;
    addProjectScopedRole(activeProjectId, {
      id: `role-${Date.now()}`,
      name: newRoleName.trim(),
      systemPrompt: `Scoped role for ${projects[activeProjectId]?.name}`
    });
    toast.success(`Added scoped role "${newRoleName}"`);
    setNewRoleName('');
  };

  const rootProjects = Object.values(projects).filter(p => !p.parentId);

  const renderTree = (node: ProjectNode, level: number = 0) => {
    const isSelected = activeProjectId === node.id;
    const children = (node.childrenIds || []).map(cid => projects[cid]).filter(Boolean);

    return (
      <div key={node.id} className="space-y-1">
        <div 
          onClick={() => setActiveProject(node.id)}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          className={`flex items-center justify-between py-1.5 pr-2 rounded cursor-pointer text-xs font-mono transition-colors ${
            isSelected ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'hover:bg-zinc-900 text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Folder size={14} className={isSelected ? 'text-indigo-400' : 'text-zinc-500'} />
            <span className="truncate font-bold">{node.name}</span>
            {node.attachedDocs.length > 0 && (
              <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded font-mono">
                {node.attachedDocs.length} doc{node.attachedDocs.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedParentId(node.id); }}
              title="Add Sub-Project (Inherits Settings)"
              className="p-1 hover:text-indigo-400 text-zinc-600"
            >
              <FolderPlus size={12} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); deleteProject(node.id); }}
              title="Delete Project Node"
              className="p-1 hover:text-red-400 text-zinc-600"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {children.length > 0 && (
          <div className="space-y-1">
            {children.map(child => renderTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const activeProject = activeProjectId ? projects[activeProjectId] : null;

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 font-sans text-zinc-100 overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-indigo-400" />
          <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Project Tree Manager</span>
        </div>
        <span className="text-[10px] font-mono text-zinc-500 uppercase">OS Directory Architecture</span>
      </div>

      <div className="flex-1 overflow-hidden flex flex-row">
        {/* Left: Directory Tree */}
        <div className="w-1/2 border-r border-zinc-800 flex flex-col bg-zinc-950 p-3 overflow-y-auto custom-scrollbar">
          {/* New Project Creator */}
          <div className="mb-4 space-y-2 p-2 bg-zinc-900/50 border border-zinc-800 rounded">
            <div className="text-[10px] font-bold text-indigo-400 uppercase">
              {selectedParentId ? `New Sub-Project under "${projects[selectedParentId]?.name}"` : 'New Root Directory'}
            </div>
            <div className="flex gap-2">
              <input 
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Folder / Project Name..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 outline-none"
              />
              <button 
                onClick={handleCreate}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded flex items-center gap-1"
              >
                <Plus size={10} /> Create
              </button>
            </div>
            {selectedParentId && (
              <button onClick={() => setSelectedParentId(null)} className="text-[9px] text-zinc-500 hover:underline">
                Clear parent selection (create at root)
              </button>
            )}
          </div>

          {/* Tree View */}
          <div className="flex-1 space-y-1">
            {rootProjects.length === 0 ? (
              <div className="text-center py-10 text-[10px] text-zinc-600 uppercase font-mono tracking-widest">
                No Projects. Create a directory to start.
              </div>
            ) : (
              rootProjects.map(node => renderTree(node, 0))
            )}
          </div>
        </div>

        {/* Right: Selected Node Details & Attachments */}
        <div className="w-1/2 flex flex-col bg-zinc-950 p-4 overflow-y-auto custom-scrollbar space-y-4">
          {activeProject ? (
            <>
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded space-y-2 font-mono">
                <div className="text-xs font-bold text-indigo-400 uppercase">{activeProject.name}</div>
                <div className="text-[10px] text-zinc-500">ID: {activeProject.id}</div>
                <div className="text-[10px] text-zinc-500">Parent: {activeProject.parentId || 'Root Node'}</div>
              </div>

              {/* Attach Doc Section */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1">
                  <Link size={12} className="text-blue-400" /> Attached Documents
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newDocPath}
                    onChange={(e) => setNewDocPath(e.target.value)}
                    placeholder="Doc path e.g. Writing/Script_1.md..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 outline-none"
                  />
                  <button 
                    onClick={handleAttachDoc}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded"
                  >
                    Attach Doc
                  </button>
                </div>
                <div className="space-y-1 font-mono text-xs">
                  {activeProject.attachedDocs.map(doc => (
                    <div key={doc} className="p-2 bg-zinc-900 border border-zinc-800 rounded flex justify-between items-center text-zinc-300">
                      <span>📄 {doc}</span>
                    </div>
                  ))}
                  {activeProject.attachedDocs.length === 0 && (
                    <div className="text-[10px] text-zinc-600">No documents attached yet.</div>
                  )}
                </div>
              </div>

              {/* Scoped Roles Section */}
              <div className="space-y-2 pt-2 border-t border-zinc-900">
                <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1">
                  <Shield size={12} className="text-emerald-400" /> Project-Scoped Roles
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="Scoped Role Name..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 outline-none"
                  />
                  <button 
                    onClick={handleAddRole}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded"
                  >
                    Add Role
                  </button>
                </div>
                <div className="space-y-1 font-mono text-xs">
                  {activeProject.projectScopedRoles.map(role => (
                    <div key={role.id} className="p-2 bg-zinc-900 border border-zinc-800 rounded text-emerald-400 font-bold">
                      🛡️ {role.name}
                    </div>
                  ))}
                  {activeProject.projectScopedRoles.length === 0 && (
                    <div className="text-[10px] text-zinc-600">No project-scoped roles configured.</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 text-[10px] uppercase font-mono tracking-widest">
              Select a project node on the left to inspect details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
