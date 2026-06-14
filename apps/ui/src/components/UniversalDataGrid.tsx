import React, { useState, useEffect, useMemo } from "react";
import { Trash2, Plus, X, Table, Grid } from "lucide-react";
import { toast } from "sonner";

interface GridProps {
  data: Record<string, unknown>[];
  onChange?: (newData: Record<string, unknown>[]) => void;
  // Backward compatibility props:
  columnMapping?: Record<string, string>;
  onColumnMapChange?: (original: string, mapped: string) => void;
  onHeaderClick?: (column: string) => void;
  headers?: string[];
  isDeletable?: boolean;
  onCreateTable?: () => void;
}

export const UniversalDataGrid: React.FC<GridProps> = ({
  data = [],
  onChange,
  columnMapping = {},
  onColumnMapChange,
  headers = [],
  onCreateTable,
}) => {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizing, setResizing] = useState<{
    column: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Cell & Header editing state
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; column: string } | null>(null);
  const [cellVal, setCellVal] = useState("");
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [tempHeaderVal, setTempHeaderVal] = useState("");

  const columns = useMemo(() => {
    if (headers && headers.length > 0) {
      return headers;
    }
    if (data && data.length > 0) {
      const keys = new Set<string>();
      data.forEach((row) => {
        if (row && typeof row === "object") {
          Object.keys(row).forEach((key) => keys.add(key));
        }
      });
      return Array.from(keys);
    }
    return [];
  }, [data, headers]);

  // Initialize Widths
  useEffect(() => {
    if (columns.length === 0) return;
    setColumnWidths((prev) => {
      const next = { ...prev };
      let changed = false;
      columns.forEach((col) => {
        if (!next[col]) {
          next[col] = 130;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [columns]);

  // Resize Handlers
  const handleMouseDown = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing({
      column,
      startX: e.clientX,
      startWidth: columnWidths[column] || 130,
    });
  };

  useEffect(() => {
    if (!resizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizing.startX;
      setColumnWidths((prev) => ({
        ...prev,
        [resizing.column]: Math.max(50, resizing.startWidth + diff),
      }));
    };
    const handleMouseUp = () => setResizing(null);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizing]);

  // Mutators
  const handleCellSave = (rowIndex: number, column: string, value: string) => {
    setEditingCell(null);
    if (!onChange) return;
    const newData = data.map((row, idx) => {
      if (idx === rowIndex) {
        return { ...row, [column]: value };
      }
      return row;
    });
    onChange(newData);
  };

  const handleAddRow = () => {
    if (!onChange) return;
    const newRow: Record<string, unknown> = {};
    if (columns.length === 0) {
      newRow["Column1"] = "";
    } else {
      columns.forEach((col) => {
        newRow[col] = "";
      });
    }
    onChange([...data, newRow]);
    toast.success("Added new row");
  };

  const handleDeleteRow = (rowIndex: number) => {
    if (!onChange) return;
    const newData = data.filter((_, idx) => idx !== rowIndex);
    onChange(newData);
    toast.info("Deleted row");
  };

  const handleAddColumn = () => {
    if (!onChange) return;
    let index = 1;
    while (columns.includes(`Column${index}`)) {
      index++;
    }
    const newColName = `Column${index}`;
    if (data.length === 0) {
      onChange([{ [newColName]: "" }]);
    } else {
      const newData = data.map((row) => ({
        ...row,
        [newColName]: "",
      }));
      onChange(newData);
    }
    toast.success(`Added column: ${newColName}`);
  };

  const handleRenameColumn = (oldName: string, newName: string) => {
    setEditingHeader(null);
    if (!newName.trim() || oldName === newName) return;
    if (columns.includes(newName)) {
      toast.error("Column name already exists");
      return;
    }
    if (!onChange) {
      if (onColumnMapChange) onColumnMapChange(oldName, newName);
      return;
    }
    const newData = data.map((row) => {
      const { [oldName]: val, ...rest } = row;
      return { ...rest, [newName]: val ?? "" };
    });
    onChange(newData);
    toast.success(`Renamed column ${oldName} to ${newName}`);
  };

  const handleDeleteColumn = (column: string) => {
    if (!onChange) return;
    const newData = data.map((row) => {
      const { [column]: _, ...rest } = row;
      return rest;
    });
    onChange(newData);
    toast.info(`Deleted column: ${column}`);
  };

  const hasData = data && data.length > 0;

  return (
    <div className="h-full w-full flex flex-col bg-zinc-950 border border-zinc-800 rounded-md overflow-hidden text-[11px] font-mono text-zinc-300">
      
      {/* Grid Toolbar */}
      {onChange && (
        <div className="h-9 border-b border-zinc-800 bg-zinc-900/60 px-3 flex items-center justify-between shrink-0 select-none">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
            <Grid size={11} className="text-[var(--color-primary)]" />
            Spreadsheet Editor
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[9px] font-black uppercase tracking-wider transition-all border border-zinc-700"
            >
              <Plus size={10} /> Add Row
            </button>
            <button
              type="button"
              onClick={handleAddColumn}
              className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[9px] font-black uppercase tracking-wider transition-all border border-zinc-700"
            >
              <Plus size={10} /> Add Column
            </button>
          </div>
        </div>
      )}

      {/* Grid Main Area */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        {!hasData && columns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-500 bg-zinc-900/10 p-6">
            <Table size={32} className="text-zinc-650 animate-pulse" />
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Empty Grid</span>
              <span className="text-[10px] text-zinc-600">No active columns or records loaded.</span>
            </div>
            {onChange && (
              <button
                onClick={handleAddColumn}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] text-black rounded text-[9px] font-black uppercase tracking-wider transition-all"
              >
                Create First Column
              </button>
            )}
            {onCreateTable && (
              <button
                onClick={onCreateTable}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-zinc-200 border border-zinc-700 rounded text-[9px] font-black uppercase tracking-wider transition-all"
              >
                Initialize Table
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse table-fixed border-spacing-0">
            <thead className="sticky top-0 bg-zinc-950 border-b border-zinc-800 z-20">
              <tr>
                {/* Actions Column Header */}
                {onChange && (
                  <th className="w-9 px-2 py-1 bg-zinc-900/40 border-r border-zinc-800 text-center text-zinc-500 font-bold uppercase text-[9px]">
                    Act
                  </th>
                )}

                {columns.map((col) => {
                  const mappedName = columnMapping[col] || col;
                  const isMapped = columnMapping[col] && columnMapping[col] !== col;
                  const isEditing = editingHeader === col;

                  return (
                    <th
                      key={col}
                      className={`relative px-2.5 py-1.5 border-r border-zinc-800 group select-none transition-colors hover:bg-zinc-900/40`}
                      style={{ width: columnWidths[col] || 130 }}
                    >
                      <div className="flex items-center justify-between h-full font-bold tracking-tight">
                        {isEditing ? (
                          <input
                            autoFocus
                            className="w-full bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-white outline-none font-mono"
                            value={tempHeaderVal}
                            onChange={(e) => setTempHeaderVal(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleRenameColumn(col, tempHeaderVal);
                              } else if (e.key === "Escape") {
                                setEditingHeader(null);
                              }
                            }}
                            onBlur={() => handleRenameColumn(col, tempHeaderVal)}
                          />
                        ) : (
                          <div
                            className="flex items-center gap-1.5 overflow-hidden w-full"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setEditingHeader(col);
                              setTempHeaderVal(mappedName);
                            }}
                          >
                            <span
                              className={`truncate flex-1 uppercase text-[10px] tracking-wide ${
                                isMapped ? "text-cyan-400" : "text-zinc-400"
                              }`}
                              title={`${col} -> ${mappedName}`}
                            >
                              {mappedName}
                            </span>

                            {onChange && (
                              <button
                                type="button"
                                onClick={() => handleDeleteColumn(col)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-650 hover:text-red-400 transition-all hover:bg-red-500/10"
                                title="Delete Column"
                              >
                                <X size={10} />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Resize Handle */}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-cyan-500/20 z-30 flex justify-center"
                          onMouseDown={(e) => handleMouseDown(e, col)}
                        >
                          <div className="w-px h-full bg-zinc-800 hover:bg-cyan-400 transition-colors" />
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60 bg-zinc-950/40">
              {data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="transition-colors group hover:bg-zinc-900/20"
                >
                  {/* Actions Column Cell */}
                  {onChange && (
                    <td className="px-2 py-1 border-r border-zinc-800 text-center bg-zinc-900/10 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(rowIndex)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-all"
                        title="Delete Row"
                      >
                        <Trash2 size={10} />
                      </button>
                    </td>
                  )}

                  {/* Data Cells */}
                  {columns.map((col) => {
                    const cellValue = row[col] === null || row[col] === undefined
                      ? ""
                      : typeof row[col] === "object"
                        ? JSON.stringify(row[col])
                        : String(row[col]);

                    const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.column === col;

                    return (
                      <td
                        key={`${rowIndex}-${col}`}
                        className="px-2.5 py-1.5 border-r border-zinc-900/60 last:border-r-0 overflow-hidden whitespace-nowrap align-middle"
                        style={{ width: columnWidths[col] || 130 }}
                        onDoubleClick={() => {
                          if (onChange) {
                            setEditingCell({ rowIndex, column: col });
                            setCellVal(cellValue);
                          }
                        }}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            className="w-full bg-zinc-900 border border-[var(--color-primary)] rounded px-1 py-0.5 text-[11px] text-white outline-none font-mono focus:shadow-[0_0_8px_rgba(var(--color-primary-rgb),0.3)]"
                            value={cellVal}
                            onChange={(e) => setCellVal(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleCellSave(rowIndex, col, cellVal);
                              } else if (e.key === "Escape") {
                                setEditingCell(null);
                              }
                            }}
                            onBlur={() => handleCellSave(rowIndex, col, cellVal)}
                          />
                        ) : (
                          <span className="opacity-90 group-hover:opacity-100 truncate block min-h-[14px]">
                            {cellValue}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
