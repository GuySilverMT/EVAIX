# DoMoreAI Design Contract v2.0
## Paste this at the START of every AI coding session

---

## WHAT THIS APP IS

**DoMoreAI** is a dark, professional AI agent workbench. NOT a SaaS app. NOT a dashboard.
It has a distinct identity: dark zinc surfaces, CSS variable theming, dense information 
layout, terminal/cyberpunk aesthetic.

**Gold standard page: `AgentWorkbench.tsx`** — when in doubt, make it look like that.

**DO NOT confuse DoMoreAI pages with Nebula.** 
- DoMoreAI pages live in `apps/ui/src/pages/` — this is the workbench shell
- Nebula lives in `apps/ui/src/nebula/` — it's a separate UI builder tool
- These have separate theme systems. Don't mix them.

---

## THE THEME SYSTEM — HOW IT ACTUALLY WORKS

The active theme object (`presets.ts → darkTheme`) has these color keys:

```ts
theme.colors = {
  primary:    '#06b6d4',   // cyan
  secondary:  '#8b5cf6',   // violet
  accent:     '#d946ef',   // fuchsia
  background: '#09090b',   // near-black
  surface:    '#18181b',   // zinc-900 (= background-secondary)
  text:       '#ffffff',
  textMuted:  '#94a3b8',   // slate-400
  border:     '#27272a',   // zinc-800
}
```

`ThemeProvider` writes these to CSS variables on `document.documentElement`.
The mapping (after the ThemeProvider fix) is:

| theme.colors key | CSS variable                    |
|------------------|---------------------------------|
| primary          | --color-primary                 |
| secondary        | --color-secondary               |
| accent           | --color-accent                  |
| background       | --color-background              |
| surface          | --color-background-secondary    |
| text             | --color-text                    |
| textMuted        | --color-text-muted              |
| textMuted        | --color-text-secondary (alias)  |
| border           | --color-border                  |

---

## ABSOLUTE RULES — NEVER BREAK THESE

### Rule 1: CSS Variables Only — No Hardcoded Colors

```
❌ NEVER:  bg-white, bg-gray-100, bg-blue-600, text-gray-900, border-gray-200
           bg-slate-800, text-zinc-100 (as primary text color)
✅ ALWAYS: bg-[var(--color-background)], text-[var(--color-text)], border-[var(--color-border)]
```

### Rule 2: The Variable Names You Must Use in JSX

```jsx
// Backgrounds
bg-[var(--color-background)]           // darkest — page bg
bg-[var(--color-background-secondary)] // slightly lighter — cards, headers, sidebars

// Text
text-[var(--color-text)]               // primary — high contrast
text-[var(--color-text-muted)]         // subdued — labels, captions, placeholders

// Borders
border-[var(--color-border)]           // standard border

// Brand / Interactive
text-[var(--color-primary)]            // primary accent
border-[var(--color-primary)]          // primary border
bg-[var(--color-primary)]/20           // primary tinted background (use /10, /20, /30)

// Status
text-[var(--color-success)]
text-[var(--color-error)]
```

### Rule 3: zinc-* Classes Are Fine for Layering

These are neutral and safe to use:
- `bg-zinc-900`, `bg-zinc-950`, `bg-zinc-800`
- `border-zinc-800`, `border-zinc-700`  
- `text-zinc-400`, `text-zinc-500` as secondary text

NEVER use: `bg-white`, `bg-gray-*`, `bg-slate-*` (light colors), `bg-blue-600` (hardcoded brand)

---

## STANDARD LAYOUT PATTERNS — COPY THESE EXACTLY

### Page Shell (use for every new page)
```tsx
<div className="flex flex-col h-full w-full bg-[var(--color-background)] text-[var(--color-text)] overflow-hidden">
  
  {/* Header — always h-14, always border-b */}
  <div className="flex-none h-14 border-b border-[var(--color-border)] flex items-center justify-between px-6 bg-[var(--color-background-secondary)]">
    <div className="flex items-center gap-3">
      <div className="p-1.5 rounded bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30">
        <SomeIcon size={16} className="text-[var(--color-primary)]" />
      </div>
      <div className="flex flex-col">
        <span className="font-bold text-sm text-[var(--color-text)] tracking-tight leading-none uppercase">
          PAGE TITLE
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase tracking-wider">
          subtitle / context
        </span>
      </div>
    </div>
    <div className="flex items-center gap-2">
      {/* actions */}
    </div>
  </div>

  {/* Content */}
  <div className="flex-1 overflow-auto p-6">
    {/* page content */}
  </div>

</div>
```

### Tab Bar
```tsx
<div className="flex-none border-b border-[var(--color-border)] bg-[var(--color-background-secondary)] px-6 flex items-center gap-1">
  {tabs.map(tab => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={cn(
        'flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all',
        active === tab.id
          ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
          : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
      )}
    >
      <tab.icon size={12} />
      {tab.label}
    </button>
  ))}
</div>
```

