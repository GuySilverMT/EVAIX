import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus, Search, Folder, CheckSquare, Square, Trash2, Pencil } from 'lucide-react';
import { cn } from '../../../lib/utils.js';

export interface CategorizerItem {
  id: string;
  label: string;
  categoryId?: string;
  icon?: React.ReactNode;
  metadata?: Record<string, unknown>;
}

interface CategorizerProps {
  title: string;
  items: CategorizerItem[];
  categories: string[];
  selectedId?: string | null;
  selectedIds?: string[]; // Support multi-select for Tools
  onSelect: (id: string) => void;
  onCategorySelect?: (category: string, allItemIds: string[]) => void; // New: Select all in category
  onAddCategory?: (name: string) => void;
  onAddItem?: (categoryId?: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  className?: string;
  accordion?: boolean;
  defaultExpanded?: boolean;
}

export const CompactCategorizer: React.FC<CategorizerProps> = ({
  title,
  items,
  categories,
  selectedId,
  selectedIds,
  onSelect,
  onCategorySelect,
  onAddItem,
  onDelete,
  onEdit,
  className,
  accordion = false,
  defaultExpanded = true
}) => {
  // Initialize expanded state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');

  // Hydrate initial state
  useEffect(() => {
    if (defaultExpanded) {
      setExpanded(categories.reduce((acc, cat) => ({ ...acc, [cat]: true }), { 'Uncategorized': true }));
    } else {
      setExpanded({}); // Start condensed
    }
  }, [categories, defaultExpanded]);

  const toggle = (cat: string) => {
    setExpanded(prev => {
      if (accordion) {
        // If opening 'cat', close everything else. If closing 'cat', just close it.
        return prev[cat] ? {} : { [cat]: true };
      }
      return { ...prev, [cat]: !prev[cat] };
    });
  };

  // Group items
  const grouped = categories.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.categoryId === cat && i.label.toLowerCase().includes(search.toLowerCase()));
    return acc;
  }, {} as Record<string, CategorizerItem[]>);

  const uncategorized = items.filter(i => !i.categoryId && i.label.toLowerCase().includes(search.toLowerCase()));

  // Helper to check if a category is fully selected (for Tools)
  const isCategoryFull = (cat: string) => {
    if (!selectedIds) return false;
    const catItems = grouped[cat];
    if (catItems.length === 0) return false;
    return catItems.every(i => selectedIds.includes(i.id));
  };

  return (
    <div className={cn("flex flex-col h-full bg-[var(--bg-secondary)] border-r border-[var(--border-color)]", className)}>
      {/* Header */}
      <div className="h-8 flex items-center justify-between px-2 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{title}</span>
        <div className="flex gap-1">
          {onAddItem && <button type="button" onClick={() => onAddItem()} className="hover:text-[var(--text-primary)]"><Plus size={12} /></button>}
        </div>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-[var(--border-color)]">
        <div className="relative">
          <Search size={10} className="absolute left-2 top-1.5 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter..."
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded h-6 pl-6 text-[10px] focus:border-[var(--color-primary)] outline-none transition-colors"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {categories.map(cat => (
          <div key={cat} className="border-b border-[var(--border-color)]/20 last:border-0">
            <div
              className="flex items-center gap-1 px-2 py-1.5 hover:bg-[var(--bg-primary)] cursor-pointer group select-none"
            >
              {/* Expand Toggle */}
              <div onClick={() => toggle(cat)} className="flex items-center gap-1 flex-1">
                {expanded[cat] ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                <Folder size={10} className={cn("text-[var(--text-muted)] group-hover:text-[var(--color-primary)]", expanded[cat] && "text-[var(--color-primary)]")} />
                <span className={cn("text-[10px] font-bold text-[var(--text-secondary)]", expanded[cat] && "text-[var(--text-primary)]")}>{cat}</span>
                <span className="ml-auto text-[9px] text-[var(--text-muted)] bg-[var(--bg-background)] px-1 rounded">{grouped[cat].length}</span>
              </div>

              {/* Category Select Action (Only if multi-select enabled) */}
              {onCategorySelect && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCategorySelect(cat, grouped[cat].map(i => i.id));
                  }}
                  className="p-1 hover:text-[var(--color-primary)] text-[var(--text-muted)] transition-colors"
                  title="Select All in Category"
                >
                  {isCategoryFull(cat) ? <CheckSquare size={10} /> : <Square size={10} />}
                </button>
              )}
            </div>

            {expanded[cat] && (
              <div className="animate-in slide-in-from-top-1 duration-200">
                {grouped[cat].map(item => (
                  <ListItem
                    key={item.id}
                    item={item}
                    selected={selectedIds ? selectedIds.includes(item.id) : selectedId === item.id}
                    onClick={() => onSelect(item.id)}
                    onDelete={onDelete ? () => onDelete(item.id) : undefined}
                    onEdit={onEdit ? () => onEdit(item.id) : undefined}
                  />
                ))}
                {grouped[cat].length === 0 && <div className="px-6 py-1 text-[9px] text-[var(--text-muted)] italic">No items</div>}
              </div>
            )}
          </div>
        ))}

        {/* Uncategorized */}
        {uncategorized.length > 0 && (
          <div className="mt-2">
            <div className="px-2 py-1 text-[9px] font-bold text-[var(--text-muted)] opacity-50 uppercase flex items-center gap-2">
              <Folder size={10} /> Uncategorized
            </div>
            {uncategorized.map(item => (
              <ListItem
                key={item.id}
                item={item}
                selected={selectedIds ? selectedIds.includes(item.id) : selectedId === item.id}
                onClick={() => onSelect(item.id)}
                onDelete={onDelete ? () => onDelete(item.id) : undefined}
                onEdit={onEdit ? () => onEdit(item.id) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ListItem = ({ item, selected, onClick, onDelete, onEdit }: { item: CategorizerItem, selected: boolean, onClick: () => void, onDelete?: () => void, onEdit?: () => void }) => (
  <div
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-6 py-1.5 cursor-pointer border-l-2 transition-all select-none group",
      selected
        ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]"
        : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
    )}
  >
    {item.icon}
    <span className="text-[11px] truncate">{item.label}</span>
    {selected && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shadow-[0_0_5px_var(--color-primary)]" />}
    <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-1 hover:text-[var(--color-primary)] text-zinc-500 transition-all"
          title="Edit Role"
        >
          <Pencil size={10} />
        </button>
      )}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete role "${item.label}"?`)) onDelete();
          }}
          className="p-1 hover:text-red-400 text-zinc-500 transition-all"
          title="Delete Role"
        >
          <Trash2 size={10} />
        </button>
      )}
    </div>
  </div>
);
