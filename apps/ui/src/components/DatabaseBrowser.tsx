import React, { useState, useMemo, useRef } from 'react';
import { trpc } from '../utils/trpc.js';
import { UniversalDataGrid } from './UniversalDataGrid.js';
import { 
  Database, Table, Plus, Trash2, RefreshCw, 
  Columns, Lock, Download, Upload
} from 'lucide-react';

// A Wrapper for Cell Data that handles Protection
// const ProtectedCell = ... (removed unused)

export const DatabaseBrowser: React.FC<{ showCreateTable?: boolean }> = ({ showCreateTable: _showCreateTable = false }) => {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Queries
  const tablesQuery = trpc.schema.getTables.useQuery();
  const utils = trpc.useContext();

  const dataQuery = trpc.apiExplorer.executeQuery.useQuery(
    { query: `SELECT * FROM "${selectedTable}" LIMIT 100` },
    { enabled: !!selectedTable }
  );

  const schemaQuery = trpc.schema.getTableSchema.useQuery(
    { tableName: selectedTable! }, 
    { enabled: !!selectedTable }
  );

  // Mutations
  const addCol = trpc.schema.addColumn.useMutation({ 
    onSuccess: () => { 
        void utils.apiExplorer.invalidate(); 
        void utils.schema.getTableSchema.invalidate();
        void tablesQuery.refetch(); 
    } 
  });
  const dropCol = trpc.schema.dropColumn.useMutation({
    onSuccess: () => { 
        void utils.apiExplorer.invalidate(); 
        void utils.schema.getTableSchema.invalidate();
    }
  });
  const dropTable = trpc.schema.dropTable.useMutation({
    onSuccess: () => { 
        setSelectedTable(null); 
        void utils.schema.invalidate();
    }
  });


  const importJson = trpc.schema.importJsonToTable.useMutation({
    onSuccess: (data) => {
        alert(`Successfully imported ${data.rowCount} rows!`);
        void utils.apiExplorer.invalidate();
        void tablesQuery.refetch();
    },
    onError: (err) => {
        alert(`Import Failed: ${err.message}`);
    }
  });
  
  const createTableJson = trpc.schema.createTableFromJson.useMutation({
    onSuccess: (data) => {
        alert(`Successfully created table "${data.tableName}" with ${data.rowCount} rows!`);
        void utils.schema.getTables.invalidate();
        setSelectedTable(data.tableName);
    },
    onError: (err) => {
        alert(`Failed to create table: ${err.message}`);
    }
  });

  const exportTable = trpc.schema.exportTable.useMutation({
    onSuccess: (data, variables) => {
        // Trigger Download
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${variables.tableName}-${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
  });

  // Dialog State
  const [showAddCol, setShowAddCol] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState('TEXT');
  const [isProtected, setIsProtected] = useState(false);

  // File Inputs Refs
  const importFileRef = useRef<HTMLInputElement>(null);
  const createFileRef = useRef<HTMLInputElement>(null);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTable) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
        const text = ev.target?.result as string;
        if (text) {
             await importJson.mutateAsync({ 
                tableName: selectedTable, 
                jsonString: text,
                options: { upsertOnConflict: true }
            });
            // Reset input
            if (importFileRef.current) importFileRef.current.value = '';
        }
    };
    reader.readAsText(file);
  };

  const handleFileCreate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Derive table name from filename
    // e.g. "My Data.json" -> "my_data"
    const derivedName = file.name
        .replace(/\.[^/.]+$/, "") // Remove extension
        .replace(/[^a-zA-Z0-9_]/g, "_") // Replace special chars
        .toLowerCase();

    const reader = new FileReader();
    reader.onload = async (ev) => {
        const text = ev.target?.result as string;
        if (text && derivedName) {
            await createTableJson.mutateAsync({
                tableName: derivedName,
                jsonString: text
            });
            // Reset input
            if (createFileRef.current) createFileRef.current.value = '';
        }
    };
    reader.readAsText(file);
  };

  const handleAddColumn = async () => {
    if (!selectedTable || !newColName) return;
    try {
        await addCol.mutateAsync({ 
            tableName: selectedTable, 
            columnName: newColName, 
            type: newColType as "TEXT" | "BOOLEAN" | "INTEGER" | "FLOAT" | "JSONB" | "TIMESTAMP", 
            isProtected
        });
        setShowAddCol(false);
        setNewColName('');
        setIsProtected(false);
    } catch (error) {
        console.error('Failed to add column:', error);
    }
  };

  const handleDropTable = async (table: string) => {
    if (confirm(`Are you sure you want to PERMANENTLY DELETE the table "${table}"?`)) {
        try {
            await dropTable.mutateAsync({ tableName: table });
        } catch (error) {
            console.error('Failed to drop table:', error);
        }
    }
  };

  const handleDropColumn = async (col: string) => {
    if (!selectedTable) return;
    if (confirm(`Drop column "${col}" from ${selectedTable}? Data will be lost.`)) {
        try {
            await dropCol.mutateAsync({ tableName: selectedTable, columnName: col });
        } catch (error) {
            console.error('Failed to drop column:', error);
        }
    }
  };

  const handleCreateNewTableClick = () => {
    createFileRef.current?.click();
  };

  const handleExport = async () => {
    if (!selectedTable) return;
    try {
        await exportTable.mutateAsync({ tableName: selectedTable });
    } catch (error) {
        console.error('Failed to export:', error);
    }
  };



  // Helper to merge Schema Headers with Data Keys
  const columns = useMemo(() => {
    if (schemaQuery.data) return schemaQuery.data.map((c: any) => c.name);
    if (dataQuery.data && dataQuery.data.length > 0) return Object.keys(dataQuery.data[0]);
    return [];
  }, [schemaQuery.data, dataQuery.data]);

  // Transform data to use ProtectedCell where needed
  // const displayData = useMemo(() => { ... }, [dataQuery.data]);

  return (
    <div className="flex h-full w-full bg-[#09090b] text-zinc-300 font-mono text-xs">
      {/* Hidden File Inputs */}
      <input type="file" ref={importFileRef} className="hidden" accept=".json" onChange={handleFileImport} />
      <input type="file" ref={createFileRef} className="hidden" accept=".json" onChange={handleFileCreate} />
      
      {/* SIDEBAR: Table List */}
      <div className="w-64 border-r border-zinc-800 flex flex-col">
        <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <span className="font-bold flex items-center gap-2">
            <Database size={14} className="text-indigo-400"/> SCHEMA
          </span>
          <div className="flex items-center gap-1">
            <button 
                onClick={handleCreateNewTableClick} 
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
                title="Create New Table"
            >
                <Plus size={12} />
            </button>
            <button onClick={() => void tablesQuery.refetch()} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white">
                <RefreshCw size={12} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {tablesQuery.data?.map((table: string) => (
            <div 
                key={table}
                className={`group flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors ${
                    selectedTable === table ? 'bg-indigo-900/30 text-indigo-200' : 'hover:bg-zinc-800'
                }`}
                onClick={() => setSelectedTable(table)}
            >
                <div className="flex items-center gap-2">
                    <Table size={12} />
                    <span>{table}</span>
                </div>
                {/* Delete Table Button (Only visible on hover) */}
                <button 
                    onClick={(e) => { e.stopPropagation(); void handleDropTable(table).catch(console.error); }}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity"
                    title="Drop Table"
                >
                    <Trash2 size={12} />
                </button>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* TOOLBAR */}
        {selectedTable ? (
            <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/30">
                <div className="flex items-center gap-4">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Table size={14} className="text-indigo-400"/>
                        {selectedTable}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-500">
                        {dataQuery.data?.length || 0} rows
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Import/Export */}
                    <div className="flex items-center gap-1 mr-4 border-r border-zinc-800 pr-4">
                        <button 
                            onClick={() => importFileRef.current?.click()}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                            title="Import JSON"
                        >
                            <Upload size={14} />
                        </button>
                        <button 
                            onClick={() => void handleExport()}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                            title="Export JSON"
                        >
                            {exportTable.isLoading ? (
                                <RefreshCw size={14} className="animate-spin" />
                            ) : (
                                <Download size={14} />
                            )}
                        </button>
                    </div>
                    <button 
                        onClick={() => setShowAddCol(true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-medium transition-colors"
                    >
                        <Plus size={12} /> ADD COLUMN
                    </button>
                    
                    <button 
                        onClick={() => setIsEditing(!isEditing)}
                        className={`flex items-center gap-1 px-3 py-1.5 border border-zinc-700 rounded text-[10px] transition-colors ${
                            isEditing ? 'bg-red-900/20 text-red-400 border-red-900' : 'hover:bg-zinc-800'
                        }`}
                    >
                        <Trash2 size={12} /> {isEditing ? 'DONE EDITING' : 'REMOVE COLUMNS'}
                    </button>
                </div>
            </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
                <Database size={48} className="mb-4 opacity-20" />
                <p>Select a table to edit schema</p>
            </div>
        )}

        {/* DATA GRID AREA */}
        <div className="flex-1 overflow-hidden relative">
            {selectedTable && (
                <UniversalDataGrid 
                    data={dataQuery.data as any[] || []} 
                    headers={columns}
                    onColumnMapChange={(col) => {
                        if (isEditing) void handleDropColumn(col);
                    }}
                />
            )}
            
            {/* HACK: Overlay to show 'Delete' buttons on headers if isEditing is true */}
            {isEditing && selectedTable && (
                 <div className="absolute top-2 right-2 px-3 py-1 bg-red-500 text-white text-[10px] rounded shadow-lg pointer-events-none z-50 animate-pulse">
                    Click a column header to DELETE it
                 </div>
            )}
        </div>
      </div>

      {/* ADD COLUMN MODAL */}
      {showAddCol && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-lg w-96 shadow-2xl">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Columns size={16} className="text-indigo-400"/> Add Column to {selectedTable}
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] uppercase text-zinc-500 mb-1">Column Name</label>
                        <input 
                            value={newColName}
                            onChange={e => setNewColName(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white focus:border-indigo-500 outline-none"
                            placeholder="e.g. is_active"
                            autoFocus
                        />
                    </div>
                    
                    <div>
                        <label className="block text-[10px] uppercase text-zinc-500 mb-1">Data Type</label>
                        <select 
                            value={newColType}
                            onChange={e => setNewColType(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white focus:border-indigo-500 outline-none"
                        >
                            <option value="TEXT">TEXT (String)</option>
                            <option value="BOOLEAN">BOOLEAN (True/False)</option>
                            <option value="INTEGER">INTEGER (Number)</option>
                            <option value="FLOAT">FLOAT (Decimal)</option>
                            <option value="JSONB">JSONB (Complex Data)</option>
                            <option value="TIMESTAMP">TIMESTAMP (Date)</option>
                        </select>
                    </div>

                    {/* NEW: Protected Toggle */}
                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-800 mt-2">
                        <input 
                            type="checkbox" 
                            id="prot"
                            checked={isProtected}
                            onChange={e => setIsProtected(e.target.checked)}
                            className="accent-amber-500"
                        />
                        <label htmlFor="prot" className="text-[10px] uppercase text-zinc-400 cursor-pointer select-none">
                            Protect Data (Mask in UI)
                        </label>
                        {isProtected && <Lock size={12} className="text-amber-500" />}
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button 
                        onClick={() => setShowAddCol(false)}
                        className="px-4 py-2 text-zinc-400 hover:text-white text-xs"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => void handleAddColumn()}
                        disabled={!newColName}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold"
                    >
                        Create Column
                    </button>
                </div>
            </div>
        </div>
      )}
      
      {/* IMPORT MODAL REMOVED */}
      {/* CREATE TABLE MODAL REMOVED */}

    </div>
  );
};
