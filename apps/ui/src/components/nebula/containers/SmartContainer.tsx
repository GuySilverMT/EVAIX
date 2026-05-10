import React, { useRef } from 'react';
import { AiToolbar } from '../primitives/AiToolbar.js';
import { cn } from '../../../lib/utils.js';

export type SmartContainerType = 'MONACO' | 'TERMINAL' | 'BROWSER' | 'DOCS';

interface SmartContainerProps {
  type: SmartContainerType;
  title: string;
  children: (registerContext: (getter: () => string) => void) => React.ReactNode;
  onAiResponse?: (response: unknown) => void;
  className?: string;
  extraActions?: React.ReactNode;
  onGenerate?: (prompt: string, options?: { roleId?: string }) => void; // New prop
  contextId?: string; // For persistent settings
  selectedRoleId?: string | null;
  onRoleSelect?: (roleId: string) => void;
}

// ✅ CORRECT: Mapping Types to SEMANTIC Variables, not colors.
const CONFIG_MAP: Record<SmartContainerType, { pos: 'top' | 'bottom', varName: string }> = {
  MONACO:   { pos: 'bottom', varName: 'var(--ai-intent-code)' }, 
  TERMINAL: { pos: 'bottom', varName: 'var(--ai-intent-terminal)' },
  BROWSER:  { pos: 'top',    varName: 'var(--ai-intent-browser)' },
  DOCS:     { pos: 'top',    varName: 'var(--ai-intent-docs)' },
};

export const SmartContainer: React.FC<SmartContainerProps> = ({
  type,
  title,
  children,
  onAiResponse,
  className,
  extraActions,
  onGenerate,
  contextId,
  selectedRoleId,
  onRoleSelect
}) => {
  const config = CONFIG_MAP[type];
  const contextRef = useRef<(() => string)>(() => "No context available");

  const registerContext = (getter: () => string) => {
    contextRef.current = getter;
  };

  return (
    <div className={cn("flex flex-col w-full h-full relative overflow-hidden bg-[var(--bg-background)]", className)}>
      
      {/* Top Menu */}
      {config.pos === 'top' && (
        <AiToolbar 
          position="top"
          title={title}
          colorVar={config.varName} // Passing the Variable Reference
          aiContextGetter={() => contextRef.current()}
          onAiAction={(_action, payload) => onAiResponse && onAiResponse(payload)}
          onGenerate={onGenerate}
          contextId={contextId}
          selectedRoleId={selectedRoleId}
          onRoleSelect={onRoleSelect}
          actions={extraActions}
        />
      )}

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {children(registerContext)}
      </div>

      {/* Bottom Menu */}
      {config.pos === 'bottom' && (
        <AiToolbar 
          position="bottom"
          title={title}
          colorVar={config.varName} // Passing the Variable Reference
          aiContextGetter={() => contextRef.current()}
          onAiAction={(_action, payload) => onAiResponse && onAiResponse(payload)}
          onGenerate={onGenerate}
          contextId={contextId}
          selectedRoleId={selectedRoleId}
          onRoleSelect={onRoleSelect}
          actions={extraActions}
        />
      )}
    </div>
  );
};
