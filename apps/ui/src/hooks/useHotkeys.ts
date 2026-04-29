import { useEffect } from 'react';

interface Hotkey {
  id: string;
  action: string;
  keys: string;
}

/**
 * Hook to register global keyboard shortcuts
 * @param hotkeys - Array of hotkeys to register
 * @param handlers - Map of action names to handler functions
 */
export const useHotkeys = (hotkeys: Hotkey[], handlers: Record<string, () => void>) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Parse the key combination from each hotkey
      for (const hotkey of hotkeys) {
        if (!hotkey.keys || !hotkey.action) continue;

        const keys = hotkey.keys.toLowerCase();
        const ctrl = keys.includes('ctrl');
        const shift = keys.includes('shift');
        const alt = keys.includes('alt');
        const meta = keys.includes('meta') || keys.includes('cmd');

        // Extract the main key (last part after '+')
        const parts = keys.split('+');
        const mainKey = parts[parts.length - 1].trim();

        // Check if the event matches this hotkey
        const eventKey = event.key.toLowerCase();
        const modifiersMatch =
          event.ctrlKey === ctrl &&
          event.shiftKey === shift &&
          event.altKey === alt &&
          event.metaKey === meta;

        const keyMatches = eventKey === mainKey || event.code.toLowerCase() === mainKey.toLowerCase();

        if (modifiersMatch && keyMatches) {
          event.preventDefault();
          const handler = handlers[hotkey.action];
          if (handler) {
            handler();
          } else {
            console.warn(`No handler registered for action: ${hotkey.action}`);
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hotkeys, handlers]);
};
