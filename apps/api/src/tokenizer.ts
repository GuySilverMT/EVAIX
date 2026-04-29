// A simple placeholder for tokenization.
// In the future, this should be replaced with a more accurate
// tokenization library that supports multiple providers.

export const countTokens = (text: string): number => {
    // This is a very rough approximation.
    return text.split(/\s+/).length;
};
