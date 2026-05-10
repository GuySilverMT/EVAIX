
import { useBuilderStore } from '../../../stores/builder.store.js';
import { ComponentManifest, type PropSchema } from '../../../nebula/registry.js';
import { type NebulaTree, type NebulaNode } from '@repo/nebula';
import { Trash2 } from 'lucide-react';

interface PropertyPanelProps {
  tree: NebulaTree;
  setTree: (t: NebulaTree) => void;
}

export const PropertyPanel = ({ tree, setTree }: PropertyPanelProps) => {
  const { selectedNodeId, setSelectedNodeId } = useBuilderStore();
  const node = selectedNodeId ? tree.nodes[selectedNodeId] : null;
  
  if (!node) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-600 text-[10px] uppercase tracking-widest">
        Select a Node
      </div>
    );
  }

  const def = (node.componentName && ComponentManifest[node.componentName]) || ComponentManifest[node.type] || ComponentManifest['Box'];

  const handleChange = (key: string, value: unknown) => {
     const newTree = { ...tree, nodes: { ...tree.nodes } };
     if (!newTree.nodes[node.id].props) newTree.nodes[node.id].props = {};
     newTree.nodes[node.id] = {
         ...newTree.nodes[node.id],
         props: { ...newTree.nodes[node.id].props, [key]: value }
     };
     setTree(newTree);
  };

  const handleDelete = () => {
    if (node.id === tree.rootId) return;
    const newTree = { ...tree, nodes: { ...tree.nodes } };
    
    // Find parent and remove from children
    Object.keys(newTree.nodes).forEach(id => {
        const p = newTree.nodes[id];
        if ((p.children as (string | object)[] | undefined)?.includes(node.id)) {
            newTree.nodes[id] = {
                ...p,
                children: (p.children as (string | NebulaNode)[]).filter(cid => (typeof cid === 'string' ? cid : cid.id) !== node.id) as string[]
            };
        }
    });

    delete newTree.nodes[node.id];
    setTree(newTree);
    setSelectedNodeId(null);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-925">
       <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
          <div>
            <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter">{node.componentName || node.type}</div>
            <div className="text-[10px] font-mono text-zinc-500 truncate w-32">{node.id}</div>
          </div>
          <button onClick={handleDelete} className="text-zinc-600 hover:text-red-400 p-1.5 transition-colors">
             <Trash2 size={12} />
          </button>
       </div>

       <div className="flex-1 overflow-y-auto p-4 space-y-6 thin-scrollbar">
          {/* Props Form */}
          <div className="space-y-4">
              {def && Object.entries(def.propSchema).map(([key, schema]: [string, PropSchema]) => (
                <div key={key} className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight ml-1">{key}</label>
                    
                    {schema.type === 'string' && (
                    <input 
                        type="text"
                        value={node.props[key] || ''}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 focus:border-indigo-500 outline-none transition-all"
                    />
                    )}

                    {schema.type === 'select' && (
                    <select
                        value={node.props[key] || schema.defaultValue}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 focus:border-indigo-500 outline-none transition-all"
                    >
                        {schema.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    )}
                </div>
              ))}
          </div>

          {/* Raw Editor for everything else */}
          <div className="pt-6 border-t border-zinc-800 mt-6">
             <div className="text-[9px] font-bold text-zinc-600 uppercase mb-3 ml-1">Properties JSON</div>
             <textarea 
               className="w-full h-48 bg-zinc-950 border border-zinc-800 rounded p-3 text-[10px] font-mono text-zinc-500 focus:text-zinc-300 focus:border-zinc-700 outline-none transition-all resize-none"
               value={JSON.stringify(node.props, null, 2)}
               onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    const newTree = { ...tree, nodes: { ...tree.nodes } };
                    newTree.nodes[node.id] = { ...newTree.nodes[node.id], props: parsed };
                    setTree(newTree);
                  } catch {
                    // Ignore parse errors
                  }
               }}
             />
          </div>
       </div>
    </div>
  );
};
