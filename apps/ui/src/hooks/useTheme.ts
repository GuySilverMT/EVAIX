import { useThemeContext } from '../theme/ThemeProvider.js';
import { useCallback } from 'react';

// Adapter to match old hook signature if necessary, 
// or simply expose what we have if the consumer is flexible.

export const useTheme = () => {
  const { theme, setTheme: setContextTheme, resetToDefault } = useThemeContext();

  // The old useTheme might have expected different arguments, but we'll map it simple for now.
  // The context's setTheme takes Partial<Theme>
  const setTheme = useCallback((partial: any) => {
     setContextTheme(partial);
  }, [setContextTheme]);
  
  // Mock other functions if needed by legacy components
  const applyPreset = useCallback(() => console.warn('applyPreset not implemented in adapter'), []);

  return { theme, setTheme, applyPreset, resetToDefault };
};