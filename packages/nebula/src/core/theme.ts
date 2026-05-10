export interface NebulaTheme {
  [key: string]: any;
}

export const DEFAULT_THEME: NebulaTheme = {
  colors: {
    primary: "#0f172a",
    secondary: "#64748b",
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#020617",
    border: "#e2e8f0",
  },
  typography: {
    fontFamily: "Inter, system-ui, sans-serif",
    baseSize: "16px",
    headingScale: 1.2,
  },
  shape: {
    radius: "0.5rem",
    borderWidth: "1px",
  },
  spacing: {
    unit: 4,
  },
};
