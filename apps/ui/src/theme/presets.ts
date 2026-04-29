import type { Theme } from './types.js';

export const darkTheme: Theme = {
  id: 'standard-dark',
  name: 'Nebula Deep',
  mode: 'dark',
  colors: {
    primary: '#06b6d4',
    secondary: '#8b5cf6',
    accent: '#d946ef',
    background: '#09090b',
    surface: '#18181b',
    text: '#ffffff',
    textMuted: '#94a3b8',
    border: '#27272a',
  },
  gradients: {
    enabled: true,
    primary: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
    secondary: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
    surface: 'rgba(24, 24, 27, 0.8)',
  },
  visual: {
    borderRadius: 8,
    borderWidth: 1,
    opacity: 1,
    blur: 12,
  },
  assets: {
    fonts: {
      urls: ['https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono&display=swap'],
      mappings: {
        heading: 'Inter',
        body: 'Inter',
        mono: 'JetBrains Mono',
      },
    },
    icons: {
      provider: 'lucide',
      customMap: {},
      tokenMap: {
        'action.save': 'Save',
        'action.delete': 'Trash2',
        'nav.home': 'Home',
        'nav.settings': 'Settings',
        'status.error': 'AlertCircle',
        'status.success': 'CheckCircle',
      },
    },
  },
  components: {
    menuBar: {
      height: '3.5rem',
      background: 'rgba(24, 24, 27, 0.8)',
      backdropBlur: '12px',
      itemGap: '0.5rem',
      fontSize: '10px',
    },
    floatingNav: {
      buttonSize: '3rem',
      iconSize: '1.25rem',
      radius: '9999px',
      background: 'rgba(24, 24, 27, 0.9)',
      offsetBottom: '2rem',
      offsetLeft: '2rem',
    }
  },
  ai: {
    intents: {
      code: '#3b82f6',      // blue-500
      terminal: '#a855f7',  // purple-500
      browser: '#f97316',   // orange-500
      docs: '#10b981',      // emerald-500
      chat: '#ec4899',      // pink-500
    }
  },
  timestamp: Date.now(),
};

export const lightTheme: Theme = {
  id: 'standard-light',
  name: 'Nebula Light',
  mode: 'light',
  colors: {
    primary: '#2563eb',
    secondary: '#7c3aed',
    accent: '#db2777',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#0f172a',
    textMuted: '#475569',
    border: '#e2e8f0',
  },
  gradients: {
    enabled: false,
    primary: '',
    secondary: '',
    surface: '',
  },
  visual: {
    borderRadius: 8,
    borderWidth: 1,
    opacity: 1,
    blur: 0,
  },
  assets: {
    fonts: {
      urls: ['https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'],
      mappings: {
        heading: 'Inter',
        body: 'Inter',
        mono: 'monospace',
      },
    },
    icons: {
      provider: 'lucide',
      customMap: {},
      tokenMap: {
        'action.save': 'Save',
        'action.delete': 'Trash2',
        'nav.home': 'Home',
        'nav.settings': 'Settings',
        'status.error': 'AlertCircle',
        'status.success': 'CheckCircle',
      },
    },
  },
  components: {
    menuBar: {
      height: '3.5rem',
      background: 'rgba(255, 255, 255, 0.8)',
      backdropBlur: '12px',
      itemGap: '0.5rem',
      fontSize: '10px',
    },
    floatingNav: {
      buttonSize: '3rem',
      iconSize: '1.25rem',
      radius: '9999px',
      background: 'rgba(255, 255, 255, 0.9)',
      offsetBottom: '2rem',
      offsetLeft: '2rem',
    }
  },
  ai: {
    intents: {
      code: '#2563eb',      // blue-600
      terminal: '#9333ea',  // purple-600
      browser: '#ea580c',   // orange-600
      docs: '#16a34a',      // emerald-600
      chat: '#db2777',      // pink-600
    }
  },
  timestamp: Date.now(),
};

export const presets: Record<string, Theme> = {
  dark: darkTheme,
  light: lightTheme,
};

export const defaultTheme = darkTheme;
