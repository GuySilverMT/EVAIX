import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import MonacoEditor from './MonacoEditor.js'; 
import { Bot, Loader2, Play, Copy, Save, RefreshCw } from 'lucide-react';
import { SmartContainer } from './nebula/containers/SmartContainer.js';
import { toast } from 'sonner';
import { trpc } from '../utils/trpc.js';

type AiResponse = string | { 
  content?: string; 
  text?: string; 
  code?: string; 
  result?: string; 
  logs?: string[] 
};

interface SmartEditorProps {
  fileName: string;
  content: string;
  onChange: (val: string) => void;
  isAiTyping?: boolean; // New prop to show AI activity
  onRun?: (goal?: string, roleIdOverride?: string) => void;   // Callback for running the agent (Cmd+Enter)
  onNavigate?: (url: string) => void; // New: Handle link clicks
  roleId?: string | null;
  onRoleChange?: (roleId: string) => void;
}

const TiptapEditor = ({ content, onChange, isAiTyping, onRun, fileName, onNavigate, roleId, onRoleChange }: { content: string, onChange: (val: string) => void, isAiTyping: boolean, onRun?: (goal?: string, roleIdOverride?: string) => void, fileName: string, onNavigate?: (url: string) => void, roleId?: string | null, onRoleChange?: (roleId: string) => void }) => {
  const [showLogs, setShowLogs] = React.useState(false); // [NEW] Toggle state
  const utils = trpc.useContext();
  
  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: content, // ... (unchanged)
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[100px] text-zinc-300 text-sm p-4 h-full',
      },
      handleDOMEvents: {
        // CRITICAL: Return false to allow contextmenu event to bubble up for voice keyboard
        contextmenu: () => false,
      },
    },
    onUpdate: ({ editor }) => {
      // Only trigger onChange if the update was NOT from an external setContent
      // We check if the editor is focused to determine if user is typing
      if (editor.isFocused) {
        onChange(editor.getHTML());
      }
    },
  });

  // Keep Tiptap content synced if content prop changes externally (e.g. AI writes)
  // BUT avoid loops by checking focus - if focussed, we assume the user is typing
  useEffect(() => {
    if (editor && !editor.isDestroyed && !editor.isFocused && content !== editor.getHTML()) {
      editor.commands.setContent(content); 
    }
  }, [content, editor]);

  // Handle Cmd+Enter to Run
  useEffect(() => {
    if (!editor || editor.isDestroyed || !onRun) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Support Shift+Enter, Ctrl+Enter, Alt+Enter to run
      if (event.key === 'Enter' && (event.shiftKey || event.ctrlKey || event.altKey)) {
        event.preventDefault();
        onRun(); // Default run (uses context)
      }
    };

    // Intercept Link Clicks
    const handleClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const link = target.closest('a');
        if (link && link.href && onNavigate) {
            event.preventDefault();
            // Clean up standard link behavior if needed
            // Only internal or valid links
            onNavigate(link.href);
        }
    };

    try {
      if (!editor.isDestroyed && editor.view?.dom) {
        const dom = editor.view.dom;
        dom.addEventListener('keydown', handleKeyDown);
        dom.addEventListener('click', handleClick);
        return () => {
            dom.removeEventListener('keydown', handleKeyDown);
            dom.removeEventListener('click', handleClick);
        };
      }
    } catch (e) {
      console.warn("SmartEditor: Error attaching listeners", e);
    }
  }, [editor, onRun, onNavigate]);

  return (
    <SmartContainer 
      type="DOCS" 
      title="Document Editor"
      contextId={fileName}
      selectedRoleId={roleId}
      onRoleSelect={onRoleChange}
      extraActions={
          <div className="flex items-center gap-1">
             {/* [NEW] Show Logs Toggle */}
             <button 
                type="button" 
                onClick={() => setShowLogs(!showLogs)} 
                title="Toggle Agent Thoughts/Logs" 
                className={`transition-colors ${showLogs ? 'text-purple-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
             >
                <Bot size={12}/>
             </button>
             <button type="button" onClick={() => { if(editor) { const text = editor.getHTML(); void navigator.clipboard.writeText(text).then(() => toast.success('Copied')); } }} title="Copy All" className="hover:text-[var(--text-primary)] transition-colors"><Copy size={10}/></button>
              <button 
                type="button" 
                onClick={() => { void utils.roles.list.invalidate(); toast.success('Roles refreshed'); }} 
                title="Refresh Role Roster" 
                className="hover:text-[var(--text-primary)] transition-colors"
              >
                <RefreshCw size={10}/>
              </button>
             <button type="button" onClick={() => onRun && onRun()} title="Run Agent (Ctrl+Enter)" className="hover:text-[var(--text-primary)] transition-colors"><Play size={10}/></button>
          </div>
      }
      onGenerate={(prompt, options) => onRun && onRun(prompt, options?.roleId)}
      onAiResponse={(res) => {
        const payload = res as AiResponse;
        
        let targetContent = "";
        if (typeof payload === 'string') {
            targetContent = payload;
        } else {
            targetContent = payload.result || payload.content || payload.text || "";
        }
        
        // [LOGIC] Append logs if enabled
        if (showLogs && typeof payload !== 'string' && payload.logs && payload.logs.length > 0) {
            // Check if logs are objects (some are from AgentRuntime logging objects?)
            // AgentRuntime logs are string[]
            
            const logHtml = payload.logs.map(log => {
                // Formatting for "Thought Process"
                if (log.startsWith('[Thought Process]')) {
                    return `<div class="mb-2 text-purple-300 font-bold border-l-2 border-purple-500 pl-2 py-1 bg-purple-500/10 rounded-r">${log}</div>`;
                }
                return `<div class="text-zinc-500 pl-2 border-l border-zinc-800">${log}</div>`;
            }).join('');
            
            targetContent = `<section class="mb-8 p-4 bg-black/40 rounded border border-zinc-800 text-xs font-mono overflow-x-auto max-h-96">
                <h4 class="text-zinc-500 uppercase tracking-widest font-bold mb-2 sticky top-0 bg-zinc-950/90 py-1">Agent Logs</h4>
                ${logHtml}
            </section>` + targetContent;
        }

        if(editor && targetContent) {
          editor.commands.setContent(targetContent);
          onChange(targetContent);
          
          // Auto-refresh roles if we see a success message
          if (targetContent.includes('✅ Role Variant Created Successfully') || targetContent.includes('biologically spawned')) {
              void utils.roles.list.invalidate();
              toast.success("New role detected! Roster updated.");
          }
        }
      }}
    >
      {(registerContext) => {
        // ... (rest of render) ...
        // Register context for AI
        if (editor && !editor.isDestroyed) {
          registerContext(() => editor.getText());
        }

        if (!editor) {
          return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-500 gap-3">
               <Loader2 className="animate-spin text-purple-500" size={24} />
               <span className="text-xs font-medium uppercase tracking-widest animate-pulse">Initializing Editor...</span>
            </div>
          );
        }

        return (
          <div className="h-full w-full bg-zinc-900 overflow-y-auto relative flex flex-col group">
            {/* AI Status Indicator */}
            {isAiTyping && (
                <div className="absolute bottom-4 right-4 z-50 flex items-center gap-2 bg-purple-900/80 text-purple-400 px-2 py-1 rounded text-xs border border-purple-700 backdrop-blur-sm shadow-xl animate-in fade-in zoom-in">
                  <Bot size={12} className="animate-pulse" />
                  <span className="font-bold">AI Synchronizing...</span>
                </div>
              )}

            <EditorContent editor={editor} className="flex-1 h-full min-h-0" />
            
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] text-zinc-600 bg-black/40 px-2 py-0.5 rounded border border-zinc-800 uppercase font-bold">
                Tiptap (Rich Text)
              </span>
            </div>
          </div>
        );
      }}
    </SmartContainer>
  );
};

const SmartEditor: React.FC<SmartEditorProps> = ({ fileName, content, onChange, isAiTyping = false, onRun, onNavigate, roleId, onRoleChange }) => {
  const isCode = /\.(ts|tsx|js|jsx|css|json|py|sh|yml|yaml|sql)$/.test(fileName);

  if (isCode) {
    const extension = fileName.split('.').pop() || 'text';
    return (
      <SmartContainer 
        type="MONACO" 
        title={`Code: ${fileName}`}
        contextId={fileName}
        selectedRoleId={roleId}
        onRoleSelect={onRoleChange}
        extraActions={
            <div className="flex items-center gap-1">
                {/* Save Button */}
                 <button type="button" onClick={() => { onChange(content); toast.success("Saved"); }} title="Save File (Cmd+S)" className="hover:text-[var(--text-primary)] transition-colors"><Save size={10}/></button>
                 <button type="button" onClick={() => { void navigator.clipboard.writeText(content).then(() => toast.success('Copied')); }} title="Copy Code" className="hover:text-[var(--text-primary)] transition-colors"><Copy size={10}/></button>
                 <button type="button" onClick={() => onRun && onRun()} title="Run Agent (Ctrl+Enter)" className="hover:text-[var(--text-primary)] transition-colors"><Play size={10}/></button>
            </div>
        }
        onGenerate={(prompt, options) => onRun && onRun(prompt, options?.roleId)}
        onAiResponse={(res) => {
          const payload = res as AiResponse;
          const code = typeof payload === 'string' ? payload : payload.content || payload.code;
          if(code) onChange(code);
        }}
      >
        {(registerContext) => (
          <div className="h-full w-full relative flex flex-col">
          {/* ... */}
            {isAiTyping && (
              <div className="absolute top-2 right-4 z-50 flex items-center gap-2 bg-emerald-900/80 text-emerald-400 px-2 py-1 rounded text-xs border border-emerald-700 backdrop-blur-sm animate-pulse shadow-lg">
                <Bot size={12} />
                <span className="font-bold">AI Refactoring...</span>
              </div>
            )}
            
            <MonacoEditor
              value={content}
              onChange={(val) => onChange(val || '')}
              // Map tsx/jsx to typescript/javascript for Monaco
              language={extension === 'tsx' ? 'typescript' : extension === 'jsx' ? 'javascript' : extension} 
              theme="vs-dark"
              onMount={(editor) => {
                registerContext(() => editor.getValue());
              }}
              options={{
                minimap: { enabled: true },
                wordWrap: 'on',
                readOnly: isAiTyping,
              }} 
            />
          </div>
        )}
      </SmartContainer>
    );
  }

  return <TiptapEditor key={fileName} fileName={fileName} content={content} onChange={onChange} isAiTyping={isAiTyping} onRun={onRun} onNavigate={onNavigate} roleId={roleId} onRoleChange={onRoleChange} />;
};

export default SmartEditor;
