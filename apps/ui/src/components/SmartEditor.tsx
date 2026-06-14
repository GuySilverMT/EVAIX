import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent as TiptapEditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Typography from '@tiptap/extension-typography';
import { WritingToolbar } from './WritingToolbar.js';
import MonacoEditor from './MonacoEditor.js'; 
import { 
  Bot, Loader2, Play, Copy, Save, RefreshCw,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote, Text
} from 'lucide-react';
import { SmartContainer } from './nebula/containers/SmartContainer.js';
import { useAgenticContext } from '../hooks/useAgenticContext.js';
import { toast } from 'sonner';
import { trpc } from '../utils/trpc.js';
import { useWorkspaceStore } from '../stores/workspace.store.js';
import { 
  EditorRoot, 
  EditorContent as NovelEditorContent,
  useEditor as useNovelEditor,
  EditorBubble,
  EditorBubbleItem,
  EditorCommand,
  EditorCommandItem,
  EditorCommandEmpty,
  EditorCommandList,
  StarterKit as NovelStarterKit,
  Placeholder as NovelPlaceholder,
  TiptapUnderline as NovelUnderline,
  Command as NovelCommand,
  renderItems as novelRenderItems
} from 'novel';

const suggestionItems = [
  {
    title: "Text",
    description: "Just start writing with plain text.",
    icon: <Text size={12} />,
    command: ({ editor, range }: { editor: any, range: any }) => {
      editor.chain().focus().deleteRange(range).toggleNode("paragraph", "paragraph").run();
    }
  },
  {
    title: "Heading 1",
    description: "Big section heading.",
    icon: <Heading1 size={12} />,
    command: ({ editor, range }: { editor: any, range: any }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
    }
  },
  {
    title: "Heading 2",
    description: "Medium section heading.",
    icon: <Heading2 size={12} />,
    command: ({ editor, range }: { editor: any, range: any }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
    }
  },
  {
    title: "Heading 3",
    description: "Small section heading.",
    icon: <Heading3 size={12} />,
    command: ({ editor, range }: { editor: any, range: any }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
    }
  },
  {
    title: "Bullet List",
    description: "Create a simple bulleted list.",
    icon: <List size={12} />,
    command: ({ editor, range }: { editor: any, range: any }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    }
  },
  {
    title: "Numbered List",
    description: "Create a list with numbering.",
    icon: <ListOrdered size={12} />,
    command: ({ editor, range }: { editor: any, range: any }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    }
  },
  {
    title: "Quote",
    description: "Capture a quote.",
    icon: <Quote size={12} />,
    command: ({ editor, range }: { editor: any, range: any }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    }
  }
];

const suggestion = {
  items: () => suggestionItems,
  render: novelRenderItems
};

const writingExtensions = [
  NovelStarterKit,
  NovelPlaceholder.configure({
    placeholder: "Press '/' for commands..."
  }),
  NovelUnderline,
  NovelCommand.configure({ suggestion })
];

const EditorSync = ({ content, isWritingMode }: { content: string, isWritingMode: boolean }) => {
  const { editor } = useNovelEditor();

  useEffect(() => {
    if (editor && !editor.isDestroyed && !editor.isFocused) {
      const currentVal = isWritingMode ? editor.getHTML() : editor.getText();
      if (content !== currentVal) {
        editor.commands.setContent(content); 
      }
    }
  }, [content, editor, isWritingMode]);

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
  isAiTyping?: boolean; // New prop to show AI activity
  onRun?: (goal?: string, roleIdOverride?: string) => void;   // Callback for running the agent (Cmd+Enter)
  onNavigate?: (url: string) => void; // New: Handle link clicks
  roleId?: string | null;
  onRoleChange?: (roleId: string) => void;
}

const NovelToolbarWrapper = () => {
  const { editor } = useNovelEditor();
  if (!editor) return null;
  return <WritingToolbar editor={editor} />;
};

