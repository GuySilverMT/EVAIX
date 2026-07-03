import React from 'react';

/**
 * @file TheGrid.tsx
 * @description The master 2-column tiling layout primitive for EVAIX Agentic Spatial Window Manager.
 * Eradicates traditional floating desktop windows in favor of a dynamic tiling grid wrapper.
 * Renders tiled spatial slots for chromeless AppCard wrappers.
 */

export interface TheGridProps {
  title?: string;
  columns: { key: string; label: string; width?: string }[];
  data?: any[]; // Accepts raw data from dynamic Zustand stores
  onRowClick?: (row: any) => void;
  style?: React.CSSProperties; // For Theme Engine overrides
}

export const TheGrid: React.FC<TheGridProps> = ({ 
  title, 
  columns = [], 
  data = [], 
  style, 
  onRowClick 
}) => {
  return (
    <div 
      className="flex flex-col h-full border border-[var(--color-border)] bg-[var(--color-background)] rounded-md overflow-hidden" 
      style={style}
    >
      {title && (
        <div className="bg-zinc-900 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
          {title}
        </div>
      )}
      <div className="flex-1 overflow-auto">
        {data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-zinc-500 font-mono text-xs">
            <span>Grid Empty State — No Items Active</span>
          </div>
        ) : (
          <table className="w-full text-left text-[11px] font-mono border-collapse">
            <thead className="bg-[var(--color-background-secondary)] sticky top-0 shadow-sm">
              <tr>
                {columns.map(c => (
                  <th key={c.key} className="p-2 font-semibold text-[var(--color-text-secondary)] border-b border-[var(--color-border)]" style={{ width: c.width }}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/50">
              {data.map((row: any, i: number) => (
                <tr 
                  key={i} 
                  onClick={() => onRowClick?.(row)}
                  className="hover:bg-zinc-800/50 transition-colors cursor-pointer"
                >
                  {columns.map(c => (
                    <td key={c.key} className="p-2 text-[var(--color-text)]">
                      {String(row?.[c.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
