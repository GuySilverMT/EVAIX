## 🛠️ TOOL SIGNATURES
```typescript
declare namespace system {
  /**
   * Reads the entire content of a specified file as UTF-8 text. Accepts relative or absolute paths. Relative paths are resolved against the session default set by `set_filesystem_default`.
   */
  type FilesystemRead_fileArgs = {
    /** The path to the file to read. Can be relative or absolute. If relative, it resolves against the path set by `set_filesystem_default`. If absolute, it is used directly. If relative and no default is set, an error occurs. */
    path: string;
  };
  function filesystem_read_file(args: FilesystemRead_fileArgs): Promise<any>;

  /**
   * Sets a default absolute path for the current session. Relative paths used in other filesystem tools (like readFile) will be resolved against this default. The default is cleared on server restart.
   */
  type FilesystemSet_filesystem_defaultArgs = {
    /** The absolute path to set as the default for resolving relative paths during this session. */
    path: string;
  };
  function filesystem_set_filesystem_default(args: FilesystemSet_filesystem_defaultArgs): Promise<any>;

  /**
   * Writes content to a specified file. Creates the file (and necessary directories) if it doesn't exist, or overwrites it if it does. Accepts relative or absolute paths (resolved like readFile).
   */
  type FilesystemWrite_fileArgs = {
    /** The path to the file to write. Can be relative or absolute. If relative, it resolves against the path set by `set_filesystem_default`. If absolute, it is used directly. Missing directories will be created. */
    path: string;
    /** The content to write to the file. If the file exists, it will be overwritten. */
    content: string;
  };
  function filesystem_write_file(args: FilesystemWrite_fileArgs): Promise<any>;

  /**
   * Performs targeted search-and-replace operations within an existing file using an array of {search, replace} blocks. Preferred for smaller, localized changes. For large-scale updates or overwrites, consider using `write_file`. Accepts relative or absolute paths. File must exist. Supports optional `useRegex` (boolean, default false) and `replaceAll` (boolean, default false).
   */
  type FilesystemUpdate_fileArgs = {
    /** The path to the file to update. Can be relative or absolute (resolved like readFile). The file must exist. */
    path: string;
    /** An array of objects, each with a `search` (string) and `replace` (string) property. */
    blocks: ({
      search: string;
      replace: string;
    })[];
    /** If true, treat the `search` field of each block as a JavaScript regular expression pattern. Defaults to false (exact string matching). */
    useRegex?: boolean;
    /** If true, replace all occurrences matching the SEARCH criteria within the file. If false, only replace the first occurrence. Defaults to false. */
    replaceAll?: boolean;
  };
  function filesystem_update_file(args: FilesystemUpdate_fileArgs): Promise<any>;

  /**
   * Lists files and directories within the specified directory. Optionally lists recursively and returns a tree-like structure. Includes an optional `maxEntries` parameter (default 50) to limit the number of items returned.
   */
  type FilesystemList_filesArgs = {
    /** The path to the directory to list. Can be relative or absolute (resolved like readFile). */
    path: string;
    /** If true, list files and directories recursively. Defaults to false (top-level only). */
    includeNested?: boolean;
    /** Maximum number of directory entries (files + folders) to return. Defaults to 50. Helps prevent excessive output for large directories. */
    maxEntries?: number;
  };
  function filesystem_list_files(args: FilesystemList_filesArgs): Promise<any>;

  /**
   * Removes a specific file. Accepts relative or absolute paths.
   */
  type FilesystemDelete_fileArgs = {
    /** The path to the file to delete. Can be relative or absolute (resolved like readFile). */
    path: string;
  };
  function filesystem_delete_file(args: FilesystemDelete_fileArgs): Promise<any>;

  /**
   * Removes a directory. Optionally removes recursively. Accepts relative or absolute paths.
   */
  type FilesystemDelete_directoryArgs = {
    /** The path to the directory to delete. Can be relative or absolute. */
    path: string;
    /** If true, delete the directory and all its contents. If false, only delete if the directory is empty. */
    recursive?: boolean;
  };
  function filesystem_delete_directory(args: FilesystemDelete_directoryArgs): Promise<any>;

  /**
   * Creates a directory. Optionally creates parent directories. Accepts relative or absolute paths.
   */
  type FilesystemCreate_directoryArgs = {
    /** The path to the directory to create. Can be relative or absolute. */
    path: string;
    /** If true, create any necessary parent directories that don't exist. If false, fail if a parent directory is missing. */
    create_parents?: boolean;
  };
  function filesystem_create_directory(args: FilesystemCreate_directoryArgs): Promise<any>;

  /**
   * Moves or renames a file or directory. Accepts relative or absolute paths for source and destination.
   */
  type FilesystemMove_pathArgs = {
    /** The current path of the file or directory to move. Can be relative or absolute. */
    source_path: string;
    /** The new path for the file or directory. Can be relative or absolute. */
    destination_path: string;
  };
  function filesystem_move_path(args: FilesystemMove_pathArgs): Promise<any>;

  /**
   * Copies a file or directory to a new location. Accepts relative or absolute paths. Defaults to recursive copy for directories.
   */
  type FilesystemCopy_pathArgs = {
    /** The path of the file or directory to copy. Can be relative or absolute. */
    source_path: string;
    /** The path where the copy should be created. Can be relative or absolute. */
    destination_path: string;
    /** If copying a directory, whether to copy its contents recursively. Defaults to true. */
    recursive?: boolean;
  };
  function filesystem_copy_path(args: FilesystemCopy_pathArgs): Promise<any>;

}
```

