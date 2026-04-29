import React, { useCallback, useState } from 'react';
import ReactFlow, {
    addEdge, Background, Controls, type Connection,
    useNodesState, useEdgesState, ReactFlowProvider,
    Panel, Handle, Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { trpc } from '../utils/trpc.js';
import { Database, Table as TableIcon, Plus, Maximize, Minimize, Terminal, FileJson } from 'lucide-react';
import { UniversalDataGrid } from './UniversalDataGrid.js';
import { cn } from '@/lib/utils.js';
import { SuperAiButton } from './ui/SuperAiButton.js';

// --- CUSTOM NODES ---

const TableNode = ({ data, id: _id }: { data: { tableName: string; columns: string[] }, id: string }) => {
    const [expanded, setExpanded] = useState(false);

    // Fetch schema and sample data on expansion
    const { data: schema } = trpc.schema.getTableSchema.useQuery(
        { tableName: data.tableName },
        { enabled: expanded }
    );

    const { data: rows } = trpc.schema.getTableData.useQuery(
        { tableName: data.tableName, limit: 10 },
        { enabled: expanded }
    );

    return (
        <div className={cn(
            "bg-zinc-900 border transition-all duration-300 shadow-xl overflow-hidden",
            expanded ? "w-[600px] h-[400px] border-blue-500/50 rounded-lg z-50" : "w-48 h-auto border-zinc-700/50 rounded-md"
        )}>
            {/* Header / Title Bar */}
            <div className="flex items-center justify-between p-2 bg-zinc-950 border-b border-zinc-800">
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="p-1 bg-blue-500/10 text-blue-400 rounded">
                        <TableIcon size={12} />
                    </div>
                    <span className="text-xs font-bold text-zinc-200 truncate">{data.tableName}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="p-1 text-zinc-500 hover:text-white hover:bg-white/10 rounded transition-colors"
                    >
                        {expanded ? <Minimize size={10} /> : <Maximize size={10} />}
                    </button>
                </div>
            </div>

            {/* Expanded: Full Grid */}
            {expanded && (
                <div className="h-[calc(100%-36px)] bg-zinc-900 overflow-auto p-2">
                    {schema && rows ? (
                        <UniversalDataGrid
                            data={rows.rows}
                            headers={schema.map((c: { name: string }) => c.name) || []}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-zinc-500 text-xs animate-pulse">
                            Loading Data...
                        </div>
                    )}
                </div>
            )}

            {/* Collapsed: Schema Ports */}
            {!expanded && (
                <div className="p-2 space-y-1">
                    {data.columns?.slice(0, 5).map((col: string, _i: number) => (
                        <div key={col} className="relative flex items-center justify-between group">
                            <span className="text-[10px] text-zinc-400 font-mono pl-2">{col}</span>
                            {/* Handles for connecting columns */}
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={`source-${col}`}
                                className="!w-2 !h-2 !bg-zinc-700 !border-none group-hover:!bg-blue-500 transition-colors"
                            />
                            <Handle
                                type="target"
                                position={Position.Left}
                                id={`target-${col}`}
                                className="!w-2 !h-2 !bg-zinc-700 !border-none group-hover:!bg-blue-500 transition-colors"
                            />
                        </div>
                    ))}
                    {data.columns?.length > 5 && (
                        <div className="text-[9px] text-zinc-600 pl-2 italic">+{data.columns.length - 5} more...</div>
                    )}
                </div>
            )}
        </div>
    );
};

const nodeTypes = {
    tableNode: TableNode,
};

// --- MAIN CANVAS COMPONENT ---

export const DbNodeCanvas = ({
    orgMode: _orgMode = false,
    schemaMode: _schemaMode = false,
    showColumnHeaders: _showColumnHeaders = false,
}: {
    orgMode?: boolean;
    schemaMode?: boolean;
    showColumnHeaders?: boolean;
}) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Fetch Tables List for Sidebar
    const { data: tables } = trpc.schema.getTables.useQuery();

    // Add Table to Canvas Logic
    const addTableToCanvas = (tableName: string, _event: React.DragEvent | React.MouseEvent) => {
        // Logic to drop node at cursor would go here, simplified for now
        const id = `${tableName}-${Date.now()}`;
        // In a real implementation we'd fetch columns first or optimistically load them
        const newNode = {
            id,
            type: 'tableNode',
            position: { x: 100 + nodes.length * 20, y: 100 + nodes.length * 20 },
            data: { tableName, columns: ['id', 'created_at', 'name', 'status'] }, // Mock cols for immediate feedback
        };
        setNodes((nds) => nds.concat(newNode));
    };

    const onConnect = useCallback((params: Connection) => {
        console.log("Connecting:", params);
        // Trigger AI Logic Here?
        setEdges((eds) => addEdge({
            ...params,
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 2 },
            label: 'JOIN' // Just a visual label for now
        }, eds));
    }, [setEdges]);

    return (
        <div className="flex h-full w-full bg-zinc-950 overflow-hidden font-sans">

            {/* 1. LEFT SIDEBAR: "THE CROSS" Source */}
            <div className="w-64 border-r border-zinc-800 bg-zinc-900/50 flex flex-col z-20 backdrop-blur-sm">
                <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                    <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Data Sources</h2>
                    <button className="p-1 hover:bg-white/10 rounded"><Database size={14} className="text-zinc-500" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    <div className="text-[10px] text-zinc-500 font-bold px-2 py-1 uppercase">Postgres Tables</div>
                    {tables?.map((table: string) => (
                        <div
                            key={table}
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData('application/reactflow/table', table)}
                            onClick={(e) => addTableToCanvas(table, e)}
                            className="flex items-center gap-2 p-2 rounded hover:bg-white/5 cursor-move group transition-colors border border-transparent hover:border-zinc-700/50"
                        >
                            <TableIcon size={12} className="text-zinc-500 group-hover:text-blue-400" />
                            <span className="text-xs text-zinc-300 group-hover:text-white">{table}</span>
                            <Plus size={10} className="ml-auto opacity-0 group-hover:opacity-100 text-zinc-500" />
                        </div>
                    ))}
                </div>

                {/* Assets Section Mock */}
                <div className="border-t border-zinc-800 p-2">
                    <div className="flex items-center justify-between px-2 py-1">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">Assets</span>
                        <FileJson size={12} className="text-zinc-600" />
                    </div>
                    <div className="p-2 border border-dashed border-zinc-700 rounded text-center text-[10px] text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 cursor-pointer transition-all">
                        Drag & Drop JSON/CSV
                    </div>
                </div>
            </div>

            {/* 2. MAIN CANVAS */}
            <div className="flex-1 relative h-full w-full">
                <ReactFlowProvider>
                    {/* @ts-expect-error Types mismatch in rapid dev */}
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        nodeTypes={nodeTypes} // Register TableNode
                        fitView
                        className="bg-zinc-950"
                    >
                        <Background color="#27272a" gap={24} size={1} />
                        <Controls className="bg-zinc-900 border-zinc-800 fill-zinc-400" />

                        {/* 3. CONTEXT OVERLAY */}
                        <Panel position="top-right" className="m-4">
                            <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1.5 rounded-full shadow-xl">
                                    <SuperAiButton contextId="Active Graph: 3 Tables Joined" />
                                </div>
                                {edges.length > 0 && (
                                    <div className="flex items-center gap-2 animate-in slide-in-from-right fade-in">
                                        <span className="text-xs text-blue-400 font-mono">Join detected...</span>
                                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded shadow-lg shadow-blue-900/20 transition-all">
                                            <Terminal size={12} />
                                            Generate SQL
                                        </button>
                                    </div>
                                )}
                            </div>
                        </Panel>
                    </ReactFlow>
                </ReactFlowProvider>
            </div>

        </div>
    );
};