### Card / Panel
```tsx
<div className="bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded-lg p-4">
  {/* content */}
</div>
```

### Section Header Inside a Card
```tsx
<h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-4">
  Section Title
</h2>
```

### Primary Button
```tsx
<button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]/20 border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/30 rounded text-xs font-bold uppercase tracking-wider transition-all">
  <SomeIcon size={12} />
  Action
</button>
```

### Ghost Button
```tsx
<button className="px-3 py-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-background-secondary)] rounded text-xs transition-all">
  Action
</button>
```

### Input
```tsx
<input className="w-full bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text)] text-sm px-3 py-2 rounded font-mono focus:border-[var(--color-primary)] focus:outline-none transition-all" />
```

### Select
```tsx
<select className="bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text)] text-sm px-3 py-2 rounded focus:border-[var(--color-primary)] focus:outline-none">
```

### Sidebar + Main Split
```tsx
<div className="flex flex-1 overflow-hidden">
  <div className="w-64 flex-none border-r border-[var(--color-border)] bg-[var(--color-background-secondary)] flex flex-col overflow-hidden">
    {/* sidebar */}
  </div>
  <div className="flex-1 overflow-auto p-6">
    {/* main */}
  </div>
</div>
```

### Empty State
```tsx
<div className="flex flex-col items-center justify-center border border-dashed border-[var(--color-border)] rounded-lg p-12 gap-3">
  <SomeIcon size={32} className="text-[var(--color-text-muted)] opacity-40" />
  <p className="text-sm text-[var(--color-text-muted)]">Nothing here yet</p>
  <button className="px-4 py-2 bg-[var(--color-primary)]/20 border border-[var(--color-primary)] text-[var(--color-primary)] rounded text-xs font-bold uppercase tracking-wider hover:bg-[var(--color-primary)]/30 transition-all">
    Get Started
  </button>
</div>
```

### Status Badge
```tsx
<span className="px-2 py-0.5 rounded-full bg-[var(--color-background)] text-[var(--color-text-muted)] text-xs border border-[var(--color-border)] font-mono">
  label
</span>
```

---

## TYPOGRAPHY RULES

```
Page title (in header):  text-sm font-bold uppercase tracking-tight
Section headers:         text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]
Body text:               text-sm text-[var(--color-text)]
Secondary / captions:    text-xs text-[var(--color-text-muted)]
Micro labels:            text-[10px] text-[var(--color-text-muted)] font-mono uppercase tracking-wider
Code / paths / IDs:      font-mono text-xs text-[var(--color-primary)]
```

---

## IMPORTS TO USE

```tsx
import { cn } from '../lib/utils.js';
import { Button } from '../components/ui/button.js';
import { SomeIcon } from 'lucide-react';         // lucide ONLY for icons
import { trpc } from '../utils/trpc.js';
import { useNavigate } from 'react-router-dom';
```

---

## QUICK BAD vs GOOD REFERENCE

| ❌ Bad (Generic SaaS)                   | ✅ Good (DoMoreAI)                                        |
|-----------------------------------------|-----------------------------------------------------------|
| `bg-white rounded-lg shadow-md`         | `bg-[var(--color-background-secondary)] border border-[var(--color-border)] rounded-lg` |
| `text-gray-900`                         | `text-[var(--color-text)]`                                |
| `text-gray-500`                         | `text-[var(--color-text-muted)]`                          |
| `border-gray-200`                       | `border-[var(--color-border)]`                            |
| `bg-blue-600 text-white`                | `bg-[var(--color-primary)]/20 border border-[var(--color-primary)] text-[var(--color-primary)]` |
| `<h1 className="text-3xl text-gray-900">` | `<span className="font-bold text-sm uppercase tracking-tight text-[var(--color-text)]">` |
| `bg-gray-50` section bg                 | `bg-[var(--color-background)]`                            |
| White modal / card                      | `bg-zinc-900 border border-zinc-800`                      |
| `shadow-md` for depth                   | `border border-[var(--color-border)]` for depth           |

---

## CHECKLIST BEFORE SUBMITTING CODE

- [ ] Zero `bg-white`, `bg-gray-*`, `bg-slate-*`, `bg-blue-*` in JSX
- [ ] All colors use `var(--color-*)` or `zinc-*`
- [ ] Page has standard h-14 header with icon + title + subtitle
- [ ] Labels are UPPERCASE with tracking-wider
- [ ] Interactive elements use primary color via CSS variable
- [ ] Borders used for depth/separation, not shadows
- [ ] Empty states exist for any data-dependent views
- [ ] Does it look like AgentWorkbench? If not, reconsider.

---

*End of Design Contract v2.0*  
*This file lives at: `docs/DOMOREAI_DESIGN_CONTRACT.md`*  
*Paste the entire contents at the start of every new AI coding session.*
