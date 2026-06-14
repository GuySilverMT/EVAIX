import React, { useEffect, useState, useRef } from 'react';
import MonacoEditor from './MonacoEditor.js';
import { 
  Bot, Play, Copy, Paperclip, Send, Sparkles, FileText, User,
  Bold, Italic, Underline, Strikethrough, Code, Heading1, Heading2, Heading3, List, Table as TableIcon,
  Save, FolderOpen, ChevronDown, MessageSquare, AlignLeft, AlignCenter, AlignRight, ListOrdered,
  Quote, RotateCcw
} from 'lucide-react';
import { SmartContainer } from './nebula/containers/SmartContainer.js';
import { useAgenticContext } from '../hooks/useAgenticContext.js';
import { toast } from 'sonner';
import { useWorkspaceStore } from '../stores/workspace.store.js';
import { TextStyle, FontFamily, FontSize } from '@tiptap/extension-text-style';

import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';

import { StarterKit } from '@tiptap/starter-kit';
import { Underline as TiptapUnderline } from '@tiptap/extension-underline';
import { Placeholder } from '@tiptap/extension-placeholder';

import { 
  EditorRoot, 
  EditorContent as Editor,
  EditorBubble,
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  Command as NovelCommand
} from 'novel';

const writingExtensions = [
  StarterKit,
  Placeholder.configure({ placeholder: 'Start writing...' }),
  TiptapUnderline,
  NovelCommand,
  TextStyle,
  FontFamily,
  FontSize,
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell
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

// Compact divider
const Sep = () => <span className="w-px h-3.5 bg-zinc-700 mx-0.5 shrink-0" />;

// Unified single-line formatting + nav bar rendered above the Novel editor
const UnifiedEditorBar = ({
  editor, fileName, onFileNameChange, onSave, onOpen,
  activeTab, onTabChange, onRun, isAiTyping, showNovel,
  onCopy, content
}: {
  editor: any;
  fileName: string;
  onFileNameChange: (n: string) => void;
  onSave: () => void;
  onOpen: () => void;
  activeTab: 'editor' | 'chat';
  onTabChange: (t: 'editor' | 'chat') => void;
  onRun?: () => void;
  isAiTyping?: boolean;
  showNovel: boolean;
  onCopy: () => void;
  content: string;
}) => {
  const btn = (active: boolean) =>
    `p-0.5 rounded transition-colors ${
      active ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
    }`;

  return (
    <div className="flex items-center gap-1 border-b border-zinc-800 bg-zinc-950 px-1.5 py-0.5 shrink-0 min-h-0 overflow-x-auto" style={{ height: '28px' }}>
      {/* File name editable */}
      <FileText size={10} className="text-zinc-600 shrink-0" />
      <input
        type="text"
        value={fileName.split('/').pop() || fileName}
        onChange={e => onFileNameChange(e.target.value)}
        className="w-24 bg-transparent text-[10px] text-zinc-300 font-mono outline-none border-none min-w-0 truncate"
        title="File name"
      />
      <button type="button" onClick={onSave} title="Save" className={btn(false)}><Save size={10} /></button>
      <button type="button" onClick={onOpen} title="Open file" className={btn(false)}><FolderOpen size={10} /></button>

      <Sep />

      {/* Editor / Chat toggle (icons only) */}
      <button type="button" onClick={() => onTabChange('editor')} title="Editor" className={btn(activeTab === 'editor')}>
        <AlignLeft size={10} />
      </button>
      <button type="button" onClick={() => onTabChange('chat')} title="AI Chat" className={btn(activeTab === 'chat')}>
        <MessageSquare size={10} />
      </button>

      {/* Formatting — only in novel/editor mode */}
      {showNovel && activeTab === 'editor' && editor && (
        <>
          <Sep />
          {/* Font family */}
          <select
            onChange={e => {
              const v = e.target.value;
              v === 'default'
                ? (editor.chain().focus() as any).unsetFontFamily().run()
                : (editor.chain().focus() as any).setFontFamily(v).run();
            }}
            className="bg-zinc-900 border-0 text-zinc-400 text-[9px] rounded outline-none py-0 px-0.5 h-4 font-mono"
            title="Font"
          >
            <option value="default">Font</option>
            <option value="sans-serif">Sans</option>
            <option value="serif">Serif</option>
            <option value="monospace">Mono</option>
            <option value="cursive">Script</option>
          </select>
          {/* Font size */}
          <select
            onChange={e => {
              const v = e.target.value;
              v === 'default'
                ? (editor.chain().focus() as any).unsetFontSize().run()
                : (editor.chain().focus() as any).setFontSize(v).run();
            }}
            className="bg-zinc-900 border-0 text-zinc-400 text-[9px] rounded outline-none py-0 px-0.5 h-4 w-10 font-mono"
            title="Size"
          >
            <option value="default">Sz</option>
            <option value="11px">11</option>
            <option value="13px">13</option>
            <option value="15px">15</option>
            <option value="18px">18</option>
            <option value="22px">22</option>
            <option value="28px">28</option>
          </select>
          <Sep />
          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))} title="Bold"><Bold size={10}/></button>
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))} title="Italic"><Italic size={10}/></button>
          <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive('underline'))} title="Underline"><Underline size={10}/></button>
          <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive('strike'))} title="Strike"><Strikethrough size={10}/></button>
          <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={btn(editor.isActive('code'))} title="Code"><Code size={10}/></button>
          <Sep />
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`${btn(editor.isActive('heading', {level:1}))} text-[9px] font-bold px-0.5`} title="H1">H1</button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`${btn(editor.isActive('heading', {level:2}))} text-[9px] font-bold px-0.5`} title="H2">H2</button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`${btn(editor.isActive('heading', {level:3}))} text-[9px] font-bold px-0.5`} title="H3">H3</button>
          <Sep />
          <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))} title="Bullet list"><List size={10}/></button>
          <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))} title="Numbered list"><ListOrdered size={10}/></button>
          <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className={btn(false)} title="Insert table"><TableIcon size={10}/></button>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Copy + Run */}
      <button type="button" onClick={onCopy} title="Copy content" className={btn(false)}><Copy size={10}/></button>
      {onRun && (
        <button
          type="button"
          onClick={onRun}
          disabled={isAiTyping}
          title="Run Agent"
          className="flex items-center gap-0.5 px-1.5 h-5 text-[9px] font-bold rounded bg-[var(--color-primary)] text-black hover:opacity-90 disabled:opacity-40 transition-all shrink-0"
        >
          <Play size={9} fill="currentColor" />
          Run
        </button>
      )}
    </div>
  );
};


