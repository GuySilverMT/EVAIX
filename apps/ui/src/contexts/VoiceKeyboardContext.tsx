import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface VoiceKeyboardContextType {
  isOpen: boolean;
  isContextMenuOpen: boolean;
  position: { x: number; y: number };
  targetElement: HTMLElement | null;
  openContextMenu: (x: number, y: number, target: HTMLElement) => void;
  closeContextMenu: () => void;
  openVoiceKeyboard: () => void;
  closeVoiceKeyboard: () => void;
  submitText: (text: string) => void;
}

const VoiceKeyboardContext = createContext<VoiceKeyboardContextType | undefined>(undefined);

export function VoiceKeyboardProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  const openContextMenu = useCallback((x: number, y: number, target: HTMLElement) => {
    setPosition({ x, y });
    setTargetElement(target);
    setIsContextMenuOpen(true);
  }, []);

  const closeContextMenu = useCallback(() => {
    setIsContextMenuOpen(false);
  }, []);

  const openVoiceKeyboard = useCallback(() => {
    setIsContextMenuOpen(false);
    setIsOpen(true);
  }, []);

  const closeVoiceKeyboard = useCallback(() => {
    setIsOpen(false);
    setTargetElement(null);
  }, []);

  const submitText = useCallback((text: string) => {
    if (targetElement) {
      // Handle standard input/textarea
      if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
        const start = targetElement.selectionStart || 0;
        const end = targetElement.selectionEnd || 0;
        const currentValue = targetElement.value;
        
        // Insert text at cursor position
        const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
        targetElement.value = newValue;
        
        // Trigger input event for React
        const event = new Event('input', { bubbles: true });
        targetElement.dispatchEvent(event);
        
        // Set cursor position after inserted text
        const newCursorPos = start + text.length;
        targetElement.setSelectionRange(newCursorPos, newCursorPos);
        targetElement.focus();
      }
      // Handle TipTap editor (contenteditable) - use execCommand for proper state sync
      else if (targetElement.isContentEditable || targetElement.closest('[contenteditable="true"]')) {
        targetElement.focus();
        
        // Use native execCommand which TipTap/ProseMirror hooks into automatically
        const inserted = document.execCommand('insertText', false, text);
        
        // Fallback if execCommand fails (rare in modern browsers)
        if (!inserted) {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(text));
          }
        }

        // Trigger input event for TipTap to observe
        targetElement.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    closeVoiceKeyboard();
  }, [targetElement, closeVoiceKeyboard]);

  return (
    <VoiceKeyboardContext.Provider
      value={{
        isOpen,
        isContextMenuOpen,
        position,
        targetElement,
        openContextMenu,
        closeContextMenu,
        openVoiceKeyboard,
        closeVoiceKeyboard,
        submitText,
      }}
    >
      {children}
    </VoiceKeyboardContext.Provider>
  );
}

export function useVoiceKeyboard() {
  const context = useContext(VoiceKeyboardContext);
  if (!context) {
    throw new Error('useVoiceKeyboard must be used within VoiceKeyboardProvider');
  }
  return context;
}
