import type { Theme } from './types.js';
import { presets } from './presets.js';

const STORAGE_KEY = 'nebula_themes_v1';

export const ThemeStorage = {
  // Get all saved themes + defaults
  getAll: (): Theme[] => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const customThemes = saved ? JSON.parse(saved) : [];
      // Merge defaults with custom, ensuring no ID collisions
      const allPresets = Object.values(presets);
      return [...allPresets, ...customThemes];
    } catch (e) {
      console.error("Failed to load themes", e);
      return Object.values(presets);
    }
  },

  // Save a new theme
  save: (theme: Theme) => {
    const current = ThemeStorage.getCustom();
    const updated = [...current.filter(t => t.id !== theme.id), theme];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  // Delete a custom theme
  delete: (themeId: string) => {
    const current = ThemeStorage.getCustom();
    const updated = current.filter(t => t.id !== themeId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  // Helper to get ONLY custom themes (internal use)
  getCustom: (): Theme[] => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  }
};