const ComposedEditor = ({ 
  content, 
  fileName, 
  onChange, 
  onRun, 
  onNavigate,
  onEditorReady 
}: { 
  content: string; 
  fileName: string; 
  onChange: (val: string) => void; 
  onRun?: (goal?: string) => void; 
  onNavigate?: (url: string) => void;
  onEditorReady?: (editor: any) => void;
}) => {
  // Capture the editor via onCreate — never block EditorContent from mounting
  const [capturedEditor, setCapturedEditor] = useState<any>(null);

  // Content sync from outside prop changes
  useEffect(() => {
    if (capturedEditor && !capturedEditor.isDestroyed && !capturedEditor.isFocused) {
      if (!content) {
        capturedEditor.commands.setContent('');
        return;
      }
      try {
        if (fileName.endsWith('.json')) {
          const json = JSON.parse(content);
          capturedEditor.commands.setContent(json);
        } else {
          capturedEditor.commands.setContent(content);
        }
      } catch (e) {
        capturedEditor.commands.setContent(content);
      }
    }
  }, [content, capturedEditor, fileName]);

  return (
    <div className="flex flex-col w-full h-full border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950 shadow-sm relative z-0">
      <TextFormattingBar editor={capturedEditor} />
      <style>{`
        .prose ins {
          text-decoration: none;
          background-color: rgba(16, 185, 129, 0.2);
          color: #34d399;
          padding: 0.1em 0.2em;
          border-radius: 0.2em;
        }
        .prose del {
          text-decoration: line-through;
          background-color: rgba(239, 68, 68, 0.2);
          color: #f87171;
          padding: 0.1em 0.2em;
          border-radius: 0.2em;
        }
        .prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }
        .prose th, .prose td {
          border: 1px solid #3f3f46;
          padding: 0.5rem;
        }
        .prose th {
          background-color: #27272a;
        }
      `}</style>
      <div className="w-full h-full min-h-[500px] overflow-y-auto text-white bg-zinc-950">
        <Editor
          className="prose prose-invert max-w-none focus:outline-none min-h-[500px] w-full text-zinc-300 text-sm font-sans"
          initialContent={fileName.endsWith('.json') ? (content ? JSON.parse(content) : undefined) : undefined}
          extensions={writingExtensions}
          editorProps={{
            attributes: {
              class: 'focus:outline-none prose prose-invert max-w-none text-zinc-300 text-sm min-h-[500px] w-full h-full p-4',
            },
            handleDOMEvents: {
              keydown: (_view, event) => {
                if (event.key === 'Enter' && (event.shiftKey || event.ctrlKey || event.altKey)) {
                  event.preventDefault();
                  onRun && onRun();
                  return true;
                }
                return false;
              },
              click: (_view, event) => {
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
          onCreate={({ editor }) => {
            setCapturedEditor(editor);
            onEditorReady?.(editor);
          }}
          onUpdate={({ editor }) => {
            setCapturedEditor(editor);
            onEditorReady?.(editor);
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
                  (capturedEditor?.chain().focus() as any)?.unsetFontFamily().run();
                } else {
                  (capturedEditor?.chain().focus() as any)?.setFontFamily(val).run();
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
                  (capturedEditor?.chain().focus() as any)?.unsetFontSize().run();
                } else {
                  (capturedEditor?.chain().focus() as any)?.setFontSize(val).run();
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
              onClick={() => capturedEditor?.chain().focus().toggleBold().run()}
              className={`p-1 rounded hover:bg-zinc-800 transition-colors ${capturedEditor?.isActive('bold') ? 'text-[var(--color-primary)] bg-zinc-800' : 'text-zinc-400'}`}
              title="Bold"
            >
              <Bold size={11} />
            </button>
            <button
              type="button"
              onClick={() => capturedEditor?.chain().focus().toggleItalic().run()}
              className={`p-1 rounded hover:bg-zinc-800 transition-colors ${capturedEditor?.isActive('italic') ? 'text-[var(--color-primary)] bg-zinc-800' : 'text-zinc-400'}`}
              title="Italic"
            >
              <Italic size={11} />
            </button>
            <button
              type="button"
              onClick={() => capturedEditor?.chain().focus().toggleUnderline().run()}
              className={`p-1 rounded hover:bg-zinc-800 transition-colors ${capturedEditor?.isActive('underline') ? 'text-[var(--color-primary)] bg-zinc-800' : 'text-zinc-400'}`}
              title="Underline"
            >
              <Underline size={11} />
            </button>
            <button
              type="button"
              onClick={() => capturedEditor?.chain().focus().toggleStrike().run()}
              className={`p-1 rounded hover:bg-zinc-800 transition-colors ${capturedEditor?.isActive('strike') ? 'text-[var(--color-primary)] bg-zinc-800' : 'text-zinc-400'}`}
              title="Strikethrough"
            >
              <Strikethrough size={11} />
            </button>
            <button
              type="button"
              onClick={() => capturedEditor?.chain().focus().toggleCode().run()}
              className={`p-1 rounded hover:bg-zinc-800 transition-colors ${capturedEditor?.isActive('code') ? 'text-[var(--color-primary)] bg-zinc-800' : 'text-zinc-400'}`}
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

  const [activeTab, setActiveTab] = useState<'editor' | 'chat'>('editor');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [localFileName, setLocalFileName] = useState(fileName);
  // Editor instance lifted so UnifiedEditorBar can reach it
  const [liftedEditor, setLiftedEditor] = useState<any>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, isAiTyping]);

  const handleSendMessage = (text: string) => {
    if (!text.trim() || isAiTyping) return;
    setChatMessages(prev => [...prev, { role: 'user', content: text }]);
    setChatInput('');
    if (onRun) onRun(text);
  };

  useAgenticContext({
    id: cardId || fileName,
    type: showNovel ? 'markdown-editor' : 'code-editor',
    title: fileName,
    defaultIncluded: true,
    getContext: async () => ({ format: 'markdown', content: content || '' }),
    applyMutation: async (mutation) => {
      if (mutation.action === 'REWRITE') { onChange(mutation.content); return true; }
      return false;
    }
  });

  return (
    <div className="h-full w-full flex flex-col bg-zinc-900 overflow-hidden">
      {/* Hidden file inputs */}
      <input type="file" ref={fileInputRef} className="hidden" onChange={e => {
        const f = e.target.files?.[0]; if (f) toast.success(`Attached: ${f.name}`);
      }} />
      <input type="file" ref={openFileRef} accept=".md,.txt,.html,.json" className="hidden" onChange={e => {
        const f = e.target.files?.[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = ev => { if (ev.target?.result) onChange(ev.target.result as string); };
        reader.readAsText(f);
        toast.success(`Opened: ${f.name}`);
      }} />

      {/* ONE unified bar */}
      <UnifiedEditorBar
        editor={liftedEditor}
        fileName={localFileName}
        onFileNameChange={setLocalFileName}
        onSave={() => { void navigator.clipboard.writeText(content).then(() => toast.success('Copied to clipboard')); }}
        onOpen={() => openFileRef.current?.click()}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRun={onRun ? () => onRun() : undefined}
        isAiTyping={isAiTyping}
        showNovel={showNovel}
        onCopy={() => void navigator.clipboard.writeText(content).then(() => toast.success('Copied'))}
        content={content}
      />

      {/* Content area */}
      <div className="flex-1 overflow-hidden min-h-0">
        {activeTab === 'editor' ? (
          showNovel ? (
            <div className="h-full w-full bg-zinc-950 overflow-y-auto relative">
              {isAiTyping && (
                <div className="absolute bottom-3 right-3 z-50 flex items-center gap-1.5 bg-purple-900/80 text-purple-300 px-2 py-1 rounded text-[10px] border border-purple-700 backdrop-blur-sm animate-pulse">
                  <Bot size={10} /><span className="font-bold">AI Syncing...</span>
                </div>
              )}
              <EditorRoot>
                <ComposedEditor
                  content={content}
                  fileName={localFileName}
                  onChange={onChange}
                  onRun={onRun ? () => onRun() : undefined}
                  onNavigate={onNavigate}
                  onEditorReady={setLiftedEditor}
                />
              </EditorRoot>
            </div>
          ) : (
            <div className="h-full w-full relative">
              {isAiTyping && (
                <div className="absolute top-2 right-3 z-50 flex items-center gap-1.5 bg-emerald-900/80 text-emerald-300 px-2 py-1 rounded text-[10px] border border-emerald-700 backdrop-blur-sm animate-pulse">
                  <Bot size={10} /><span className="font-bold">AI Refactoring...</span>
                </div>
              )}
              <MonacoEditor
                value={content}
                onChange={val => onChange(val || '')}
                language={fileName.endsWith('.tsx') ? 'typescript' : fileName.endsWith('.jsx') ? 'javascript' : fileName.split('.').pop() || 'text'}
                theme="vs-dark"
                options={{ minimap: { enabled: true }, wordWrap: 'on', readOnly: isAiTyping }}
              />
            </div>
          )
        ) : (
          /* Chat panel */
          <div className="flex-1 bg-zinc-950 flex flex-col h-full animate-in fade-in duration-200">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 opacity-60">
                  <Bot size={28} className="text-amber-400 animate-bounce" />
                  <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest font-mono">Ask EVAIX AI</p>
                  <p className="text-[10px] text-zinc-500 font-mono">Describe changes or ask questions. Edits go directly to the file.</p>
                </div>
              )}
              {chatMessages.map((msg, i) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={i} className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && <div className="w-5 h-5 rounded-full bg-purple-950 border border-purple-500/30 flex items-center justify-center shrink-0"><Bot size={10} className="text-purple-400" /></div>}
                    <div className={`max-w-[80%] rounded px-2.5 py-1.5 text-[10px] leading-relaxed font-mono ${isUser ? 'bg-[var(--color-primary)] text-black font-semibold' : 'bg-zinc-900 border border-zinc-800 text-zinc-300'}`}>{msg.content}</div>
                    {isUser && <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0"><User size={10} className="text-zinc-300" /></div>}
                  </div>
                );
              })}
              {isAiTyping && (
                <div className="flex gap-2">
                  <div className="w-5 h-5 rounded-full bg-purple-950 border border-purple-500/30 flex items-center justify-center shrink-0 animate-pulse"><Bot size={10} className="text-purple-400" /></div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 flex gap-1">
                    {[0,150,300].map(d => <span key={d} className="w-1 h-1 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="px-3 py-2 border-t border-zinc-800 bg-zinc-950 flex gap-2 items-center shrink-0">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-zinc-600 hover:text-zinc-400 transition-colors"><Paperclip size={12} /></button>
              <input
                type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                placeholder="Ask AI assistant..."
                className="flex-1 bg-transparent text-[10px] text-white outline-none placeholder:text-zinc-600 font-mono"
                onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(chatInput); }}
              />
              <button type="button" onClick={() => handleSendMessage(chatInput)} disabled={!chatInput.trim() || isAiTyping} className="text-[var(--color-primary)] hover:opacity-80 disabled:opacity-30 transition-all"><Send size={12} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartEditor;

