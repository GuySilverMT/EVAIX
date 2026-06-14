import React, { useEffect, useState, useRef } from 'react';
import MonacoEditor from './MonacoEditor.js';
import { 
  Bot, Play, Copy, Save, Paperclip, Send, Sparkles, FileText, User,
  Bold, Italic, Underline, Strikethrough, Code
} from 'lucide-react';
import { SmartContainer } from './nebula/containers/SmartContainer.js';
import { useAgenticContext } from '../hooks/useAgenticContext.js';
import { toast } from 'sonner';
import { useWorkspaceStore } from '../stores/workspace.store.js';
import { TextStyle, FontFamily, FontSize } from '@tiptap/extension-text-style';
import { 
  EditorRoot, 
  EditorContent as Editor,
  useEditor as useNovelEditor,
  StarterKit as NovelStarterKit,
  Placeholder as NovelPlaceholder,
  TiptapUnderline as NovelUnderline,
  EditorBubble,
  EditorBubbleItem,
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  Command as NovelCommand
} from 'novel';

const writingExtensions = [
  NovelStarterKit,
  NovelPlaceholder.configure({
    placeholder: "Start writing..."
  }),
  NovelUnderline,
  NovelCommand,
  TextStyle,
  FontFamily,
  FontSize
];

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

const ComposedEditor = ({ 
  content, 
  fileName, 
  onChange, 
  onRun, 
  onNavigate 
}: { 
  content: string; 
  fileName: string; 
  onChange: (val: string) => void; 
  onRun?: (goal?: string) => void; 
  onNavigate?: (url: string) => void; 
}) => {
  const { editor } = useNovelEditor();

  // Content sync from outside prop
  useEffect(() => {
    if (editor && !editor.isDestroyed && !editor.isFocused) {
      if (!content) {
        editor.commands.setContent('');
        return;
      }
      try {
        if (fileName.endsWith('.json')) {
          const json = JSON.parse(content);
          editor.commands.setContent(json);
        } else {
          editor.commands.setContent(content);
        }
      } catch (e) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor, fileName]);

  if (!editor) return null;

  return (
    <div className="relative w-full h-full">
      <Editor
        className="prose prose-invert max-w-none focus:outline-none min-h-full text-zinc-300 text-sm font-sans"
        initialContent={fileName.endsWith('.json') ? (content ? JSON.parse(content) : undefined) : undefined}
        extensions={writingExtensions}
        editorProps={{
          attributes: {
            class: 'focus:outline-none prose prose-invert max-w-none text-zinc-300 text-sm min-h-[150px] w-full h-full',
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
          if (fileName.endsWith('.json')) {
            onChange(JSON.stringify(editor.getJSON(), null, 2));
          } else {
            onChange(editor.getHTML());
          }
        }}
      >
        {/* Composed Bubble Menu */}
        <EditorBubble className="flex items-center w-max max-w-[calc(100vw-32px)] border border-zinc-850 bg-zinc-950 p-1.5 rounded-lg shadow-2xl gap-2 z-50 select-none">
          {/* Font Family Selector */}
          <select 
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'default') {
                (editor.chain().focus() as any).unsetFontFamily().run();
              } else {
                (editor.chain().focus() as any).setFontFamily(val).run();
              }
            }}
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-[10px] rounded px-1.5 py-0.5 outline-none font-mono transition-colors"
            title="Font Family"
          >
            <option value="default">Default Font</option>
            <option value="sans-serif">Sans-Serif</option>
            <option value="serif">Serif</option>
            <option value="monospace">Monospace</option>
            <option value="cursive">Cursive</option>
          </select>

          {/* Font Size Selector */}
          <select 
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'default') {
                (editor.chain().focus() as any).unsetFontSize().run();
              } else {
                (editor.chain().focus() as any).setFontSize(val).run();
              }
            }}
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-[10px] rounded px-1.5 py-0.5 outline-none font-mono transition-colors"
            title="Font Size"
          >
            <option value="default">Default Size</option>
            <option value="12px">12px</option>
            <option value="14px">14px</option>
            <option value="16px">16px</option>
            <option value="18px">18px</option>
            <option value="20px">20px</option>
            <option value="24px">24px</option>
            <option value="30px">30px</option>
          </select>

          <span className="w-px h-4 bg-zinc-800" />

          {/* Inline styles */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1 rounded hover:bg-zinc-800 transition-colors ${editor.isActive('bold') ? 'text-[var(--color-primary)] bg-zinc-800' : 'text-zinc-400'}`}
            title="Bold"
          >
            <Bold size={11} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1 rounded hover:bg-zinc-800 transition-colors ${editor.isActive('italic') ? 'text-[var(--color-primary)] bg-zinc-800' : 'text-zinc-400'}`}
            title="Italic"
          >
            <Italic size={11} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1 rounded hover:bg-zinc-800 transition-colors ${editor.isActive('underline') ? 'text-[var(--color-primary)] bg-zinc-800' : 'text-zinc-400'}`}
            title="Underline"
          >
            <Underline size={11} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1 rounded hover:bg-zinc-800 transition-colors ${editor.isActive('strike') ? 'text-[var(--color-primary)] bg-zinc-800' : 'text-zinc-400'}`}
            title="Strikethrough"
          >
            <Strikethrough size={11} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-1 rounded hover:bg-zinc-800 transition-colors ${editor.isActive('code') ? 'text-[var(--color-primary)] bg-zinc-800' : 'text-zinc-400'}`}
            title="Inline Code"
          >
            <Code size={11} />
          </button>
        </EditorBubble>

        {/* Composed Slash Commands */}
        <EditorCommand className="z-50 h-auto max-h-[330px] w-72 overflow-y-auto rounded-md border border-zinc-800 bg-zinc-950 p-1 shadow-2xl transition-all font-mono">
          <EditorCommandEmpty className="px-2 py-1.5 text-[10px] text-zinc-500">
            No results
          </EditorCommandEmpty>
          <EditorCommandList>
            <EditorCommandItem
              value="Heading 1"
              onCommand={({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run();
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[10px] text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-zinc-400 font-bold">
                H1
              </div>
              <div>
                <p className="font-bold text-zinc-200">Heading 1</p>
                <p className="text-[9px] text-zinc-500 font-sans">Big section heading.</p>
              </div>
            </EditorCommandItem>
            <EditorCommandItem
              value="Heading 2"
              onCommand={({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run();
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[10px] text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-zinc-400 font-bold">
                H2
              </div>
              <div>
                <p className="font-bold text-zinc-200">Heading 2</p>
                <p className="text-[9px] text-zinc-500 font-sans">Medium section heading.</p>
              </div>
            </EditorCommandItem>
            <EditorCommandItem
              value="Heading 3"
              onCommand={({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run();
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[10px] text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-zinc-400 font-bold">
                H3
              </div>
              <div>
                <p className="font-bold text-zinc-200">Heading 3</p>
                <p className="text-[9px] text-zinc-500 font-sans">Small section heading.</p>
              </div>
            </EditorCommandItem>
            <EditorCommandItem
              value="Bullet List"
              onCommand={({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleBulletList().run();
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[10px] text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-zinc-400 font-bold">
                •
              </div>
              <div>
                <p className="font-bold text-zinc-200">Bullet List</p>
                <p className="text-[9px] text-zinc-500 font-sans">Create a simple bulleted list.</p>
              </div>
            </EditorCommandItem>
            <EditorCommandItem
              value="Numbered List"
              onCommand={({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleOrderedList().run();
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[10px] text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-zinc-400 font-bold">
                1.
              </div>
              <div>
                <p className="font-bold text-zinc-200">Numbered List</p>
                <p className="text-[9px] text-zinc-500 font-sans">Create a list with numbering.</p>
              </div>
            </EditorCommandItem>
            <EditorCommandItem
              value="Blockquote"
              onCommand={({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleBlockquote().run();
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[10px] text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-zinc-400 font-bold">
                ”
              </div>
              <div>
                <p className="font-bold text-zinc-200">Blockquote</p>
                <p className="text-[9px] text-zinc-500 font-sans">Capture a quote block.</p>
              </div>
            </EditorCommandItem>
            <EditorCommandItem
              value="Code Block"
              onCommand={({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[10px] text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-zinc-400 font-bold">
                &lt;&gt;
              </div>
              <div>
                <p className="font-bold text-zinc-200">Code Block</p>
                <p className="text-[9px] text-zinc-500 font-sans">Insert a syntax highlighted code block.</p>
              </div>
            </EditorCommandItem>
          </EditorCommandList>
        </EditorCommand>
      </Editor>
    </div>
  );
};

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
  const projectType = useWorkspaceStore(s => s.projectType);
  const isCode = /\.(ts|tsx|js|jsx|css|json|py|sh|yml|yaml|sql)$/.test(fileName);
  
  const isCodeType = projectType === 'coding' || projectType === 'deploy';
  const showNovel = projectType === 'writing' || (!isCodeType && !isCode);
  const containerType = showNovel ? 'DOCS' : 'MONACO';

  const [activeTab, setActiveTab] = useState<'editor' | 'chat'>('editor');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiTyping]);

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
    type: showNovel ? 'markdown-editor' : 'code-editor',
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

  return (
    <SmartContainer 
      type={containerType} 
      title={showNovel ? "Document Editor" : `Code: ${fileName}`}
      contextId={fileName}
      selectedRoleId={roleId}
      onRoleSelect={onRoleChange}
      extraActions={
          <div className="flex items-center gap-1.5">
             <button type="button" onClick={() => { 
                void navigator.clipboard.writeText(content).then(() => toast.success('Copied'));
             }} title="Copy All" className="hover:text-[var(--text-primary)] transition-colors"><Copy size={10}/></button>
             {onRun && <button type="button" onClick={() => onRun()} title="Run Agent (Ctrl+Enter)" className="hover:text-[var(--text-primary)] transition-colors"><Play size={10}/></button>}
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
          if (activeTab === 'chat') {
            setChatMessages(prev => [...prev, { role: 'assistant', content: "I have updated the file with the changes." }]);
          }
          onChange(targetContent);
        }
      }}
    >
      {(registerContext) => {
        registerContext(() => content);

        return (
          <div className="h-full w-full bg-zinc-900 flex flex-col relative group">
            
            {/* EditorHeader Tab-bar */}
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-2 text-zinc-300 relative z-30 shrink-0 select-none">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <FileText size={12} className="text-zinc-500" />
                  <span className="text-xs font-bold text-zinc-100 font-mono truncate max-w-[200px]">{fileName.split('/').pop() || fileName}</span>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center bg-zinc-900 border border-zinc-850 p-0.5 rounded-md">
                  <button
                    type="button"
                    onClick={() => setActiveTab('editor')}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all flex items-center gap-1.5 ${
                      activeTab === 'editor'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <FileText size={10} />
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('chat')}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all flex items-center gap-1.5 ${
                      activeTab === 'chat'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Sparkles size={10} className={activeTab === 'chat' ? 'text-amber-400 animate-pulse' : 'text-zinc-500'} />
                    AI Chat
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                {activeTab === 'editor' ? (
                  showNovel ? "Notion Mode" : "Monaco Mode"
                ) : "AI Assistant Mode"}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden min-h-0 relative">
              {activeTab === 'editor' ? (
                showNovel ? (
                  /* Composed Novel Editor */
                  <div className="flex-1 min-w-0 bg-zinc-900 overflow-y-auto p-4 relative h-full w-full">
                    {isAiTyping && (
                      <div className="absolute bottom-4 right-4 z-50 flex items-center gap-2 bg-purple-900/80 text-purple-400 px-2 py-1 rounded text-xs border border-purple-700 backdrop-blur-sm shadow-xl animate-pulse">
                        <Bot size={12} />
                        <span className="font-bold">AI Syncing...</span>
                      </div>
                    )}
                    <EditorRoot>
                      <ComposedEditor 
                        content={content} 
                        fileName={fileName} 
                        onChange={onChange} 
                        onRun={onRun ? () => onRun() : undefined}
                        onNavigate={onNavigate}
                      />
                    </EditorRoot>
                  </div>
                ) : (
                  /* Monaco Editor */
                  <div className="h-full w-full relative flex flex-col">
                    {isAiTyping && (
                      <div className="absolute top-2 right-4 z-50 flex items-center gap-2 bg-emerald-900/80 text-emerald-400 px-2 py-1 rounded text-xs border border-emerald-700 backdrop-blur-sm shadow-lg animate-pulse">
                        <Bot size={12} />
                        <span className="font-bold">AI Refactoring...</span>
                      </div>
                    )}
                    
                    <MonacoEditor
                      value={content}
                      onChange={(val) => onChange(val || '')}
                      language={
                        fileName.endsWith('.tsx')
                          ? 'typescript'
                          : fileName.endsWith('.jsx')
                          ? 'javascript'
                          : fileName.split('.').pop() || 'text'
                      }
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
                )
              ) : (
                /* Full-width Chat Interface */
                <div className="flex-1 bg-zinc-950 flex flex-col h-full w-full animate-in fade-in duration-200">
                  <div className="h-9 border-b border-zinc-900 flex items-center px-4 bg-zinc-900/40 justify-between shrink-0">
                    <span className="text-[9px] font-black tracking-widest text-zinc-400 uppercase flex items-center gap-1.5 font-mono">
                      <Sparkles size={10} className="text-amber-400 animate-pulse" />
                      AI Chat Assistant
                    </span>
                  </div>

                  {/* Messages list */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
                    {chatMessages.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 opacity-60 max-w-md mx-auto">
                        <Bot size={32} className="text-amber-400 animate-bounce" />
                        <p className="text-xs font-bold text-zinc-200 uppercase tracking-widest font-mono">Ask EVAIX AI</p>
                        <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
                          Ask questions, describe changes, or request code generation. Modifications are written directly back to the editor virtual file.
                        </p>
                      </div>
                    )}

                    {chatMessages.map((msg, index) => {
                      const isUser = msg.role === 'user';
                      return (
                        <div key={index} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                          {!isUser && (
                            <div className="w-6 h-6 rounded-full bg-purple-950/50 border border-purple-500/30 flex items-center justify-center shrink-0">
                              <Bot size={12} className="text-purple-400" />
                            </div>
                          )}
                          <div className={`max-w-[75%] rounded-lg p-3 text-[11px] leading-relaxed font-mono ${
                            isUser 
                              ? 'bg-[var(--color-primary)] text-black font-semibold rounded-br-none shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.15)]' 
                              : 'bg-zinc-900 border border-zinc-850 text-zinc-300 rounded-bl-none'
                          }`}>
                            {msg.content}
                          </div>
                          {isUser && (
                            <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-750 flex items-center justify-center shrink-0">
                              <User size={12} className="text-zinc-300" />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {isAiTyping && (
                      <div className="flex gap-3 justify-start">
                        <div className="w-6 h-6 rounded-full bg-purple-950/50 border border-purple-500/30 flex items-center justify-center shrink-0 animate-pulse">
                          <Bot size={12} className="text-purple-400" />
                        </div>
                        <div className="bg-zinc-900 border border-zinc-850 text-zinc-400 rounded-lg rounded-bl-none p-3 text-[11px] flex items-center gap-2">
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
                  <div className="p-4 border-t border-zinc-900 bg-zinc-950 flex flex-col gap-2 shrink-0">
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
                    
                    <div className="flex gap-2 items-center bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-zinc-550 hover:text-zinc-300 transition-colors p-1"
                        title="Attach files or images"
                      >
                        <Paperclip size={14} />
                      </button>
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask AI assistant..."
                        className="flex-1 bg-transparent border-none text-[11px] text-white outline-none placeholder:text-zinc-655 font-mono"
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
                        className="text-[var(--color-primary)] hover:opacity-85 disabled:opacity-30 p-1 transition-all"
                      >
                        <Send size={14} />
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