const TiptapEditor = ({ 
  content, 
  onChange, 
  isAiTyping, 
  onRun, 
  fileName, 
  onNavigate, 
  roleId, 
  onRoleChange, 
  cardId, 
  projectType,
  collabMode,
  setCollabMode
}: { 
  content: string, 
  onChange: (val: string) => void, 
  isAiTyping: boolean, 
  onRun?: (goal?: string, roleIdOverride?: string) => void, 
  fileName: string, 
  onNavigate?: (url: string) => void, 
  roleId?: string | null, 
  onRoleChange?: (roleId: string) => void, 
  cardId?: string, 
  projectType?: string | null,
  collabMode: boolean,
  setCollabMode: (val: boolean) => void
}) => {
  const [showLogs, setShowLogs] = React.useState(false); // [NEW] Toggle state
  const utils = trpc.useContext();
  const isWritingMode = projectType?.toLowerCase() === 'writing';
  
  // Format content for code block if not writing mode
  const getInitialContent = (raw: string) => {
      if (isWritingMode) return raw;
      // Bypass Tiptap's HTML parser entirely so markdown/configs load as raw text inside a CodeBlock
      const escaped = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<pre><code class="language-markdown">${escaped}</code></pre>`;
  };

  const editor = useEditor({
    extensions: [StarterKit],
    content: getInitialContent(content),
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[100px] text-zinc-300 text-sm p-4 h-full font-mono whitespace-pre-wrap',
      },
      handleDOMEvents: {
        // CRITICAL: Return false to allow contextmenu event to bubble up for voice keyboard
        contextmenu: () => false,
      },
    },
    onUpdate: ({ editor }) => {
      if (editor.isFocused && !isWritingMode) {
        onChange(editor.getText());
      }
    },
  });

  // Keep Tiptap content synced if content prop changes externally (e.g. AI writes)
  // BUT avoid loops by checking focus - if focussed, we assume the user is typing
  useEffect(() => {
    if (!isWritingMode && editor && !editor.isDestroyed && !editor.isFocused) {
      const currentVal = editor.getText();
      if (content !== currentVal) {
        editor.commands.setContent(getInitialContent(content)); 
      }
    }
  }, [content, editor, isWritingMode]);

  // Handle Cmd+Enter to Run
  useEffect(() => {
    if (isWritingMode || !editor || editor.isDestroyed || !onRun) return;

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
  }, [editor, onRun, onNavigate, isWritingMode]);

  return (
    <SmartContainer 
      type="DOCS" 
      title="Document Editor"
      contextId={fileName}
      selectedRoleId={roleId}
      onRoleSelect={onRoleChange}
      extraActions={
          <div className="flex items-center gap-2">
             {/* AI Mode Selector Dropdown */}
             <div className="relative flex items-center bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 h-6">
               <select
                 value={collabMode ? 'collab' : 'standard'}
                 onChange={(e) => setCollabMode(e.target.value === 'collab')}
                 className="bg-transparent border-none text-[10px] text-zinc-400 font-mono outline-none cursor-pointer focus:text-white"
               >
                 <option value="standard" className="bg-zinc-950 text-zinc-400">Standard AI</option>
                 <option value="collab" className="bg-zinc-950 text-zinc-400">Collab Review</option>
               </select>
             </div>
             
             <div className="w-px h-3 bg-zinc-800" />

             {/* [NEW] Show Logs Toggle */}
             <button 
                type="button" 
                onClick={() => setShowLogs(!showLogs)} 
                title="Toggle Agent Thoughts/Logs" 
                className={`transition-colors ${showLogs ? 'text-purple-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
             >
                <Bot size={12}/>
             </button>
             <button type="button" onClick={() => { 
                const text = isWritingMode ? content : (editor ? editor.getHTML() : "");
                void navigator.clipboard.writeText(text).then(() => toast.success('Copied'));
             }} title="Copy All" className="hover:text-[var(--text-primary)] transition-colors"><Copy size={10}/></button>
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

        if (targetContent) {
          if (isWritingMode) {
            onChange(targetContent);
          } else if (editor) {
            editor.commands.setContent(targetContent);
            onChange(targetContent);
          }
          
          // Auto-refresh roles if we see a success message
          if (targetContent.includes('✅ Role Variant Created Successfully') || targetContent.includes('biologically spawned')) {
              void utils.roles.list.invalidate();
              toast.success("New role detected! Roster updated.");
          }
        }
      }}
    >
      {(registerContext) => {
        // Register context for AI
        if (isWritingMode) {
          registerContext(() => content);
        } else if (editor && !editor.isDestroyed) {
          registerContext(() => editor.getText());
        }

        if (!isWritingMode && !editor) {
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

            {isWritingMode ? (
              <EditorRoot>
                <EditorSync content={content} isWritingMode={isWritingMode} />
                <div className="h-full w-full bg-zinc-900 overflow-y-auto relative flex flex-col group">
                  <NovelToolbarWrapper />
                  <NovelEditorContent
                    className="flex-1 h-full min-h-0 overflow-y-auto"
                    initialContent={content}
                    extensions={writingExtensions}
                    editorProps={{
                      attributes: {
                        class: 'prose prose-invert max-w-none focus:outline-none min-h-[100px] text-zinc-300 text-sm p-4 h-full',
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
                  >
                    <EditorBubble className="flex w-fit max-w-xs shrink-0 gap-1 rounded border border-zinc-800 bg-zinc-950 p-1 shadow-xl animate-in fade-in zoom-in duration-100">
                      <EditorBubbleItem onSelect={(editor) => editor.chain().focus().toggleBold().run()}>
                        <button type="button" className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded"><Bold size={12} /></button>
                      </EditorBubbleItem>
                      <EditorBubbleItem onSelect={(editor) => editor.chain().focus().toggleItalic().run()}>
                        <button type="button" className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded"><Italic size={12} /></button>
                      </EditorBubbleItem>
                      <EditorBubbleItem onSelect={(editor) => editor.chain().focus().toggleUnderline().run()}>
                        <button type="button" className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded"><UnderlineIcon size={12} /></button>
                      </EditorBubbleItem>
                      <EditorBubbleItem onSelect={(editor) => editor.chain().focus().toggleStrike().run()}>
                        <button type="button" className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded"><Strikethrough size={12} /></button>
                      </EditorBubbleItem>
                    </EditorBubble>
                    
                    <EditorCommand className="z-50 h-auto max-h-[330px] w-72 overflow-y-auto rounded-md border border-zinc-850 bg-zinc-950 px-1 py-2 shadow-2xl transition-all scrollbar-thin">
                      <EditorCommandEmpty className="px-2 text-zinc-500 text-xs">No results</EditorCommandEmpty>
                      <EditorCommandList>
                        {suggestionItems.map((item) => (
                          <EditorCommandItem
                            key={item.title}
                            value={item.title}
                            onCommand={item.command}
                            className="flex w-full items-center space-x-2 rounded-md px-2 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-900 aria-selected:bg-zinc-900 transition-colors cursor-pointer"
                          >
                            <div className="flex h-5 w-5 items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-zinc-400">
                              {item.icon}
                            </div>
                            <div>
                              <p className="font-semibold text-zinc-200">{item.title}</p>
                              <p className="text-[10px] text-zinc-500">{item.description}</p>
                            </div>
                          </EditorCommandItem>
                        ))}
                      </EditorCommandList>
                    </EditorCommand>
                  </NovelEditorContent>
                </div>
              </EditorRoot>
            ) : (
              <>
                {isWritingMode && editor && <WritingToolbar editor={editor} />}
                <TiptapEditorContent editor={editor} className="flex-1 h-full min-h-0 overflow-y-auto" />
              </>
            )}
            
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] text-zinc-600 bg-black/40 px-2 py-0.5 rounded border border-zinc-800 uppercase font-bold">
                {isWritingMode ? 'Novel (Rich Text)' : 'Tiptap (Plain Text)'}
              </span>
            </div>
          </div>
        );
      }}
    </SmartContainer>
  );
};

const SmartEditor: React.FC<SmartEditorProps> = ({ fileName, content, onChange, isAiTyping = false, onRun, onNavigate, roleId, onRoleChange, cardId }) => {
  const isCode = /\.(ts|tsx|js|jsx|css|json|py|sh|yml|yaml|sql)$/.test(fileName);
  const projectType = useWorkspaceStore(s => s.projectType);
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

  useAgenticContext({
    id: cardId || fileName,
    type: isCode ? 'code-editor' : 'markdown-editor',
    title: fileName,
    defaultIncluded: true,
    getContext: async () => {
      // Dynamic Context Pruning
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
        // Just directly setting content for now, ideally prompt user
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

  return <TiptapEditor key={fileName} fileName={fileName} content={content} onChange={onChange} isAiTyping={isAiTyping} onRun={onRun} onNavigate={onNavigate} roleId={roleId} onRoleChange={onRoleChange} cardId={cardId} projectType={projectType} collabMode={collabMode} setCollabMode={setCollabMode} />;
};

export default SmartEditor;
