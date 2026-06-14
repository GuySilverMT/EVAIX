import React, { useEffect, useState, useRef, useMemo } from 'react';
import MonacoEditor from './MonacoEditor.js';
import { 
  Bot, Loader2, Play, Copy, Save, RefreshCw, Paperclip, Send, ChevronDown, Sparkles, FileText, User
} from 'lucide-react';
import { SmartContainer } from './nebula/containers/SmartContainer.js';
import { useAgenticContext } from '../hooks/useAgenticContext.js';
import { toast } from 'sonner';
import { trpc } from '../utils/trpc.js';
import { useWorkspaceStore } from '../stores/workspace.store.js';
import { 
  EditorRoot, 
  EditorContent as Editor, // Import the Editor component from novel
  useEditor as useNovelEditor,
  StarterKit as NovelStarterKit,
  Placeholder as NovelPlaceholder,
  TiptapUnderline as NovelUnderline
} from 'novel';

const writingExtensions = [
  NovelStarterKit,
  NovelPlaceholder.configure({
    placeholder: "Start writing..."
  }),
  NovelUnderline
];

const EditorSync = ({ content }: { content: string }) => {
  const { editor } = useNovelEditor();

  useEffect(() => {
    if (editor && !editor.isDestroyed && !editor.isFocused) {
      const currentVal = editor.getHTML();
      if (content !== currentVal) {
        editor.commands.setContent(content); 
      }
    }
  }, [content, editor]);

  return null;
};

type AiResponse = string | { 
  content?: string; 
  text?: string; 
  code?: string; 
  result?: string; 
  logs?: string[] 
};

interface SmartEditorProps {
  cardId?: string;
  fileName: string;
  content: string;
  onChange: (val: string) => void;
  isAiTyping?: boolean;
  onRun?: (goal?: string, roleIdOverride?: string) => void;
  onNavigate?: (url: string) => void;
  roleId?: string | null;
  onRoleChange?: (roleId: string) => void;
}

