## 🛠️ TOOL SIGNATURES
```typescript
declare namespace system {
  /**
   * Initialize a new Git repository
   */
  type GitInitArgs = {
    /** Path to initialize the repository in. MUST be an absolute path (e.g., /Users/username/projects/my-repo) */
    path?: string;
  };
  function git_init(args: GitInitArgs): Promise<any>;

  /**
   * Clone a repository
   */
  type GitCloneArgs = {
    /** URL of the repository to clone */
    url: string;
    /** Path to clone into. MUST be an absolute path (e.g., /Users/username/projects/my-repo) */
    path?: string;
  };
  function git_clone(args: GitCloneArgs): Promise<any>;

  /**
   * Get repository status
   */
  type GitStatusArgs = {
    /** Path to repository. MUST be an absolute path (e.g., /Users/username/projects/my-repo) */
    path?: string;
  };
  function git_status(args: GitStatusArgs): Promise<any>;

  /**
   * Stage files
   */
  type GitAddArgs = {
    /** Path to repository. MUST be an absolute path (e.g., /Users/username/projects/my-repo) */
    path?: string;
    /** Files to stage */
    files: (string)[];
  };
  function git_add(args: GitAddArgs): Promise<any>;

  /**
   * Create a commit
   */
  type GitCommitArgs = {
    /** Path to repository. MUST be an absolute path (e.g., /Users/username/projects/my-repo) */
    path?: string;
    /** Commit message */
    message: string;
  };
  function git_commit(args: GitCommitArgs): Promise<any>;

  /**
   * Push commits to remote
   */
  type GitPushArgs = {
    /** Path to repository. MUST be an absolute path (e.g., /Users/username/projects/my-repo) */
    path?: string;
    /** Remote name */
    remote?: string;
    /** Branch name */
    branch: string;
    /** Force push changes */
    force?: boolean;
    /** Skip pre-push hooks */
    noVerify?: boolean;
    /** Push all tags */
    tags?: boolean;
  };
  function git_push(args: GitPushArgs): Promise<any>;

  /**
   * Pull changes from remote
   */
  type GitPullArgs = {
    /** Path to repository. MUST be an absolute path (e.g., /Users/username/projects/my-repo) */
    path?: string;
    /** Remote name */
    remote?: string;
    /** Branch name */
    branch: string;
  };
  function git_pull(args: GitPullArgs): Promise<any>;

  /**
   * List all branches
   */
  type GitBranch_listArgs = {
    /** Path to repository. MUST be an absolute path (e.g., /Users/username/projects/my-repo) */
    path?: string;
  };
  function git_branch_list(args: GitBranch_listArgs): Promise<any>;

  /**
   * Create a new branch
   */
  type GitBranch_createArgs = {
    /** Path to repository. MUST be an absolute path (e.g., /Users/username/projects/my-repo) */
    path?: string;
    /** Branch name */
    name: string;
    /** Force create branch even if it exists */
    force?: boolean;
    /** Set up tracking mode */
    track?: boolean;
    /** Set upstream for push/pull */
    setUpstream?: boolean;
  };
  function git_branch_create(args: GitBranch_createArgs): Promise<any>;

  /**
   * Delete a branch
   */
  type GitBranch_deleteArgs = {
    /** Path to repository. MUST be an absolute path (e.g., /Users/username/projects/my-repo) */
    path?: string;
    /** Branch name */
    name: string;
  };
  function git_branch_delete(args: GitBranch_deleteArgs): Promise<any>;

  /**
   * Switch branches or restore working tree files
   */
  type GitCheckoutArgs = {
    /** Path to repository. MUST be an absolute path (e.g., /Users/username/projects/my-repo) */
    path?: string;
    /** Branch name, commit hash, or file path */
    target: string;
  };
  function git_checkout(args: GitCheckoutArgs): Promise<any>;

  /**
   * List tags
   */
  type GitTag_listArgs = {
    /** Path to repository. MUST be an absolute path (e.g., /Users/username/projects/my-repo) */
    path?: string;
  };
  function git_tag_list(args: GitTag_listArgs): Promise<any>;

  /**
   * Create a tag
   */
  type GitTag_createArgs = {
    /** Path to repository. MUST be an absolute path (e.g., /Users/username/projects/my-repo) */
    path?: string;
    /** Tag name */
    name: string;
    /** Tag message */
    message?: string;
    /** Force create tag even if it exists */
    force?: boolean;
    /** Create an annotated tag */
    annotated?: boolean;
    /** Create a signed tag */
    sign?: boolean;
  };
  function git_tag_create(args: GitTag_createArgs): Promise<any>;

  /**
   * Delete a tag
   */
  type GitTag_deleteArgs = {
    /** Path to repository. MUST be an absolute path (e.g., /Users/username/projects/my-repo) */
    path?: string;
    /** Tag name */
    name: string;
  };
  function git_tag_delete(args: GitTag_deleteArgs): Promise<any>;

  /**
   * List remotes
   */
  type GitRemote_listArgs = {
    /** Path to repository. MUST be an absolute path (e.g., /Users/username/projects/my-repo) */
    path?: string;
  };
  function git_remote_list(args: GitRemote_listArgs): Promise<any>;

  /**
   * Add a remote
   */
  type GitRemote_addArgs = {
    /** Path to repository. MUST be an absolute path (e.g., /Users/username/projects/my-repo) */
    path?: string;
    /** Remote name */
    name: string;
    /** Remote URL */
    url: string;
  };
  function git_remote_add(args: GitRemote_addArgs): Promise<any>;

  /**
   * Remove a remote
   */
  type GitRemote_removeArgs = {
    /** Path to repository. MUST be an absolute path (e.g., /Users/username/projects/my-repo) */
    path?: string;
    /** Remote name */
    name: string;
  };
  function git_remote_remove(args: GitRemote_removeArgs): Promise<any>;

  /**
   * List stashes
   */
  type GitStash_listArgs = {
    /** Path to repository. MUST be an absolute path (e.g., /Users/username/projects/my-repo) */
    path?: string;
  };
  function git_stash_list(args: GitStash_listArgs): Promise<any>;

  /**
   * Save changes to stash
   */
  type GitStash_saveArgs = {
    /** Path to repository. MUST be an absolute path (e.g., /Users/username/projects/my-repo) */
    path?: string;
    /** Stash message */
    message?: string;
    /** Include untracked files */
    includeUntracked?: boolean;
    /** Keep staged changes */
    keepIndex?: boolean;
    /** Include ignored files */
    all?: boolean;
  };
  function git_stash_save(args: GitStash_saveArgs): Promise<any>;

  /**
   * Apply and remove a stash
   */
  type GitStash_popArgs = {
    /** Path to repository. MUST be an absolute path (e.g., /Users/username/projects/my-repo) */
    path?: string;
    /** Stash index */
    index?: number;
  };
  function git_stash_pop(args: GitStash_popArgs): Promise<any>;

  /**
   * Execute multiple Git operations in sequence. This is the preferred way to execute multiple operations.
   */
  type GitBulk_actionArgs = {
    /** Path to repository. MUST be an absolute path (e.g., /Users/username/projects/my-repo) */
    path?: string;
    /** Array of Git operations to execute in sequence */
    actions: (Record<string, any>)[];
  };
  function git_bulk_action(args: GitBulk_actionArgs): Promise<any>;

}
```

