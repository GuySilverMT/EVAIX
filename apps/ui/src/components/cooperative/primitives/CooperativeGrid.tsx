

// 1. Pure Config (No Data Logic)
interface CooperativeGridProps {
  title?: string;
  columns: { key: string; label: string; width?: string }[];
  data?: unknown[]; // Accepts raw data from ANYWHERE
  onRowClick?: (row: unknown) => void;
  style?: React.CSSProperties; // For Theme Engine overrides
}

export const CooperativeGrid = ({ title, columns = [], data = [], style, onRowClick }: CooperativeGridProps) => {
  return (
    <div className="flex flex-col h-full border border-[var(--color-border)] bg-[var(--color-background)] rounded-md overflow-hidden" style={style}>
      {title && (
        <div className="bg-zinc-900 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
          {title}
        </div>
      )}
      <div className="flex-1 overflow-auto">
        {/* Render columns and rows purely based on props */}
        <table className="w-full text-left text-[11px] font-mono border-collapse">
           <thead className="bg-[var(--color-background-secondary)] sticky top-0 shadow-sm">
             <tr>
               {columns.map(c => <th key={c.key} className="p-2 font-semibold text-[var(--color-text-secondary)] border-b border-[var(--color-border)]" style={{ width: c.width }}>{c.label}</th>)}
             </tr>
           </thead>
           <tbody className="divide-y divide-[var(--color-border)]/50">
             {data.map((row: Record<string, unknown>, i) => (
                <tr 
                  key={i} 
                  onClick={() => onRowClick?.(row)}
                  className="hover:bg-zinc-800/50 transition-colors cursor-pointer"
                >
                   {columns.map(c => <td key={c.key} className="p-2 text-[var(--color-text)]">{row[c.key]}</td>)}
                </tr>
             ))}
           </tbody>
        </table>
      </div>
    </div>
  );
};
