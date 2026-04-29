## 🛠️ TOOL SIGNATURES
```typescript
declare namespace system {
  /**
   * Navigate to a URL
   */
  type PlaywrightBrowser_navigateArgs = {
    url: string;
  };
  function playwright_browser_navigate(args: PlaywrightBrowser_navigateArgs): Promise<any>;

  /**
   * Take a screenshot of the current page or a specific element
   */
  type PlaywrightBrowser_screenshotArgs = {
    /** Name for the screenshot */
    name: string;
    /** CSS selector for element to screenshot */
    selector?: string;
    /** Take a full page screenshot (default: false) */
    fullPage?: boolean;
  };
  function playwright_browser_screenshot(args: PlaywrightBrowser_screenshotArgs): Promise<any>;

  /**
   * Click an element on the page using CSS selector
   */
  type PlaywrightBrowser_clickArgs = {
    /** CSS selector for element to click */
    selector: string;
  };
  function playwright_browser_click(args: PlaywrightBrowser_clickArgs): Promise<any>;

  /**
   * Click an element on the page by its text content
   */
  type PlaywrightBrowser_click_textArgs = {
    /** Text content of the element to click */
    text: string;
  };
  function playwright_browser_click_text(args: PlaywrightBrowser_click_textArgs): Promise<any>;

  /**
   * Fill out an input field
   */
  type PlaywrightBrowser_fillArgs = {
    /** CSS selector for input field */
    selector: string;
    /** Value to fill */
    value: string;
  };
  function playwright_browser_fill(args: PlaywrightBrowser_fillArgs): Promise<any>;

  /**
   * Select an element on the page with Select tag using CSS selector
   */
  type PlaywrightBrowser_selectArgs = {
    /** CSS selector for element to select */
    selector: string;
    /** Value to select */
    value: string;
  };
  function playwright_browser_select(args: PlaywrightBrowser_selectArgs): Promise<any>;

  /**
   * Select an element on the page with Select tag by its text content
   */
  type PlaywrightBrowser_select_textArgs = {
    /** Text content of the element to select */
    text: string;
    /** Value to select */
    value: string;
  };
  function playwright_browser_select_text(args: PlaywrightBrowser_select_textArgs): Promise<any>;

  /**
   * Hover an element on the page using CSS selector
   */
  type PlaywrightBrowser_hoverArgs = {
    /** CSS selector for element to hover */
    selector: string;
  };
  function playwright_browser_hover(args: PlaywrightBrowser_hoverArgs): Promise<any>;

  /**
   * Hover an element on the page by its text content
   */
  type PlaywrightBrowser_hover_textArgs = {
    /** Text content of the element to hover */
    text: string;
  };
  function playwright_browser_hover_text(args: PlaywrightBrowser_hover_textArgs): Promise<any>;

  /**
   * Execute JavaScript in the browser console
   */
  type PlaywrightBrowser_evaluateArgs = {
    /** JavaScript code to execute */
    script: string;
  };
  function playwright_browser_evaluate(args: PlaywrightBrowser_evaluateArgs): Promise<any>;

}
```

---

### Usage: `system.playwright_browser_navigate`
**Description:** Navigate to a URL

**Code Mode Example:**
```typescript
// Example for system.playwright_browser_navigate
await system.playwright_browser_navigate({ /* ... */ });
```

---

### Usage: `system.playwright_browser_screenshot`
**Description:** Take a screenshot of the current page or a specific element

**Code Mode Example:**
```typescript
// Example for system.playwright_browser_screenshot
await system.playwright_browser_screenshot({ /* ... */ });
```

---

### Usage: `system.playwright_browser_click`
**Description:** Click an element on the page using CSS selector

**Code Mode Example:**
```typescript
// Example for system.playwright_browser_click
await system.playwright_browser_click({ /* ... */ });
```

---

### Usage: `system.playwright_browser_click_text`
**Description:** Click an element on the page by its text content

**Code Mode Example:**
```typescript
// Example for system.playwright_browser_click_text
await system.playwright_browser_click_text({ /* ... */ });
```

---

### Usage: `system.playwright_browser_fill`
**Description:** Fill out an input field

**Code Mode Example:**
```typescript
// Example for system.playwright_browser_fill
await system.playwright_browser_fill({ /* ... */ });
```

---

### Usage: `system.playwright_browser_select`
**Description:** Select an element on the page with Select tag using CSS selector

**Code Mode Example:**
```typescript
// Example for system.playwright_browser_select
await system.playwright_browser_select({ /* ... */ });
```

---

### Usage: `system.playwright_browser_select_text`
**Description:** Select an element on the page with Select tag by its text content

**Code Mode Example:**
```typescript
// Example for system.playwright_browser_select_text
await system.playwright_browser_select_text({ /* ... */ });
```

---

### Usage: `system.playwright_browser_hover`
**Description:** Hover an element on the page using CSS selector

**Code Mode Example:**
```typescript
// Example for system.playwright_browser_hover
await system.playwright_browser_hover({ /* ... */ });
```

---

### Usage: `system.playwright_browser_hover_text`
**Description:** Hover an element on the page by its text content

**Code Mode Example:**
```typescript
// Example for system.playwright_browser_hover_text
await system.playwright_browser_hover_text({ /* ... */ });
```

---

### Usage: `system.playwright_browser_evaluate`
**Description:** Execute JavaScript in the browser console

**Code Mode Example:**
```typescript
// Example for system.playwright_browser_evaluate
await system.playwright_browser_evaluate({ /* ... */ });
```

---