---

### Usage: `system.git_init`
**Description:** Initialize a new Git repository

**Code Mode Example:**
```typescript
// Example for system.git_init
await system.git_init({ /* ... */ });
```

---

### Usage: `system.git_clone`
**Description:** Clone a repository

**Code Mode Example:**
```typescript
// Example for system.git_clone
await system.git_clone({ /* ... */ });
```

---

### Usage: `system.git_status`
**Description:** Get repository status

**Code Mode Example:**
```typescript
// Example for system.git_status
await system.git_status({ /* ... */ });
```

---

### Usage: `system.git_add`
**Description:** Stage files

**Code Mode Example:**
```typescript
// Example for system.git_add
await system.git_add({ /* ... */ });
```

---

### Usage: `system.git_commit`
**Description:** Create a commit

**Code Mode Example:**
```typescript
// Example for system.git_commit
await system.git_commit({ /* ... */ });
```

---

### Usage: `system.git_push`
**Description:** Push commits to remote

**Code Mode Example:**
```typescript
// Example for system.git_push
await system.git_push({ /* ... */ });
```

---

### Usage: `system.git_pull`
**Description:** Pull changes from remote

**Code Mode Example:**
```typescript
// Example for system.git_pull
await system.git_pull({ /* ... */ });
```

---

### Usage: `system.git_branch_list`
**Description:** List all branches

