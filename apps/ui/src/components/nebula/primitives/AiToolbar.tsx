import React from 'react';
import { SuperAiButton } from '../../ui/SuperAiButton.js';
import { Settings, Maximize2 } from 'lucide-react';
import { cn } from '../../../lib/utils.js';

interface AiToolbarProps {
  position: 'top' | 'bottom';
  title: string;
  colorVar: string; // Expecting 'var(--ai-intent-code)'
  aiContextGetter: () => string;
  onAiAction: (action: string, payload?: unknown) => void;
  onGenerate?: (prompt: string, options?: { roleId?: string }) => void; // New prop
  contextId?: string; // For role persistence
  actions?: React.ReactNode;
  className?: string;
  selectedRoleId?: string | null;
  onRoleSelect?: (roleId: string) => void;
}

export const AiToolbar: React.FC<AiToolbarProps> = ({
  position,
  title,
  colorVar,
  aiContextGetter,
  onAiAction,
  onGenerate,
  contextId,
  actions,
  className,
  selectedRoleId,
  onRoleSelect
}) => {
  const isTop = position === 'top';

  return (
    <div 
      className={cn(
        "flex items-center justify-between px-3 py-1 z-20 transition-all shrink-0",
        // ✅ Uses Semantic Background/Border, not hardcoded
        "bg-[var(--ai-ui-toolbarBg)] border-[var(--ai-ui-toolbarBorder)]",
        isTop ? "border-b h-9 rounded-t-lg" : "border-t h-8 rounded-b-lg", 
        className
      )}
      style={{ 
        // ✅ The colored strip is now linked to the theme variable
        borderLeft: `3px solid ${colorVar}` 
      }}
    >
      <div className="flex items-center gap-2">
        {/* Spark 1: Intent (Primary) */}
        <SuperAiButton 
          contextGetter={aiContextGetter}
          onSuccess={(res: unknown) => onAiAction('APPLY_RESPONSE', res)}
          onGenerate={onGenerate}
          contextId={contextId}
          selectedRoleId={selectedRoleId}
          onRoleSelect={onRoleSelect}
          style={{ '--ai-btn-primary': colorVar, '--ai-btn-size': '26px' } as React.CSSProperties} 
        />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-80">
          {title}
        </span>
      </div>

      <div className="flex-1 flex justify-end px-4 gap-2">
         {actions}
      </div>

      <div className="flex items-center gap-1 text-[var(--text-muted)]">
         <button type="button" className="hover:text-[var(--text-primary)] transition-colors"><Settings size={12} /></button>
         <button type="button" className="hover:text-[var(--text-primary)] transition-colors"><Maximize2 size={12} /></button>
      </div>
    </div>
  );
};
