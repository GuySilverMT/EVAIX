## 2024-07-08 - [Zustand `useShallow` Fallback Arrays]
**Learning:** Returning a new array literal inline inside a Zustand `useShallow` selector (e.g., `s.cards || []`) causes the strict equality check to fail on *every* store update, triggering re-renders even when the target properties haven't changed.
**Action:** Always extract static fallback objects/arrays to a stable reference (e.g., `const EMPTY_ARRAY = []` outside the selector) before using them as default values in `useShallow` or `useMemo` hooks.
