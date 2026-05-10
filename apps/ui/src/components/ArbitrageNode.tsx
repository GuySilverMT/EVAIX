import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Eye, Key } from 'lucide-react';

interface ArbitrageNodeProps {
  data: {
    label: string;
    columns: string[];
    columnMapping?: Record<string, string>;
    onColumnMapChange?: (original: string, mapped: string) => void;
    onColumnToggle?: (column: string, visible: boolean) => void;
    onColumnKey?: (column: string) => void;
    primaryKey?: string;
  };
  id: string;
}

export const ArbitrageNode: React.FC<ArbitrageNodeProps> = ({ data }) => {
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleDoubleClick = (col: string, mappedName: string) => {
    setEditingCol(col);
    setEditValue(mappedName);
  };

  const handleEditSave = (col: string) => {
    if (data.onColumnMapChange && editValue) {
      data.onColumnMapChange(col, editValue);
    }
    setEditingCol(null);
    setEditValue('');
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-sm w-60 overflow-hidden shadow-2xl shadow-black">
      <div className="bg-zinc-900 border-b border-zinc-800 px-2 py-1 flex justify-between items-center">
        <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-tighter">
          {data.label}
        </span>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_5px_cyan]" />
        </div>
      </div>
      <div className="py-1 max-h-96 overflow-y-auto">
        {data.columns.map((col) => {
          const mappedName = data.columnMapping?.[col] || col;
          const isEditing = editingCol === col;
          const isKey = data.primaryKey === col;

          return (
            <div key={col} className="flex items-center px-2 py-0.5 group hover:bg-zinc-900 transition-colors">
              <Handle
                type="target"
                position={Position.Left}
                className="!bg-zinc-700 !w-1.5 !h-1.5"
              />
              <Key
                size={10}
                className={`cursor-pointer transition-colors flex-shrink-0 ${isKey ? 'text-amber-500 shadow-[0_0_3px_#f59e0b]' : 'text-zinc-800 group-hover:text-amber-500'}`}
                onClick={() => data.onColumnKey?.(col)}
              />
              <span
                className={`text-[10px] font-mono text-zinc-400 px-2 truncate flex-1 cursor-text select-none ${isEditing ? 'hidden' : ''}`}
                onDoubleClick={() => handleDoubleClick(col, mappedName)}
                title={mappedName}
              >
                {mappedName}
              </span>
              {isEditing && (
                <input
                  className="text-[10px] font-mono bg-zinc-900 border border-zinc-700 rounded px-1 py-0.5 text-white outline-none flex-1 ml-2"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleEditSave(col)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEditSave(col);
                    if (e.key === 'Escape') {
                      setEditingCol(null);
                      setEditValue('');
                    }
                  }}
                  autoFocus
                />
              )}
              <Eye
                size={10}
                className="text-zinc-600 opacity-0 group-hover:opacity-100 cursor-pointer flex-shrink-0 ml-1"
                onClick={() => data.onColumnToggle?.(col, !data.columnMapping?.[col])}
              />
              <Handle
                type="source"
                position={Position.Right}
                className="!bg-zinc-700 !w-1.5 !h-1.5"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};