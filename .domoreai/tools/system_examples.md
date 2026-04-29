## 🛠️ TOOL SIGNATURES
```typescript
declare namespace system {
  /**
   * Updates a specific key-value pair in the theme.json file to change the UI's appearance. Use this to modify global colors, fonts, and other theme-level settings.
   */
  type SystemUpdateThemeValueArgs = {
    /** The theme variable key to update (e.g., "color-primary"). */
    key: string;
    /** The new value to set for the key (e.g., "#FF0000"). */
    value: string;
  };
  function updateThemeValue(args: SystemUpdateThemeValueArgs): Promise<any>;

  function updateThemeValue(args: SystemUpdateThemeValueArgs): Promise<any>;

  /**
   * Execute raw TypeScript code. 


  /**
   * Execute raw TypeScript code. 
    
    NEBULA CODE MODE v2.0:
    In UI-related roles, you have access to specialized globals:
    - nebula: { addNode(p,n), updateNode(id,u), moveNode(...), deleteNode(id) }
    - ast: { parse(jsx) -> returns fragment }
    - tree: Read-only access to current state
    
    RULES:
    1. Code must end with console.log() to return data
    2. nebula.addNode RETURNS an ID. You MUST capture it.
    3. Use this for calculations or complex UI construction logic.
   */
  type SystemTypescript_interpreterArgs = {
    /** The TypeScript code to execute. Must end with console.log() to return data. */
    code: string;
    /** Optional timeout in milliseconds (default: 30000, max: 60000) */
    timeout?: number;
  };
  function typescript_interpreter(args: SystemTypescript_interpreterArgs): Promise<any>;

  /**
   * Read a file
   */
  type SystemRead_fileArgs = {
    path: string;
  };
  function read_file(args: SystemRead_fileArgs): Promise<any>;

  /**
   * Write to a file
   */
  type SystemWrite_fileArgs = {
    path: string;
    content: string;
  };
  function write_file(args: SystemWrite_fileArgs): Promise<any>;

  /**
   * List files in a directory
   */
  type SystemList_filesArgs = {
    path: string;
  };
  function list_files(args: SystemList_filesArgs): Promise<any>;

  /**
   * Fetch a web page
   */
  type SystemBrowseArgs = {
    url: string;
  };
  function browse(args: SystemBrowseArgs): Promise<any>;

  /**
   * Fetch a URL and return extracted content as markdown and text
   */
  type SystemResearch_web_scrapeArgs = {
    url: string;
  };
  function research_web_scrape(args: SystemResearch_web_scrapeArgs): Promise<any>;

  /**
   * EXECUTE: Run a bash command in the project root.

RULES:
1. You are in a secure environment.
2. Output (stdout/stderr) is captured and returned to you.
3. Use this to run tests, install packages (npm install), or manage git.
4. Do NOT run interactive commands (like `top` or `nano`).
5. Commands run with a 30s timeout; long-running tasks should be broken into smaller steps.
   */
  type SystemTerminal_executeArgs = any;
  function terminal_execute(args: SystemTerminal_executeArgs): Promise<any>;

  /**
   * Search the codebase for a string
   */
  type SystemSearch_codebaseArgs = {
    query: string;
  };
  function search_codebase(args: SystemSearch_codebaseArgs): Promise<any>;

  /**
   * List files in a tree structure
   */
  type SystemList_files_treeArgs = Record<string, any>;
  function list_files_tree(args: SystemList_files_treeArgs): Promise<any>;

  /**
   * Returns a list of available UI components and their import paths
   */
  type SystemScan_ui_componentsArgs = Record<string, any>;
  function scan_ui_components(args: SystemScan_ui_componentsArgs): Promise<any>;

  /**
   * Returns a list of available UI components and their import paths
   */
  type SystemScan_ui_componentsArgs = Record<string, any>;
  function scan_ui_components(args: SystemScan_ui_componentsArgs): Promise<any>;

}
```

---

### Usage: `system.updateThemeValue`
**Description:** Updates a specific key-value pair in the theme.json file to change the UI's appearance. Use this to modify global colors, fonts, and other theme-level settings.

**Code Mode Example:**
```typescript
// Example for system.updateThemeValue
await system.updateThemeValue({ /* ... */ });
```

---

### Usage: `system.typescript_interpreter`

---

### Usage: `system.typescript_interpreter`
**Description:** Execute raw TypeScript code. 
    
    NEBULA CODE MODE v2.0:
    In UI-related roles, you have access to specialized globals:
    - nebula: { addNode(p,n), updateNode(id,u), moveNode(...), deleteNode(id) }
    - ast: { parse(jsx) -> returns fragment }
    - tree: Read-only access to current state
    
    RULES:
    1. Code must end with console.log() to return data
    2. nebula.addNode RETURNS an ID. You MUST capture it.
    3. Use this for calculations or complex UI construction logic.

**Code Mode Example:**
```typescript
// Example for system.typescript_interpreter
await system.typescript_interpreter({ /* ... */ });
```

---

### Usage: `system.read_file`
**Description:** Read a file

**Code Mode Example:**
```typescript
// Example for system.read_file
await system.read_file({ /* ... */ });
```

---

### Usage: `system.write_file`
**Description:** Write to a file

**Code Mode Example:**
```typescript
// Example for system.write_file
await system.write_file({ /* ... */ });
```

---

### Usage: `system.list_files`
**Description:** List files in a directory

**Code Mode Example:**
```typescript
// Example for system.list_files
await system.list_files({ /* ... */ });
```

---

### Usage: `system.browse`
**Description:** Fetch a web page

**Code Mode Example:**
```typescript
// Example for system.browse
await system.browse({ /* ... */ });
```

---

### Usage: `system.research_web_scrape`
**Description:** Fetch a URL and return extracted content as markdown and text

**Code Mode Example:**
```typescript
// Example for system.research_web_scrape
await system.research_web_scrape({ /* ... */ });
```

---

### Usage: `system.terminal_execute`
**Description:** EXECUTE: Run a bash command in the project root.

RULES:
1. You are in a secure environment.
2. Output (stdout/stderr) is captured and returned to you.
3. Use this to run tests, install packages (npm install), or manage git.
4. Do NOT run interactive commands (like `top` or `nano`).
5. Commands run with a 30s timeout; long-running tasks should be broken into smaller steps.

**Code Mode Example:**
```typescript
// Example for system.terminal_execute
await system.terminal_execute({ /* ... */ });
```

---

### Usage: `system.search_codebase`
**Description:** Search the codebase for a string

**Code Mode Example:**
```typescript
// Example for system.search_codebase
await system.search_codebase({ /* ... */ });
```

---

### Usage: `system.list_files_tree`
**Description:** List files in a tree structure

**Code Mode Example:**
```typescript
// Example for system.list_files_tree
await system.list_files_tree({ /* ... */ });
```

---

### Usage: `system.scan_ui_components`
**Description:** Returns a list of available UI components and their import paths

**Code Mode Example:**
```typescript
// Example for system.scan_ui_components
await system.scan_ui_components({ /* ... */ });
```

---
