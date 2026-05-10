import React, { useRef } from 'react';
import { toast } from 'sonner';
import { trpc } from '../utils/trpc.js';
import { CompactCategorizer } from '../features/dna-lab/components/CompactCategorizer.js';
import type { CategorizerItem } from '../features/dna-lab/components/CompactCategorizer.js';
import { Bot, Download, Upload } from 'lucide-react';

interface CompactRoleSelectorProps {
    selectedRoleId: string | null;
    onSelect: (roleId: string) => void;
    onEdit?: (roleId: string) => void;
    className?: string;
}

const CompactRoleSelector: React.FC<CompactRoleSelectorProps> = ({ selectedRoleId, onSelect, onEdit, className }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 1. Fetch Data
    const { data: roles, isLoading: rolesLoading, error: roleError } = trpc.roles.list.useQuery(undefined, {
        refetchInterval: 60000, 
    });
    const { data: categories, isLoading: catsLoading } = trpc.roles.listCategories.useQuery(undefined, {
        refetchInterval: 30000, // Categories change less often
    });

    const utils = trpc.useContext();
    const deleteMutation = trpc.roles.delete.useMutation({
        onSuccess: () => {
            void utils.roles.list.invalidate();
        },
        onError: (err) => {
            alert(`Failed to delete role: ${err.message}`);
        }
    });

    const importMutation = trpc.roles.importRoles.useMutation({
        onSuccess: (stats) => {
            const messages = [];
            if (stats.created > 0) messages.push(`Created ${stats.created} roles`);
            if (stats.skipped > 0) messages.push(`Skipped ${stats.skipped} existing`);
            if (stats.errors.length > 0) messages.push(`${stats.errors.length} errors`);

            toast.success(`Import complete: ${messages.join(', ')}`);
            if (stats.errors.length > 0) {
                console.error('Import errors:', stats.errors);
            }
            void utils.roles.list.invalidate();
        },
        onError: (err) => {
            toast.error(`Import failed: ${err.message}`);
        }
    });

    const handleDelete = (id: string) => {
        deleteMutation.mutate({ id });
        if (selectedRoleId === id) {
            onSelect(''); // Clear selection if deleted
        }
    };

    const handleBackupAll = async () => {
        try {
            const backup = await utils.client.role.exportAllRoles.query();

            if (backup.totalCount === 0) {
                toast.info('No roles to backup');
                return;
            }

            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `all-roles-backup-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success(`Backed up ${backup.totalCount} roles successfully`);
        } catch (error) {
            toast.error(`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleRestoreClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const backup = JSON.parse(text);

            if (!backup.roles || !Array.isArray(backup.roles)) {
                toast.error('Invalid backup file format');
                return;
            }

            toast.loading(`Importing ${backup.roles.length} roles...`, { id: 'import-toast' });
            importMutation.mutate({ roles: backup.roles });

        } catch (error) {
            toast.error(`Failed to read backup file: ${error instanceof Error ? error.message : 'Invalid JSON'}`, {
                id: 'import-toast'
            });
        }

        // Reset file input
        if (event.target) {
            event.target.value = '';
        }
    };

    if (rolesLoading || catsLoading) {
        return <div className="p-4 text-[10px] text-zinc-500 flex items-center gap-2"><div className="animate-spin w-3 h-3 border-2 border-zinc-600 border-t-zinc-400 rounded-full" /> Loading Roles...</div>;
    }

    if (roleError) {
        return <div className="p-4 text-[10px] text-red-500">Failed to load roles: {roleError.message}</div>;
    }

    // 2. Transform to Primitive Format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: CategorizerItem[] = (roles || []).map((r: any) => {
        let cat = r.category?.name || r.categoryString;
        // Normalize 'Uncategorized' to undefined so it falls into the uncategorized bucket
        if (cat === 'Uncategorized' || !cat) {
            cat = undefined;
        }
        
        return {
            id: r.id,
            label: r.name,
            categoryId: cat,
            icon: <Bot size={12} className={selectedRoleId === r.id ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)]'} />
        };
    });

    // 3. Dynamic Category Merging (Ensure no role is left behind because its category isn't in the DB list)
    const dbCategoryNames = (categories || []).map(c => c.name);
    const usedCategoryNames = Array.from(new Set(items.map(i => i.categoryId).filter(Boolean) as string[]));
    
    // Merge and deduplicate, preferring DB order (at the start)
    const allCategories = Array.from(new Set([...dbCategoryNames, ...usedCategoryNames]));

    return (
        <div className="flex flex-col h-full">
            {/* Backup/Restore Header */}
            <div className="flex-none flex items-center justify-between gap-2 p-2 border-b border-zinc-800 bg-zinc-950">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Backup & Restore</span>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => void handleBackupAll()}
                        className="flex items-center gap-1.5 bg-zinc-700 hover:bg-zinc-600 text-white px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all active:scale-95"
                    >
                        <Download size={10} />
                        Backup All
                    </button>
                    <button
                        type="button"
                        onClick={handleRestoreClick}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all active:scale-95"
                    >
                        <Upload size={10} />
                        Restore
                    </button>
                </div>
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={(e) => void handleFileUpload(e)}
                style={{ display: 'none' }}
            />

            {/* Role List */}
            <div className="flex-1 overflow-hidden">
                <CompactCategorizer
                    title="Agent Roster"
                    items={items}
                    categories={allCategories}
                    selectedId={selectedRoleId}
                    accordion
                    defaultExpanded={false}
                    onSelect={onSelect}
                    onDelete={handleDelete}
                    onEdit={onEdit}
                    className={className}
                />
            </div>
        </div>
    );
};

export default CompactRoleSelector;