const SmartEditor: React.FC<SmartEditorProps> = ({ 
  fileName, 
  content, 
  onChange, 
  isAiTyping = false, 
  onRun, 
  onNavigate, 
  roleId, 
  onRoleChange, 
  cardId 
}) => {
  const isCode = /\.(ts|tsx|js|jsx|css|json|py|sh|yml|yaml|sql)$/.test(fileName);
  const card = useWorkspaceStore(s => s.cards.find(c => c.id === cardId));
  const updateCard = useWorkspaceStore(s => s.updateCard);
  
  const collabMode = (card?.metadata as any)?.collabMode || false;
  const setCollabMode = (val: boolean) => {
    updateCard(cardId || '', {
      metadata: {
        ...(card?.metadata || {}),
        collabMode: val
      }
    });
  };

  const [editorMode, setEditorMode] = useState<'standard' | 'chat' | 'collab'>(() => {
    if (collabMode) return 'collab';
    return 'standard';
  });

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiTyping]);

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSendMessage = (text: string) => {
    if (!text.trim() || isAiTyping) return;
    setChatMessages(prev => [...prev, { role: 'user', content: text }]);
    setChatInput('');
    if (onRun) {
      onRun(text);
    }
  };

  useAgenticContext({
    id: cardId || fileName,
    type: isCode ? 'code-editor' : 'markdown-editor',
    title: fileName,
    defaultIncluded: true,
    getContext: async () => {
      if (!content || content.trim() === "") {
        return { format: 'markdown', content: "" };
      }
      return {
        format: 'markdown',
        content: content
      };
    },
    applyMutation: async (mutation) => {
      if (mutation.action === 'REWRITE') {
        onChange(mutation.content);
        return true;
      }
      return false;
    }
  });

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
            {isAiTyping && (
              <div className="absolute top-2 right-4 z-50 flex items-center gap-2 bg-emerald-900/80 text-emerald-400 px-2 py-1 rounded text-xs border border-emerald-700 backdrop-blur-sm animate-pulse shadow-lg">
                <Bot size={12} />
                <span className="font-bold">AI Refactoring...</span>
              </div>
            )}
            
            <MonacoEditor
              value={content}
              onChange={(val) => onChange(val || '')}
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

  return (
    <SmartContainer 
      type="DOCS" 
      title="Document Editor"
      contextId={fileName}
      selectedRoleId={roleId}
      onRoleSelect={onRoleChange}
      extraActions={
          <div className="flex items-center gap-2">
             <button type="button" onClick={() => { 
                void navigator.clipboard.writeText(content).then(() => toast.success('Copied'));
             }} title="Copy All" className="hover:text-[var(--text-primary)] transition-colors"><Copy size={10}/></button>
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

        if (targetContent) {
          if (editorMode === 'chat') {
            setChatMessages(prev => [...prev, { role: 'assistant', content: "I have updated the document with your changes." }]);
          }
          onChange(targetContent);
        }
      }}
    >
      {(registerContext) => {
        registerContext(() => content);

        return (
          <div className="h-full w-full bg-zinc-900 flex flex-col relative group">
            
            {/* EditorHeader */}
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-4 py-2 text-zinc-300 relative z-30 shrink-0">
              <div className="flex items-center gap-2">
                <FileText size={12} className="text-zinc-500" />
                <span className="text-xs font-bold text-zinc-100 font-mono truncate max-w-[200px]">{fileName}</span>
              </div>

              {/* Submenu Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-850 hover:border-zinc-750 px-2.5 py-1 rounded text-xs text-zinc-300 hover:text-white transition-all font-mono"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
                  <span className="font-semibold uppercase tracking-wider text-[9px]">
                    {editorMode === 'standard' && "Standard Editing"}
                    {editorMode === 'chat' && "AI Chat"}
                    {editorMode === 'collab' && "AI Collab Review"}
                  </span>
                  <ChevronDown size={10} className="text-zinc-500" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-1 w-44 bg-zinc-950 border border-zinc-800 rounded shadow-2xl z-50 overflow-hidden font-mono">
                    <button
                      type="button"
                      onClick={() => {
                        setEditorMode('standard');
                        setCollabMode(false);
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-[10px] hover:bg-zinc-900 text-zinc-300 hover:text-white transition-colors"
                    >
                      Standard Editing
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditorMode('chat');
                        setCollabMode(false);
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-[10px] hover:bg-zinc-900 text-zinc-300 hover:text-white transition-colors"
                    >
                      AI Chat
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditorMode('collab');
                        setCollabMode(true);
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-[10px] hover:bg-zinc-900 text-zinc-300 hover:text-white transition-colors"
                    >
                      AI Collab Review
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Core Writing Surface (Novel Editor) with Optional AI Chat Split */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              
              {/* Novel Editor */}
              <div className="flex-1 min-w-0 bg-zinc-900 overflow-y-auto p-4 relative">
                {isAiTyping && (
                  <div className="absolute bottom-4 right-4 z-50 flex items-center gap-2 bg-purple-900/80 text-purple-400 px-2 py-1 rounded text-xs border border-purple-700 backdrop-blur-sm shadow-xl animate-in fade-in">
                    <Bot size={12} className="animate-pulse" />
                    <span className="font-bold">AI Synchronizing...</span>
                  </div>
                )}

                <EditorRoot>
                  <EditorSync content={content} />
                  <Editor
                    className="prose prose-invert max-w-none focus:outline-none min-h-full text-zinc-300 text-sm font-sans"
                    initialContent={content}
                    extensions={writingExtensions}
                    editorProps={{
                      attributes: {
                        class: 'focus:outline-none prose prose-invert max-w-none text-zinc-300 text-sm min-h-[150px]',
                      },
                      handleDOMEvents: {
                        contextmenu: () => false,
                        keydown: (view, event) => {
                          if (event.key === 'Enter' && (event.shiftKey || event.ctrlKey || event.altKey)) {
                            event.preventDefault();
                            onRun && onRun();
                            return true;
                          }
                          return false;
                        },
                        click: (view, event) => {
                          const target = event.target as HTMLElement;
                          const link = target.closest('a');
                          if (link && link.href && onNavigate) {
                            event.preventDefault();
                            onNavigate(link.href);
                            return true;
                          }
                          return false;
                        }
                      },
                    }}
                    onUpdate={({ editor }) => {
                      onChange(editor.getHTML());
                    }}
                  />
                </EditorRoot>
              </div>

              {/* AI Chat Interface Panel */}
              {editorMode === 'chat' && (
                <div className="w-[320px] border-l border-zinc-800 bg-zinc-950 flex flex-col shrink-0 animate-in slide-in-from-right duration-200">
                  <div className="h-9 border-b border-zinc-900 flex items-center px-4 bg-zinc-900/40 justify-between">
                    <span className="text-[9px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-1.5 font-mono">
                      <Sparkles size={10} className="text-[var(--color-primary)]" />
                      AI Chat Assistant
                    </span>
                  </div>

                  {/* Messages list */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                    {chatMessages.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 opacity-50">
                        <Bot size={28} className="text-[var(--color-primary)] animate-bounce" />
                        <p className="text-[11px] font-semibold text-zinc-300">Ask EVAIX AI</p>
                        <p className="text-[9px] text-zinc-500 max-w-[180px] leading-relaxed">Ask questions or request edits. Changes will write directly back into the editor.</p>
                      </div>
                    )}

                    {chatMessages.map((msg, index) => {
                      const isUser = msg.role === 'user';
                      return (
                        <div key={index} className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                          {!isUser && (
                            <div className="w-5.5 h-5.5 rounded-full bg-purple-950/50 border border-purple-500/30 flex items-center justify-center shrink-0">
                              <Bot size={10} className="text-purple-400" />
                            </div>
                          )}
                          <div className={`max-w-[85%] rounded-lg p-2.5 text-[11px] leading-relaxed font-mono ${
                            isUser 
                              ? 'bg-[var(--color-primary)] text-black font-semibold rounded-br-none shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.15)]' 
                              : 'bg-zinc-900 border border-zinc-850 text-zinc-300 rounded-bl-none'
                          }`}>
                            {msg.content}
                          </div>
                          {isUser && (
                            <div className="w-5.5 h-5.5 rounded-full bg-zinc-800 border border-zinc-750 flex items-center justify-center shrink-0">
                              <User size={10} className="text-zinc-300" />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {isAiTyping && (
                      <div className="flex gap-2.5 justify-start">
                        <div className="w-5.5 h-5.5 rounded-full bg-purple-950/50 border border-purple-500/30 flex items-center justify-center shrink-0 animate-pulse">
                          <Bot size={10} className="text-purple-400" />
                        </div>
                        <div className="bg-zinc-900 border border-zinc-850 text-zinc-400 rounded-lg rounded-bl-none p-2.5 text-[11px] flex items-center gap-2">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input Form with Paperclip */}
                  <div className="p-3 border-t border-zinc-900 bg-zinc-950 flex flex-col gap-2 shrink-0">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          toast.success(`Attached file: ${file.name}`);
                        }
                      }}
                    />
                    
                    <div className="flex gap-2 items-center bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                        title="Attach files or images"
                      >
                        <Paperclip size={13} />
                      </button>
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask AI assistant..."
                        className="flex-1 bg-transparent border-none text-[11px] text-white outline-none placeholder:text-zinc-600 font-mono"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSendMessage(chatInput);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSendMessage(chatInput)}
                        disabled={!chatInput.trim() || isAiTyping}
                        className="text-[var(--color-primary)] hover:opacity-80 disabled:opacity-30 p-1"
                      >
                        <Send size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        );
      }}
    </SmartContainer>
  );
};

export default SmartEditor;
