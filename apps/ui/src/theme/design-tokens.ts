export const designTokens = {
  // --- CORE SYSTEM ---
  colors: {
    primary: '#8b5cf6', // Violet 500
    secondary: '#10b981', // Emerald 500
    accent: '#f59e0b', // Amber 500
    background: {
      DEFAULT: '#09090b', // Zinc 950
      secondary: '#18181b', // Zinc 900
      tertiary: '#27272a', // Zinc 800
    },
    text: {
      DEFAULT: '#f4f4f5', // Zinc 100
      secondary: '#a1a1aa', // Zinc 400
      muted: '#52525b', // Zinc 600
    },
    border: '#27272a', // Zinc 800
    error: '#ef4444',
  },
  typography: {
    fontFamily: {
      sans: 'Inter, sans-serif',
      mono: 'JetBrains Mono, monospace',
    },
  },
  
  // --- NEBULA PHYSICS (Global Geometry) ---
  layout: {
    headerHeight: '3.5rem',      // 56px
    sidebarWidth: '5rem',        // 80px
    panelGap: '0.75rem',         // 12px
    containerPadding: '1.5rem',  // 24px
  },
  shape: {
    radius: {
      sm: '0.25rem',   // 4px
      md: '0.5rem',    // 8px
      lg: '0.75rem',   // 12px
      xl: '1rem',      // 16px
      full: '9999px',
    },
    borderWidth: {
      DEFAULT: '1px',
      thick: '2px',
    },
  },
  motion: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    ease: {
      out: 'cubic-bezier(0.16, 1, 0.3, 1)', // Snappy Apple-like
    },
  },

  // --- COMPONENT SPECIFIC CONFIG ---
  // These are what ThemeManager will target to change the UI on the fly
  components: {
    menuBar: {
      height: '3.5rem',
      background: 'rgba(24, 24, 27, 0.8)',
      backdropBlur: '12px',
      itemGap: '0.5rem',
      fontSize: '10px',
    },
    floatingNav: {
      buttonSize: '3rem',        // 48px
      iconSize: '1.25rem',       // 20px
      radius: '9999px',          // Fully round by default
      background: 'rgba(24, 24, 27, 0.9)',
      offsetBottom: '2rem',
      offsetLeft: '2rem',
    }
  },
  
  // --- AI INTENT SYSTEM ---
  ai: {
    intent: {
      code: 'var(--color-blue-500)',      // Logic / Structure
      terminal: 'var(--color-purple-500)', // System / Internal
      browser: 'var(--color-orange-500)',  // External / World
      docs: 'var(--color-emerald-500)',    // Knowledge / Facts
      chat: 'var(--color-pink-500)',       // Personality / Vibe
    },
    ui: {
      toolbarBg: 'var(--bg-secondary)',    // Context Bar Background
      toolbarBorder: 'var(--border-color)' // Context Bar Separator
    }
  }
};
