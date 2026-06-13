import React, { useState, useEffect, useMemo, useRef } from "react";
import { Table, Plus, RefreshCw, Trash2, Database, Upload, Download, Columns, Lock } from "lucide-react";
import { trpc } from "../utils/trpc.js";
import { UniversalDataGrid } from "./UniversalDataGrid.js";

export const DatabaseBrowser: React.FC<{ showCreateTable?: boolean; id?: string }> = ({
  showCreateTable = false,
  id,
}) => {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddCol, setShowAddCol] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState("TEXT");
  const [isProtected, setIsProtected] = useState(false);

  const importFileRef = useRef<HTMLInputElement>(null);
  const createFileRef = useRef<HTMLInputElement>(null);

  // VFS API interactions
  const listVfsQuery = trpc.vfs.list.useQuery(
    { path: "." },
    { refetchInterval: 5000 } // Auto-refresh for new JSON files
  );

  const readFileQuery = trpc.vfs.read.useQuery(
    { path: selectedTable || "" },
    { enabled: !!selectedTable }
  );

  const writeFileMutation = trpc.vfs.write.useMutation();

  // Extract tables from VFS (filtering only .json files)
  const tables = useMemo(() => {
    if (!listVfsQuery.data) return [];
    return listVfsQuery.data
      .filter((file: any) => file.name.endsWith(".json"))
      .map((file: any) => file.name);
  }, [listVfsQuery.data]);

  // Parse table data from JSON content
  const tableData = useMemo(() => {
    if (!readFileQuery.data?.content) return [];
    try {
      const parsed = JSON.parse(readFileQuery.data.content);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse table JSON", e);
      return [];
    }
  }, [readFileQuery.data]);

  const columns = useMemo(() => {
    if (tableData.length > 0) {
      return Object.keys(tableData[0]);
    }
    return [];
  }, [tableData]);

  const handleCreateNewTableClick = () => {
    const tableName = prompt("Enter new JSON file name (e.g., users.json):");
    if (tableName) {
      const validName = tableName.endsWith(".json") ? tableName : `${tableName}.json`;
      writeFileMutation.mutate(
        { path: validName, content: "[]" },
        {
          onSuccess: () => {
            listVfsQuery.refetch();
            setSelectedTable(validName);
          },
        }
      );
    }
  };

  const handleDropTable = async (tableName: string) => {
    if (confirm(`Are you sure you want to delete ${tableName}?`)) {
       // Since there's no delete in vfs router currently, we can clear the file
       // or rename it to .deleted
       await writeFileMutation.mutateAsync({ path: tableName, content: "[]" });
       setSelectedTable(null);
       listVfsQuery.refetch();
    }
  };

  const handleAddColumn = async () => {
    if (!selectedTable || !newColName) return;
    try {
      const updatedData = tableData.map((row: any) => ({
        ...row,
        [newColName]: null, // Default empty value
      }));
      await writeFileMutation.mutateAsync({
        path: selectedTable,
        content: JSON.stringify(updatedData, null, 2),
      });
      setShowAddCol(false);
      setNewColName("");
      readFileQuery.refetch();
    } catch (error) {
      console.error("Failed to add column", error);
    }
  };

  const handleDropColumn = async (colName: string) => {
    if (!selectedTable) return;
    if (confirm(`Are you sure you want to delete column "${colName}"?`)) {
      try {
        const updatedData = tableData.map((row: any) => {
          const { [colName]: _, ...rest } = row;
          return rest;
        });
        await writeFileMutation.mutateAsync({
          path: selectedTable,
          content: JSON.stringify(updatedData, null, 2),
        });
        readFileQuery.refetch();
      } catch (error) {
        console.error("Failed to drop column", error);
      }
    }
  };

  const handleExport = async () => {
    if (!selectedTable) return;
    const jsonString = JSON.stringify(tableData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedTable;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTable) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        // Verify it's JSON
        JSON.parse(content);
        await writeFileMutation.mutateAsync({
          path: selectedTable,
          content: content,
        });
        readFileQuery.refetch();
      } catch (error) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    if (importFileRef.current) importFileRef.current.value = "";
  };

  return (
    <div className="flex h-full w-full bg-[#09090b] text-zinc-300 font-mono text-xs">
      <input
        type="file"
        ref={importFileRef}
        className="hidden"
        accept=".json"
        onChange={handleFileImport}
      />

      {/* SIDEBAR: Table List */}
      <div className="w-64 border-r border-zinc-800 flex flex-col">
        <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <span className="font-bold flex items-center gap-2">
            <Database size={14} className="text-indigo-400" /> JSON DATA CENTER
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCreateNewTableClick}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
              title="Create New File"
            >
              <Plus size={12} />
            </button>
            <button
              onClick={() => listVfsQuery.refetch()}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
            >
              <RefreshCw size={12} className={listVfsQuery.isFetching ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {tables.map((table: string) => (
            <div
              key={table}
              className={`group flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors ${
                selectedTable === table
                  ? "bg-indigo-900/30 text-indigo-200"
                  : "hover:bg-zinc-800"
              }`}
              onClick={() => setSelectedTable(table)}
            >
              <div className="flex items-center gap-2">
                <Table size={12} />
                <span>{table}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDropTable(table);
                }}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity"
                title="Clear Data"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedTable ? (
          <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/30">
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Table size={14} className="text-indigo-400" />
                {selectedTable}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-500">
                {tableData.length || 0} rows
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 mr-4 border-r border-zinc-800 pr-4">
                <button
                  onClick={() => importFileRef.current?.click()}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                  title="Import JSON"
                >
                  <Upload size={14} />
                </button>
                <button
                  onClick={() => handleExport()}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                  title="Export JSON"
                >
                  <Download size={14} />
                </button>
              </div>
              <button
                onClick={() => setShowAddCol(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-medium transition-colors"
              >
                <Plus size={12} /> ADD KEY
              </button>

              <div className="flex items-center">
                {isEditing && (
                  <span className="text-[10px] text-red-400 animate-pulse mr-2 italic">
                    Click a header to delete
                  </span>
                )}
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`flex items-center gap-1 px-3 py-1.5 border border-zinc-700 rounded text-[10px] transition-colors ${
                    isEditing
                      ? "bg-red-900/20 text-red-400 border-red-900"
                      : "hover:bg-zinc-800"
                  }`}
                >
                  <Trash2 size={12} />{" "}
                  {isEditing ? "DONE EDITING" : "REMOVE KEYS"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
            <Database size={48} className="mb-4 opacity-20" />
            <p>Select a JSON file to edit schema</p>
          </div>
        )}

        {/* DATA GRID AREA */}
        <div className="flex-1 overflow-hidden relative">
          {selectedTable && (
            <UniversalDataGrid
              data={tableData}
              headers={columns}
              isDeletable={isEditing}
              onHeaderClick={(col) => {
                if (isEditing) handleDropColumn(col);
              }}
            />
          )}
        </div>
      </div>

      {/* ADD COLUMN MODAL */}
      {showAddCol && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-lg w-96 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Columns size={16} className="text-indigo-400" /> Add Key to{" "}
              {selectedTable}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase text-zinc-500 mb-1">
                  Key Name
                </label>
                <input
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white focus:border-indigo-500 outline-none"
                  placeholder="e.g. is_active"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-zinc-500 mb-1">
                  Data Type (for reference)
                </label>
                <select
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded text-sm text-white focus:border-indigo-500 outline-none"
                >
                  <option value="TEXT">TEXT (String)</option>
                  <option value="BOOLEAN">BOOLEAN (True/False)</option>
                  <option value="INTEGER">INTEGER (Number)</option>
                  <option value="JSONB">JSON (Complex Data)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800 mt-2">
                <input
                  type="checkbox"
                  id="prot"
                  checked={isProtected}
                  onChange={(e) => setIsProtected(e.target.checked)}
                  className="accent-amber-500"
                />
                <label
                  htmlFor="prot"
                  className="text-[10px] uppercase text-zinc-400 cursor-pointer select-none"
                >
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
                onClick={handleAddColumn}
                disabled={!newColName}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold"
              >
                Create Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
