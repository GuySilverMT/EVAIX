import { designTokens } from '../theme/design-tokens.js';

function flattenTokens(obj: Record<string, unknown>, prefix = '--'): Record<string, string> {
  return Object.keys(obj).reduce((acc, key) => {
    const value = obj[key];
    const kebabKey = key.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
    const newPrefix = prefix === '--' ? `--${kebabKey}` : `${prefix}-${kebabKey}`;

    if (typeof value === 'string' || typeof value === 'number') {
      acc[newPrefix] = String(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(acc, flattenTokens(value as Record<string, unknown>, newPrefix));
    }
    return acc;
  }, {} as Record<string, string>);
}

export const cssVariables = flattenTokens(designTokens);

export function injectCssVariables() {
  const root = document.documentElement;
  Object.entries(cssVariables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}
