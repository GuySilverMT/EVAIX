import React from 'react';
import { Editor } from '@tiptap/react';
import { 
    Bold, Italic, Underline, Strikethrough, 
    Heading1, Heading2, Heading3, 
    List, ListOrdered, 
    AlignLeft, AlignCenter, AlignRight, 
    Table, Image as ImageIcon 
} from 'lucide-react';
import { cn } from '../lib/utils.js';

interface WritingToolbarProps {
    editor: Editor;
}

export const WritingToolbar: React.FC<WritingToolbarProps> = ({ editor }) => {
    if (!editor) return null;

    const addImage = () => {
        const url = window.prompt('URL of the image:');
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    };

    const insertTable = () => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    };

    const ToolbarButton = ({ 
        onClick, 
        isActive = false, 
        icon: Icon, 
        title 
    }: { 
        onClick: () => void, 
        isActive?: boolean, 
        icon: React.ElementType, 
        title: string 
    }) => (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={cn(
                "p-1.5 rounded hover:bg-zinc-800 transition-colors text-zinc-400 flex items-center justify-center",
                isActive && "bg-zinc-800 text-[var(--color-primary)]"
            )}
        >
            <Icon size={14} />
        </button>
    );

    return (
        <div className="flex items-center gap-1 p-1 bg-zinc-950 border-b border-zinc-800 flex-wrap shrink-0">
            <ToolbarButton 
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                icon={Bold}
                title="Bold"
            />
            <ToolbarButton 
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                icon={Italic}
                title="Italic"
            />
            <ToolbarButton 
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                isActive={editor.isActive('underline')}
                icon={Underline}
                title="Underline"
            />
            <ToolbarButton 
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive('strike')}
                icon={Strikethrough}
                title="Strikethrough"
            />

            <div className="w-px h-4 bg-zinc-800 mx-1" />

            <ToolbarButton 
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive('heading', { level: 1 })}
                icon={Heading1}
                title="Heading 1"
            />
            <ToolbarButton 
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive('heading', { level: 2 })}
                icon={Heading2}
                title="Heading 2"
            />
            <ToolbarButton 
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                isActive={editor.isActive('heading', { level: 3 })}
                icon={Heading3}
                title="Heading 3"
            />

            <div className="w-px h-4 bg-zinc-800 mx-1" />

            <ToolbarButton 
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                icon={List}
                title="Bullet List"
            />
            <ToolbarButton 
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                icon={ListOrdered}
                title="Ordered List"
            />

            <div className="w-px h-4 bg-zinc-800 mx-1" />

            <ToolbarButton 
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                isActive={editor.isActive({ textAlign: 'left' })}
                icon={AlignLeft}
                title="Align Left"
            />
            <ToolbarButton 
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                isActive={editor.isActive({ textAlign: 'center' })}
                icon={AlignCenter}
                title="Align Center"
            />
            <ToolbarButton 
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                isActive={editor.isActive({ textAlign: 'right' })}
                icon={AlignRight}
                title="Align Right"
            />

            <div className="w-px h-4 bg-zinc-800 mx-1" />

            <ToolbarButton 
                onClick={insertTable}
                icon={Table}
                title="Insert Table (3x3)"
            />
            <ToolbarButton 
                onClick={addImage}
                icon={ImageIcon}
                title="Insert Image"
            />
        </div>
    );
};
