export type ThemeMode = 'light' | 'dark';

// 1. ASSETS: The key to "Importing" things without code changes
export interface ThemeAssets {
  fonts: {
    // e.g. "Google Inter": "https://fonts.googleapis.com/css2?family=Inter..."
    urls: string[]; 
    // Maps semantic names to actual font families
    mappings: {
      heading: string;
      body: string;
      mono: string;
    };
  };
  icons: {
    // The library: 'lucide' | 'custom-svg' | 'cdn-class'
    provider: 'lucide' | 'custom'; 
    // If custom, map token -> SVG string path
    customMap: Record<string, string>; 
    // Map semantic token -> icon name (e.g. "action.save" -> "Save")
    tokenMap: Record<string, string>;
  };
}

export interface ThemeGradients {
  enabled: boolean;
  primary: string;   // e.g. "linear-gradient(to right, #...)"
  secondary: string;
  surface: string;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
}

export interface VisualSettings {
  borderRadius: number;
  borderWidth: number;
  opacity: number;
  blur: number; // Backdrop blur px
}

export interface ThemeComponents {
  menuBar: {
    height: string;
    background: string;
    backdropBlur: string;
    itemGap: string;
    fontSize: string;
  };
  floatingNav: {
    buttonSize: string;
    iconSize: string;
    radius: string;
    background: string;
    offsetBottom: string;
    offsetLeft: string;
  };
}

export interface Theme {
  id: string;
  name: string;
  mode: ThemeMode;
  colors: ThemeColors;
  gradients: ThemeGradients;
  visual: VisualSettings;
  assets: ThemeAssets;
  components: ThemeComponents;
  ai: {
    intents: {
      code: string;
      terminal: string;
      browser: string;
      docs: string;
      chat: string;
    };
  };
  timestamp: number; // For versioning
}

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Partial<Theme>) => void;
  resetToDefault: () => void;
}