---

### Usage: `system.filesystem_read_file`
**Description:** Reads the entire content of a specified file as UTF-8 text. Accepts relative or absolute paths. Relative paths are resolved against the session default set by `set_filesystem_default`.

**Code Mode Example:**
```typescript
// Example for system.filesystem_read_file
await system.filesystem_read_file({ /* ... */ });
```

---

### Usage: `system.filesystem_set_filesystem_default`
**Description:** Sets a default absolute path for the current session. Relative paths used in other filesystem tools (like readFile) will be resolved against this default. The default is cleared on server restart.

**Code Mode Example:**
```typescript
// Example for system.filesystem_set_filesystem_default
await system.filesystem_set_filesystem_default({ /* ... */ });
```

---

### Usage: `system.filesystem_write_file`
**Description:** Writes content to a specified file. Creates the file (and necessary directories) if it doesn't exist, or overwrites it if it does. Accepts relative or absolute paths (resolved like readFile).

**Code Mode Example:**
```typescript
// Example for system.filesystem_write_file
await system.filesystem_write_file({ /* ... */ });
```

---

### Usage: `system.filesystem_update_file`
**Description:** Performs targeted search-and-replace operations within an existing file using an array of {search, replace} blocks. Preferred for smaller, localized changes. For large-scale updates or overwrites, consider using `write_file`. Accepts relative or absolute paths. File must exist. Supports optional `useRegex` (boolean, default false) and `replaceAll` (boolean, default false).

**Code Mode Example:**
```typescript
// Example for system.filesystem_update_file
await system.filesystem_update_file({ /* ... */ });
```

---

### Usage: `system.filesystem_list_files`
**Description:** Lists files and directories within the specified directory. Optionally lists recursively and returns a tree-like structure. Includes an optional `maxEntries` parameter (default 50) to limit the number of items returned.

**Code Mode Example:**
```typescript
// Example for system.filesystem_list_files
await system.filesystem_list_files({ /* ... */ });
```

---

### Usage: `system.filesystem_delete_file`
**Description:** Removes a specific file. Accepts relative or absolute paths.

**Code Mode Example:**
```typescript
// Example for system.filesystem_delete_file
await system.filesystem_delete_file({ /* ... */ });
```

---

### Usage: `system.filesystem_delete_directory`
**Description:** Removes a directory. Optionally removes recursively. Accepts relative or absolute paths.

**Code Mode Example:**
```typescript
// Example for system.filesystem_delete_directory
await system.filesystem_delete_directory({ /* ... */ });
```

---

### Usage: `system.filesystem_create_directory`
**Description:** Creates a directory. Optionally creates parent directories. Accepts relative or absolute paths.

**Code Mode Example:**
```typescript
// Example for system.filesystem_create_directory
await system.filesystem_create_directory({ /* ... */ });
```

---

### Usage: `system.filesystem_move_path`
**Description:** Moves or renames a file or directory. Accepts relative or absolute paths for source and destination.

**Code Mode Example:**
```typescript
// Example for system.filesystem_move_path
await system.filesystem_move_path({ /* ... */ });
```

---

### Usage: `system.filesystem_copy_path`
**Description:** Copies a file or directory to a new location. Accepts relative or absolute paths. Defaults to recursive copy for directories.

**Code Mode Example:**
```typescript
// Example for system.filesystem_copy_path
await system.filesystem_copy_path({ /* ... */ });
```

---
