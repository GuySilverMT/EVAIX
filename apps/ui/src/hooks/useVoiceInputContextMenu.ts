import { useEffect } from 'react';
import { useVoiceKeyboard } from '../contexts/VoiceKeyboardContext.js';

/**
 * Hook to enable right-click voice input on text fields
 * Usage: useVoiceInputContextMenu()
 */
export function useVoiceInputContextMenu() {
  const { openContextMenu } = useVoiceKeyboard();

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      console.log('[Voice Keyboard] Context menu on:', {
        tagName: target.tagName,
        className: target.className,
        contentEditable: target.contentEditable,
        hasProseM: target.closest('.ProseMirror') !== null,
      });
      
      // Check if target is a text input element
      const isStandardInput = 
        target instanceof HTMLInputElement && 
        (target.type === 'text' || target.type === 'search' || target.type === 'email' || target.type === 'url') ||
        target instanceof HTMLTextAreaElement;
      
      // Check for TipTap editor (contenteditable with ProseMirror class)
      const isTipTapEditor = 
        target.contentEditable === 'true' ||
        target.closest('.ProseMirror') !== null ||
        target.classList.contains('ProseMirror');
      
      // Check for Monaco editor
      const isMonacoEditor = 
        target.closest('.monaco-editor') !== null ||
        target.classList.contains('view-line');

      console.log('[Voice Keyboard] Checks:', {
        isStandardInput,
        isTipTapEditor,
        isMonacoEditor,
      });

      if (isStandardInput || isTipTapEditor || isMonacoEditor) {
        e.preventDefault();
        
        // For TipTap/Monaco, find the actual editable element
        const editableElement = isTipTapEditor 
          ? (target.closest('.ProseMirror') as HTMLElement || target)
          : isMonacoEditor
          ? (target.closest('.monaco-editor') as HTMLElement || target)
          : target;
        
        console.log('[Voice Keyboard] Opening context menu at:', e.clientX, e.clientY, editableElement);
        openContextMenu(e.clientX, e.clientY, editableElement);
      }
    };

    // Add global right-click listener
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [openContextMenu]);
}
