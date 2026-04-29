
import { useEffect } from 'react';
import { useBuilderStore, type BuilderAction } from '../stores/builder.store.js';

// A simple key matcher
const matchKey = (event: KeyboardEvent, pattern: string) => {
  const parts = pattern.toLowerCase().split('+');
  const key = parts.pop();
  const meta = parts.includes('meta') || parts.includes('cmd') || parts.includes('ctrl') && window.navigator.platform.includes('Mac');
  const ctrl = parts.includes('ctrl') && !window.navigator.platform.includes('Mac');
  const shift = parts.includes('shift');
  const alt = parts.includes('alt');

  // Match modifiers
  const hasMeta = event.metaKey;
  const hasCtrl = event.ctrlKey;
  const hasShift = event.shiftKey;
  const hasAlt = event.altKey;

  // Simple logic for Meta/Ctrl cross-platform
  const isCmdOrCtrl = parts.includes('meta') || parts.includes('ctrl');
  if (isCmdOrCtrl) {
    const pressedCmdOrCtrl = hasMeta || hasCtrl;
    if (!pressedCmdOrCtrl) return false;
  } else {
      if (meta && !hasMeta) return false;
      if (ctrl && !hasCtrl) return false;
  }
  
  if (shift && !hasShift) return false;
  if (alt && !hasAlt) return false;
  
  return event.key.toLowerCase() === key;
};

export const useBuilderHotkeys = (handlers: Partial<Record<BuilderAction, () => void>>) => {
  const { keyMap } = useBuilderStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      for (const [action, binding] of Object.entries(keyMap)) {
        if (binding.keys.some(k => matchKey(e, k))) {
          const handler = handlers[action as BuilderAction];
          if (handler) {
              e.preventDefault();
              handler();
              return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyMap, handlers]);
};