**Code Mode Example:**
```typescript
// Example for system.git_branch_list
await system.git_branch_list({ /* ... */ });
```

---

### Usage: `system.git_branch_create`
**Description:** Create a new branch

**Code Mode Example:**
```typescript
// Example for system.git_branch_create
await system.git_branch_create({ /* ... */ });
```

---

### Usage: `system.git_branch_delete`
**Description:** Delete a branch

**Code Mode Example:**
```typescript
// Example for system.git_branch_delete
await system.git_branch_delete({ /* ... */ });
```

---

### Usage: `system.git_checkout`
**Description:** Switch branches or restore working tree files

**Code Mode Example:**
```typescript
// Example for system.git_checkout
await system.git_checkout({ /* ... */ });
```

---

### Usage: `system.git_tag_list`
**Description:** List tags

**Code Mode Example:**
```typescript
// Example for system.git_tag_list
await system.git_tag_list({ /* ... */ });
```

---

### Usage: `system.git_tag_create`
**Description:** Create a tag

**Code Mode Example:**
```typescript
// Example for system.git_tag_create
await system.git_tag_create({ /* ... */ });
```

---

### Usage: `system.git_tag_delete`
**Description:** Delete a tag

**Code Mode Example:**
```typescript
// Example for system.git_tag_delete
await system.git_tag_delete({ /* ... */ });
```

---

### Usage: `system.git_remote_list`
**Description:** List remotes

**Code Mode Example:**
```typescript
// Example for system.git_remote_list
await system.git_remote_list({ /* ... */ });
```

---

### Usage: `system.git_remote_add`
**Description:** Add a remote

**Code Mode Example:**
```typescript
// Example for system.git_remote_add
await system.git_remote_add({ /* ... */ });
```

---

### Usage: `system.git_remote_remove`
**Description:** Remove a remote

**Code Mode Example:**
```typescript
// Example for system.git_remote_remove
await system.git_remote_remove({ /* ... */ });
```

---

### Usage: `system.git_stash_list`
**Description:** List stashes

**Code Mode Example:**
```typescript
// Example for system.git_stash_list
await system.git_stash_list({ /* ... */ });
```

---

### Usage: `system.git_stash_save`
**Description:** Save changes to stash

**Code Mode Example:**
```typescript
// Example for system.git_stash_save
await system.git_stash_save({ /* ... */ });
```

---

### Usage: `system.git_stash_pop`
**Description:** Apply and remove a stash

**Code Mode Example:**
```typescript
// Example for system.git_stash_pop
await system.git_stash_pop({ /* ... */ });
```

---

### Usage: `system.git_bulk_action`
**Description:** Execute multiple Git operations in sequence. This is the preferred way to execute multiple operations.

**Code Mode Example:**
```typescript
// Example for system.git_bulk_action
await system.git_bulk_action({ /* ... */ });
```

---
