/**
 * Parses input from the browser omnibox.
 * Returns a valid URL if the input looks like one, otherwise returns a search query URL.
 */
export const parseOmniboxInput = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return 'https://duckduckgo.com';

  // Basic URL regex: starts with protocol, or matches domain pattern
  const isUrl = /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,6}\b)(\/[\w.-]*)*\/?$/.test(trimmed) || 
                trimmed.startsWith('localhost:') || 
                trimmed.startsWith('http://localhost') ||
                /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(trimmed); // IP address

  if (isUrl) {
    if (trimmed.startsWith('http')) return trimmed;
    return `https://${trimmed}`;
  }

  // Fallback to search
  return `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`;
};
