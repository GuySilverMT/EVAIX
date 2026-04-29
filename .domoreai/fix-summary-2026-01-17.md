# Fix Summary - 2026-01-17

## Issues Fixed

### 1. ✅ Screenspace Switcher Showing "No Cards in This Column"

**Problem**: When switching to "Logs" (screenspace 3) or "Refactor" (screenspace 2), all columns showed "no cards in this column".

**Root Cause**: The workspace store only had cards assigned to screenspaceId 1 (Main). When filtering by activeScreenspaceId, no cards matched for screenspaces 2 and 3.

**Fix**: Added default cards for all three screenspaces in `workspace.store.ts`:
- Screenspace 1 (Main): cards 1-6
- Screenspace 2 (Refactor): cards r1-r3
- Screenspace 3 (Logs): cards l1-l3

**File**: `/home/guy/mono/apps/ui/src/stores/workspace.store.ts`

---

### 2. ✅ Browser Card Crashes When Switching Pages/Columns

**Problem**: The Electron `<webview>` component would crash or behave unexpectedly when:
- Switching to a different screenspace
- Running an agent in a different column
- Navigating to a new page

**Root Cause**: React was reusing the same webview component instance across different cards/contexts without proper isolation. The webview element maintained stale state from previous contexts.

**Fix**: Added unique `key` prop to both `WebView` and `ResearchBrowser` components:
```tsx
// WebView - isolated by cardId, screenspaceId, and URL
<WebView
    key={`browser-${cardId}-${screenspaceId}-${url}`}
    ...
/>

// ResearchBrowser - isolated by cardId and screenspaceId
<ResearchBrowser 
    key={`research-${cardId}-${screenspaceId}`}
    ...
/>
```

This ensures React creates fresh component instances when switching contexts, preventing state pollution.

**File**: `/home/guy/mono/apps/ui/src/components/BrowserCard.tsx`

---

### 3. ✅ Context Range Slider Too Limited (128k max, needed 500k+)

**Problem**: The dual-ended slider for context window selection maxed out at 128,000 tokens, but some models support 500k+ context windows.

**Previous Behavior**:
- Min: 2,048
- Max: 128,000
- Step: 1,024

**New Behavior**:
- Min: 2,048
- Max: 500,000 (on slider)
- Step: 1,024
- **Added "Unlimited Max (500k+)" checkbox**: When checked, sets maxContext to 999,999,999 (effectively unlimited) without making the slider unwieldy

**Implementation**:
```tsx
<DualRangeSlider
    min={2048} max={500000} step={1024}
    value={[criteria.minContext, Math.min(criteria.maxContext, 500000)]}
    onChange={([min, max]: [number, number]) => onChange({ ...criteria, minContext: min, maxContext: max })}
/>
<label className="flex items-center gap-2 cursor-pointer mt-1">
    <input 
        type="checkbox" 
        checked={criteria.maxContext > 500000}
        onChange={e => onChange({ ...criteria, maxContext: e.target.checked ? 999999999 : 128000 })}
        className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-800 text-purple-600 focus:ring-1 focus:ring-purple-600 focus:ring-offset-0"
    />
    <span className="text-[9px] font-bold uppercase text-zinc-400">Unlimited Max (500k+)</span>
</label>
```

**File**: `/home/guy/mono/apps/ui/src/components/nebula/primitives/ModelFilter.tsx`

---

### 4. ✅ Auto-Select Model Dropdown (White Text on White Background)

**Problem**: The model selection dropdown in the Role Editor had white text on a white/light background, making it unreadable.

**Root Cause**: The `<select>` and `<option>` elements weren't using proper CSS variable colors for text.

**Fix**: 
- Added `text-[var(--text-secondary)]` class to the `<select>` element
- Added `className="text-[var(--text-secondary)]"` to all `<option>` elements

**Before**:
```tsx
<select className="w-full bg-[var(--bg-background)] border border-[var(--border-color)] text-[10px] rounded px-1 py-1 outline-none">
    <option value="">Auto-Select</option>
    <option key={m.id} value={m.id}>{m.name}</option>
</select>
```

**After**:
```tsx
<select className="w-full bg-[var(--bg-background)] border border-[var(--border-color)] text-[var(--text-secondary)] text-[10px] rounded px-1 py-1 outline-none">
    <option value="" className="text-[var(--text-secondary)]">Auto-Select</option>
    <option key={m.id} value={m.id} className="text-[var(--text-secondary)]">{m.name}</option>
</select>
```

**File**: `/home/guy/mono/apps/ui/src/components/nebula/primitives/ModelFilter.tsx`

---

## Testing Recommendations

1. **Screenspaces**: 
   - Switch between Main, Refactor, and Logs screenspaces
   - Verify each shows cards in all columns
   - Add new cards to each screenspace and verify they persist

2. **Browser Isolation**:
   - Open a browser card in column 1
   - Navigate to a website
   - Switch to screenspace 2
   - Switch back to screenspace 1
   - Verify the browser maintains its state without crashing

3. **Context Range**:
   - Open Role Editor
   - Go to Cortex tab
   - Drag the context slider to maximum (500k)
   - Check the "Unlimited Max (500k+)" checkbox
   - Verify manual input fields work correctly

4. **Model Selection**:
   - Open Role Editor
   - Go to Cortex tab
   - Verify all dropdown options are readable
   - Test "Auto-Select" functionality
   - Test manual model selection

---

## Files Modified

1. `/home/guy/mono/apps/ui/src/stores/workspace.store.ts` - Added cards for all screenspaces
2. `/home/guy/mono/apps/ui/src/components/BrowserCard.tsx` - Added key props for isolation
3. `/home/guy/mono/apps/ui/src/components/nebula/primitives/ModelFilter.tsx` - Extended context range, added unlimited checkbox, fixed dropdown colors

---

## Notes

- All fixes maintain backward compatibility
- No breaking changes to existing functionality
- The unlimited max checkbox is a UX improvement that prevents slider overflow
- Browser isolation uses React's key prop pattern (best practice for component resets)
