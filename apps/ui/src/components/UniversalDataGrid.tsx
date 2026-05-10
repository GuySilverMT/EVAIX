import React, { useState, useEffect, useMemo } from "react";
import { Edit2, Trash2 } from "lucide-react";

interface GridProps {
  data: Record<string, unknown>[];
  // Allow parent to control column mapping
  columnMapping?: Record<string, string>;
  onColumnMapChange?: (original: string, mapped: string) => void;
  onHeaderClick?: (column: string) => void;
  headers?: string[]; // For empty tables, show schema headers
  isDeletable?: boolean;
}

export const UniversalDataGrid: React.FC<GridProps> = ({
  data,
  columnMapping = {},
  onColumnMapChange,
  onHeaderClick,
  headers = [],
}) => {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizing, setResizing] = useState<{
    column: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Header Editing State
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [tempHeaderVal, setTempHeaderVal] = useState("");

  const columns = useMemo(() => {
    // Prioritize headers if provided (allows controlling order/visibility), otherwise infer from data
    if (headers && headers.length > 0) {
      return headers;
    }
    if (data && data.length > 0) {
      return Object.keys(data[0]);
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
          next[col] = 150;
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
      startWidth: columnWidths[column] || 150,
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

  // [CHANGED] Only return "NO DATA" if we truly have no data AND no columns to show
  const hasData = data && data.length > 0;

  if (!hasData && columns.length === 0)
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-secondary)] bg-zinc-900/20 border border-zinc-800/50 rounded-lg m-2">
        <span className="text-xs font-mono">NO DATA & NO SCHEMA</span>
      </div>
    );

  return (
    <div className="h-full w-full overflow-auto bg-zinc-950 border border-zinc-800 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-950 text-[10px] font-mono text-zinc-400">
      <table className="w-full text-left border-collapse table-fixed border-spacing-0">
        <thead className="sticky top-0 bg-zinc-950 border-b border-zinc-800 z-20">
          <tr>
            {columns.map((col) => {
              const mappedName = columnMapping[col] || col;
              const isMapped = columnMapping[col] && columnMapping[col] !== col;
              const isEditing = editingHeader === col;

              return (
                <th
                  key={col}
                  className={`relative px-2 py-0.5 border-r border-zinc-800 group cursor-pointer select-none transition-colors ${
                    isDeletable ? "hover:bg-red-500/10" : "hover:bg-zinc-800/50"
                  }`}
                  style={{ width: columnWidths[col] || 150 }}
                  onClick={() => onHeaderClick && onHeaderClick(col)}
                >
                  <div
                    className={`flex items-center justify-between h-full ${
                      isDeletable
                        ? "text-red-400/70 group-hover:text-red-400"
                        : isMapped
                          ? "text-cyan-400"
                          : "text-zinc-400"
                    } font-bold tracking-tighter uppercase`}
                  >
                    {/* Header Content */}
                    {isEditing ? (
                      <div className="flex items-center gap-1 w-full">
                        <input
                          autoFocus
                          className="w-full bg-zinc-900 border border-zinc-700 rounded px-1 py-0 text-[10px] font-mono text-white outline-none"
                          value={tempHeaderVal}
                          onChange={(e) => setTempHeaderVal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (onColumnMapChange)
                                onColumnMapChange(col, tempHeaderVal);
                              setEditingHeader(null);
                            }
                          }}
                          onBlur={() => setEditingHeader(null)}
                        />
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-1 overflow-hidden w-full"
                        onDoubleClick={(e) => {
                          if (isDeletable) return;
                          e.stopPropagation();
                          setEditingHeader(col);
                          setTempHeaderVal(mappedName);
                        }}
                      >
                        <span
                          className="truncate flex-1"
                          title={`${col} -> ${mappedName}`}
                        >
                          {mappedName}
                        </span>

                        {/* Action Button: Edit or Trash */}
                        {(onColumnMapChange || isDeletable) && (
                          <button
                            onClick={(e) => {
                              if (isDeletable) {
                                // Trigger delete (via onHeaderClick already handled by th but double down here to be safe/clear)
                                e.stopPropagation();
                                if (onHeaderClick) onHeaderClick(col);
                                return;
                              }
                              e.stopPropagation();
                              setEditingHeader(col);
                              setTempHeaderVal(mappedName);
                            }}
                            className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all ${
                              isDeletable
                                ? "bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white"
                                : "hover:bg-zinc-800 text-zinc-600 hover:text-white"
                            }`}
                          >
                            {isDeletable ? (
                              <Trash2 size={10} />
                            ) : (
                              <Edit2 size={10} />
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Resize Handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize hover:bg-cyan-500/20 z-30 flex justify-center"
                      onMouseDown={(e) => handleMouseDown(e, col)}
                    >
                      <div className="w-px h-full bg-zinc-800 hover:bg-cyan-400 transition-colors" />
                    </div>
                  </div>

                  {/* Mapping Indicator */}
                  {isMapped && !isEditing && (
                    <div className="absolute -top-4 right-1 text-[8px] text-zinc-600 font-mono opacity-75 bg-zinc-950 px-1 py-0.5 rounded-sm">
                      {col}
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {/* [CHANGED] Render empty state row if no data, otherwise render rows */}
          {!hasData ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-2 py-0.5 text-center text-zinc-600 italic border-r border-zinc-800/30"
              >
                Empty Table (Ready for Data)
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="transition-colors group hover:bg-zinc-900/50"
              >
                {columns.map((col) => (
                  <td
                    key={`${rowIndex}-${col}`}
                    className="px-2 py-0.5 border-r border-zinc-800/30 last:border-r-0 overflow-hidden whitespace-nowrap"
                    style={{ width: columnWidths[col] || 150 }}
                  >
                    <span className="opacity-90 group-hover:opacity-100 truncate block">
                      {row[col] === null || row[col] === undefined
                        ? ""
                        : typeof row[col] === "object"
                          ? JSON.stringify(row[col])
                          : String(row[col] as any)}
                    </span>
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
