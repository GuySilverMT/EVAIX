import { useState, useEffect } from 'react';
import { Mic, Scissors, Copy, Clipboard, Type } from 'lucide-react';

interface ContextMenuItem {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  separator?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  targetElement: HTMLElement;
  onVoiceInput: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  targetElement,
  onVoiceInput,
}) => {
  const [menuItems, setMenuItems] = useState<ContextMenuItem[]>([]);

  useEffect(() => {
    const isInput = targetElement instanceof HTMLInputElement || 
                    targetElement instanceof HTMLTextAreaElement ||
                    targetElement.contentEditable === 'true';

    const items: ContextMenuItem[] = [];

    if (isInput) {
      // Text editing commands
      items.push({
        label: 'Cut',
        icon: <Scissors className="w-4 h-4" />,
        action: () => {
          document.execCommand('cut');
          onClose();
        },
      });

      items.push({
        label: 'Copy',
        icon: <Copy className="w-4 h-4" />,
        action: () => {
          document.execCommand('copy');
          onClose();
        },
      });

      items.push({
        label: 'Paste',
        icon: <Clipboard className="w-4 h-4" />,
        action: () => {
          void (async () => {
            try {
              const text = await navigator.clipboard.readText();
              document.execCommand('insertText', false, text);
            } catch (err) {
              console.error('Failed to paste:', err);
            }
            onClose();
          })();
        },
      });

      items.push({
        label: 'Select All',
        icon: <Type className="w-4 h-4" />,
        action: () => {
          document.execCommand('selectAll');
          onClose();
        },
      });

      items.push({
        label: '',
        icon: null,
        action: () => {},
        separator: true,
      });

      // Voice input
      items.push({
        label: 'Voice Input',
        icon: <Mic className="w-4 h-4 text-red-500" />,
        action: () => {
          onVoiceInput();
          onClose();
        },
      });
    }

    setMenuItems(items);
  }, [targetElement, onClose, onVoiceInput]);

  // Close on click outside
  useEffect(() => {
    const handleClick = () => onClose();
    setTimeout(() => document.addEventListener('click', handleClick), 0);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed z-[10000] bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl py-1 min-w-[180px]"
      style={{ left: `${x}px`, top: `${y}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      {menuItems.map((item, index) => 
        item.separator ? (
          <div key={index} className="h-px bg-zinc-700 my-1" />
        ) : (
          <button
            key={index}
            onClick={item.action}
            className="w-full px-3 py-2 flex items-center gap-3 hover:bg-zinc-800 transition-colors text-left text-sm text-zinc-200"
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        )
      )}
    </div>
  );
};

export default ContextMenu;
