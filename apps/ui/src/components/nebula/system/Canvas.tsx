
import React from 'react';
import { type NebulaTree, type NebulaNode, type NebulaId } from '@repo/nebula';
import { useBuilderStore } from '../../../stores/builder.store.js';
import { ComponentMap } from '../../../nebula/registry.js';
import { cn } from '../../../lib/utils.js';
import { nanoid } from 'nanoid';
import { useBuilderHotkeys } from '../../../hooks/useBuilderHotkeys.js';

interface BuilderCanvasProps {
  tree: NebulaTree;
  setTree: (tree: NebulaTree) => void;
}

export const Canvas = ({ tree, setTree }: BuilderCanvasProps) => {
  const { 
    setSelectedNodeId, 
    selectedNodeId, 
    interactionMode,
    setInteractionMode
  } = useBuilderStore();
  
  const rootNode = tree.nodes[tree.rootId];

  // --- 1. HOTKEY BINDINGS ---
  useBuilderHotkeys({
    delete: () => {
      if (selectedNodeId && selectedNodeId !== tree.rootId) {
        const newTree = { ...tree, nodes: { ...tree.nodes } };
        
        // Find parent and remove from children
        Object.keys(newTree.nodes).forEach(id => {
            const node = newTree.nodes[id];
            if (Array.isArray(node.children)) {
                const children = node.children as (NebulaId | NebulaNode)[];
                const hasChild = children.some(c => (typeof c === 'string' ? c : c.id) === selectedNodeId);
                
                if (hasChild) {
                    newTree.nodes[id] = {
                        ...node,
                        children: (children.filter(c => (typeof c === 'string' ? c : c.id) !== selectedNodeId) as unknown) as NebulaId[] | NebulaNode[]
                    };
                }
            }
        });

        delete newTree.nodes[selectedNodeId];
        setTree(newTree);
        setSelectedNodeId(null);
      }
    },
    escape: () => setSelectedNodeId(null),
    pan: () => setInteractionMode(interactionMode === 'pan' ? 'select' : 'pan')
  });

  // --- 2. GESTURE & CLICK HANDLING ---
  const handleStageClick = (e: React.MouseEvent) => {
    // If we clicked the "Stage" (background), deselect
    e.stopPropagation();
    setSelectedNodeId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const type = e.dataTransfer.getData('nebula/type');
    if (!type) return;

    const newId = nanoid();
    const newNode: NebulaNode = {
      id: newId,
      type: type === 'Box' ? 'Box' : 'Component',
      componentName: type !== 'Box' ? type : undefined,
      props: {},
      style: {},
      children: []
    };

    const newTree = { ...tree, nodes: { ...tree.nodes } };
    newTree.nodes[newId] = newNode;
    if (newTree.nodes[targetId]) {
      const targetNode = newTree.nodes[targetId];
      newTree.nodes[targetId] = {
          ...targetNode,
          children: [...(targetNode.children || []), newId] as unknown as NebulaId[] | NebulaNode[]
      };
    }
    setTree(newTree);
    setSelectedNodeId(newId);
  };

  if (!rootNode) return <div className="p-12 text-zinc-600 text-center">Empty Tree</div>;

  return (
    <div 
      className={cn(
        "w-full min-h-full p-4 relative transition-colors",
        interactionMode === 'pan' && "cursor-grab active:cursor-grabbing",
        interactionMode === 'select' && "cursor-default"
      )}
      onClick={handleStageClick} 
    >
       {/* Recursive Renderer */}
       <RecursiveRenderer 
         nodeId={tree.rootId} 
         tree={tree} 
         onDrop={handleDrop}
       />
    </div>
  );
};

const RecursiveRenderer = ({ nodeId, tree, onDrop }: { nodeId: string, tree: NebulaTree, onDrop: (e: React.DragEvent, id: string) => void }) => {
  const { selectedNodeId, setSelectedNodeId, setHoveredNodeId, hoveredNodeId, interactionMode } = useBuilderStore();
  
  const node = tree.nodes[nodeId];
  if (!node) return null;
  
  const Component = (node.componentName && ComponentMap[node.componentName]) || ComponentMap[node.type] || ComponentMap['Box'];
  
  if (!Component) {
      console.warn(`[RecursiveRenderer] Component not found for: ${node.componentName || node.type}`);
  }

  const isSelected = selectedNodeId === nodeId;
  const isHovered = hoveredNodeId === nodeId;

  const handleNodeClick = (e: React.MouseEvent) => {
    if (interactionMode === 'pan') return; 
    e.stopPropagation(); 
    setSelectedNodeId(nodeId);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const ActualComponent = Component || (({ children }: { children: React.ReactNode }) => <div>{children}</div>);

  const sanitizedProps = Object.entries(node.props || {}).reduce((acc: Record<string, unknown>, [key, value]) => {
    // 🟢 Safety: Never spread 'ref' or 'key' from data into components
    if (key === 'ref' || key === 'key') return acc;

    if (key.startsWith('on') && typeof value === 'string') {
      acc[key] = () => console.log(`[Nebula] Action Triggered (${key}): ${value}`);
    } else {
      acc[key] = value;
    }
    return acc;
  }, {});

  return (
    <div
      onClick={handleNodeClick}
      onContextMenu={handleContextMenu}
      onMouseOver={(e) => { e.stopPropagation(); setHoveredNodeId(nodeId); }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => onDrop(e, nodeId)}
      className={cn(
        "relative transition-all duration-150 border outline-none",
        isSelected ? "border-indigo-500 z-10 bg-indigo-500/5 shadow-[0_0_15px_rgba(99,102,241,0.2)]" : "border-transparent",
        isHovered && !isSelected ? "border-zinc-700 border-dashed" : "",
        node.type === 'Box' ? "min-h-[30px] min-w-[30px]" : "inline-block"
      )}
    >
        {isSelected && (
           <div className="absolute -top-3 -left-px bg-indigo-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-t tracking-widest z-[100] uppercase">
              {node.componentName || node.type}
           </div>
        )}

        <ActualComponent {...sanitizedProps} style={node.style}>
           {Array.isArray(node.children) && (node.children as (string | NebulaNode)[]).map((childOrId) => {
               const childId = typeof childOrId === 'string' ? childOrId : childOrId.id;
               return (
                <RecursiveRenderer 
                    key={childId} 
                    nodeId={childId} 
                    tree={tree} 
                    onDrop={onDrop} 
                />
               );
           })}
           {node.type === 'Box' && (!node.children || (node.children as (string | NebulaNode)[]).length === 0) && (
              <div className="text-[8px] text-zinc-800 p-2 italic select-none pointer-events-none text-center">
                 Drop here
              </div>
           )}
        </ActualComponent>
    </div>
  );
};
