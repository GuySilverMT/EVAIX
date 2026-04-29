import React, { useState, useEffect } from 'react';
import { trpc as api } from '../../../utils/trpc.js';
import { Button } from '../../../components/ui/button.js';
import { Input } from '../../../components/ui/input.js';
import { Label } from '../../../components/ui/label.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card.js';
import { Badge } from '../../../components/ui/badge.js';
import { Alert, AlertDescription } from '../../../components/ui/alert.js';
import { type NodeProps, Handle, Position } from 'reactflow';
import 'reactflow/dist/style.css';

interface Column {
    name: string;
    type: string;
    nullable: boolean;
}

export const SchemaEvolutionNode: React.FC<NodeProps> = ({ id: _id, data: _data }) => {
    const [tableName, setTableName] = useState('ModelCapabilities');
    const [newColumnName, setNewColumnName] = useState('');
    const [newColumnType, setNewColumnType] = useState('TEXT');
    const [draftColumns, setDraftColumns] = useState<string[]>([]);
    const [error, setError] = useState('');

    const { data: columns, refetch: refetchColumns } = api.schema.getTableSchema.useQuery(
        { tableName },
        { enabled: !!tableName }
    );

    const validateSnakeCase = (name: string): boolean => {
        return /^[a-z_][a-z0-9_]*$/.test(name);
    };

    const proposeNewColumn = () => {
        if (!newColumnName.trim()) {
            setError('Column name is required');
            return;
        }

        if (!validateSnakeCase(newColumnName)) {
            setError('Column name must be snake_case (e.g., user_latency_ms)');
            return;
        }

        if (columns?.some((col: Column) => col.name === newColumnName)) {
            setError('Column already exists');
            return;
        }

        setDraftColumns(prev => [...prev, `${newColumnName} ${newColumnType}`]);
        setNewColumnName('');
        setError('');
    };

    const removeDraft = (index: number) => {
        setDraftColumns(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        refetchColumns();
    }, [tableName, refetchColumns]);

    return (
        <Card className="w-80 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg text-zinc-900">
                    🧬 Schema Evolution
                    <Badge variant="secondary" className="text-xs">
                        DRAFTS: {draftColumns.length}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
                {/* Table Selector */}
                <div className="space-y-2">
                    <Label className="text-zinc-700">Target Table</Label>
                    <Input
                        value={tableName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTableName(e.target.value)}
                        className="w-full text-zinc-900"
                    />
                </div>

                {/* Live Columns */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-zinc-700">Live Columns ({columns?.length || 0})</Label>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                        {columns?.map((col: Column) => (
                            <Badge key={col.name} variant="default" className="text-xs mr-1">
                                {col.name}: {col.type} {col.nullable ? '(nullable)' : '(required)'}
                            </Badge>
                        ))}
                        {!columns?.length && (
                            <Alert>
                                <AlertDescription>No columns found. Table may be empty.</AlertDescription>
                            </Alert>
                        )}
                    </div>
                </div>

                {/* Propose New Column */}
                <div className="space-y-3 p-3 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                    <Label className="text-sm font-semibold text-gray-700">Propose New Column</Label>

                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <Label className="text-xs text-zinc-600">Name (snake_case)</Label>
                            <Input
                                value={newColumnName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    setNewColumnName(e.target.value);
                                    setError('');
                                }}
                                className={error ? 'border-red-300 bg-red-50 text-zinc-900' : 'text-zinc-900'}
                                placeholder="e.g., latency_ms"
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-zinc-600">Type</Label>
                            <select
                                value={newColumnType}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewColumnType(e.target.value)}
                                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
                            >
                                <option value="TEXT">TEXT</option>
                                <option value="INTEGER">INTEGER</option>
                                <option value="FLOAT">FLOAT</option>
                                <option value="BOOLEAN">BOOLEAN</option>
                                <option value="JSONB">JSONB</option>
                                <option value="TIMESTAMP">TIMESTAMP</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <Button onClick={proposeNewColumn} size="sm" className="w-full">
                                Propose
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <Alert variant="destructive" className="text-xs">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </div>

                {/* Draft Columns */}
                {draftColumns.length > 0 && (
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-zinc-700">Draft Columns ({draftColumns.length})</Label>
                        <div className="space-y-1">
                            {draftColumns.map((draft, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded">
                                    <span className="text-sm font-mono text-zinc-800">{draft}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeDraft(index)}
                                        className="h-6 w-6 p-0 text-zinc-500 hover:text-zinc-700"
                                    >
                                        ✕
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Node Handles */}
                <div className="flex gap-2 pt-4">
                    <Handle type="target" position={Position.Left} className="bg-blue-400" />
                    <Handle type="source" position={Position.Right} className="bg-green-400" />
                </div>
            </CardContent>
        </Card>
    );
};
