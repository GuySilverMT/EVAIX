import React, { useCallback, useRef } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Connection,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { nanoid } from 'nanoid';
import { ArbitrageNode } from './ArbitrageNode.js';

const nodeTypes = { arbitrageNode: ArbitrageNode };

const initialNodes: Node[] = [
  {
    id: 'target-model-capabilities',
    type: 'arbitrageNode',
    position: { x: 400, y: 200 },
    data: {
      label: 'TARGET: ModelCapabilities',
      columns: ['id', 'provider_id', 'model_name', 'context_length', 'max_output_tokens', 'pricing_input', 'pricing_output', 'is_local', 'created_at'],
      columnMapping: {},
      primaryKey: 'id',
      onColumnMapChange: () => { },
      onColumnToggle: () => { },
      onColumnKey: () => { },
    },
  },
  {
    id: 'source-openrouter',
    type: 'arbitrageNode',
    position: { x: 0, y: 200 },
    data: {
      label: 'SRC: OpenRouter_API',
      columns: ['id', 'model_name', 'context_length', 'pricing_input', 'pricing_output'],
      columnMapping: {},
      primaryKey: undefined,
      onColumnMapChange: () => { },
      onColumnToggle: () => { },
      onColumnKey: () => { },
    },
  }
];
const initialEdges: any[] = [];

const ArbitrageCanvas = ({ reactFlowInstanceRef }: { reactFlowInstanceRef: React.MutableRefObject<any> }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const data = JSON.parse(event.dataTransfer.getData('application/reactflow'));

      // Check if the dropped item is a provider source node
      if (data.type === 'source' && data.provider) {
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        const newNode: Node = {
          id: nanoid(), // Unique ID for the node
          type: 'arbitrageNode', // Custom node type for Phase 2
          position,
          data: {
            label: data.provider.name,
            provider: data.provider,
            columns: [ // Example columns for a provider
              { id: 'col1', name: 'id', isVisible: true, isPrimaryKey: false },
              { id: 'col2', name: 'timestamp', isVisible: true, isPrimaryKey: false },
              { id: 'col3', name: 'value', isVisible: true, isPrimaryKey: false },
              { id: 'col4', name: 'status', isVisible: true, isPrimaryKey: false },
            ],
          },
        };
        setNodes((nds) => nds.concat(newNode));
      }
    },
    [screenToFlowPosition, setNodes],
  );

  // Expose ReactFlow instance via ref for SuperAiButton contextGetter
  reactFlowInstanceRef.current = useReactFlow();

  return (
    <div className="reactflow-wrapper flex-1 h-full w-full" ref={reactFlowWrapper}>
      {/* @ts-expect-error ReactFlow types mismatch in local env */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes} // Register custom node types here
        fitView
      >
        <MiniMap className="bg-[var(--color-background-secondary)]" />
        <Controls className="bg-[var(--color-background-secondary)] text-[var(--color-text)] border-[var(--color-border)] rounded-md">
          <button className="react-flow__controls-button react-flow__controls-zoom-in text-[var(--color-text)] hover:bg-[var(--color-background)]" />
          <button className="react-flow__controls-button react-flow__controls-zoom-out text-[var(--color-text)] hover:bg-[var(--color-background)]" />
          <button className="react-flow__controls-button react-flow__controls-fitview text-[var(--color-text)] hover:bg-[var(--color-background)]" />
          <button className="react-flow__controls-button react-flow__controls-interactive text-[var(--color-text)] hover:bg-[var(--color-background)]" />
        </Controls>
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} className="bg-zinc-800" />
      </ReactFlow>
    </div>
  );
};

const ArbitrageCanvasWrapper = ({ reactFlowInstanceRef }: { reactFlowInstanceRef: React.MutableRefObject<ReturnType<typeof useReactFlow> | null> }) => (
  <ReactFlowProvider>
    <ArbitrageCanvas reactFlowInstanceRef={reactFlowInstanceRef} />
  </ReactFlowProvider>
);

export default ArbitrageCanvasWrapper;