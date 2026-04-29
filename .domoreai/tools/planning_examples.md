## 🛠️ TOOL SIGNATURES
```typescript
declare namespace system {
  /**
   * Start a new planning session with a goal
   */
  type PlanningStart_planningArgs = {
    /** The software development goal to plan */
    goal: string;
  };
  function planning_start_planning(args: PlanningStart_planningArgs): Promise<any>;

  /**
   * Save the current implementation plan
   */
  type PlanningSave_planArgs = {
    /** The implementation plan text to save */
    plan: string;
  };
  function planning_save_plan(args: PlanningSave_planArgs): Promise<any>;

  /**
   * Add a new todo item to the current plan
   */
  type PlanningAdd_todoArgs = {
    /** Title of the todo item */
    title: string;
    /** Detailed description of the todo item */
    description: string;
    /** Complexity score (0-10) */
    complexity: number;
    /** Optional code example */
    codeExample?: string;
  };
  function planning_add_todo(args: PlanningAdd_todoArgs): Promise<any>;

  /**
   * Remove a todo item from the current plan
   */
  type PlanningRemove_todoArgs = {
    /** ID of the todo item to remove */
    todoId: string;
  };
  function planning_remove_todo(args: PlanningRemove_todoArgs): Promise<any>;

  /**
   * Get all todos in the current plan
   */
  type PlanningGet_todosArgs = Record<string, any>;
  function planning_get_todos(args: PlanningGet_todosArgs): Promise<any>;

  /**
   * Update the completion status of a todo item
   */
  type PlanningUpdate_todo_statusArgs = {
    /** ID of the todo item */
    todoId: string;
    /** New completion status */
    isComplete: boolean;
  };
  function planning_update_todo_status(args: PlanningUpdate_todo_statusArgs): Promise<any>;

}
```

---

### Usage: `system.planning_start_planning`
**Description:** Start a new planning session with a goal

**Code Mode Example:**
```typescript
// Example for system.planning_start_planning
await system.planning_start_planning({ /* ... */ });
```

---

### Usage: `system.planning_save_plan`
**Description:** Save the current implementation plan

**Code Mode Example:**
```typescript
// Example for system.planning_save_plan
await system.planning_save_plan({ /* ... */ });
```

---

### Usage: `system.planning_add_todo`
**Description:** Add a new todo item to the current plan

**Code Mode Example:**
```typescript
// Example for system.planning_add_todo
await system.planning_add_todo({ /* ... */ });
```

---

### Usage: `system.planning_remove_todo`
**Description:** Remove a todo item from the current plan

**Code Mode Example:**
```typescript
// Example for system.planning_remove_todo
await system.planning_remove_todo({ /* ... */ });
```

---

### Usage: `system.planning_get_todos`
**Description:** Get all todos in the current plan

**Code Mode Example:**
```typescript
// Example for system.planning_get_todos
await system.planning_get_todos({ /* ... */ });
```

---

### Usage: `system.planning_update_todo_status`
**Description:** Update the completion status of a todo item

**Code Mode Example:**
```typescript
// Example for system.planning_update_todo_status
await system.planning_update_todo_status({ /* ... */ });
```

---
