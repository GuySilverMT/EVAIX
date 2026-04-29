## 🛠️ TOOL SIGNATURES
```typescript
declare namespace system {
  /**
   * SEARCH ENTITIES by TEXT or TAGS across names, types, observations, and tags. Supports exact/fuzzy search modes, multiple query batching, tag filtering, and pagination. Returns entities and their relationships. MUST USE BEFORE create_entities, add_observations, and create_relations to verify entity existence. PAGINATION: Use page parameter to navigate large result sets (page=0 for first page, page=1 for second, etc.).
   */
  type MemorySearch_knowledgeArgs = {
    /** Search text (string or array of strings for batch search). Searches across entity names, types, observations, and tags. Optional when exactTags is provided. */
    query?: string | (string)[];
    /** Array of tags for exact-match filtering (case-sensitive). Enables tag-only search when query is omitted. */
    exactTags?: (string)[];
    /** Tag matching mode: 'any' finds entities with ANY specified tag, 'all' requires ALL tags (default: 'any') */
    tagMatchMode?: 'any' | 'all';
    /** Search algorithm: 'exact' for substring matching (fast), 'fuzzy' for similarity matching (slower, broader results). Default: 'exact' */
    searchMode?: 'exact' | 'fuzzy';
    /** Similarity threshold for fuzzy search (0.0-1.0). Lower values = more results. Default: 0.3 */
    fuzzyThreshold?: number;
    /** Page number for pagination (0-based). Use 0 or omit for first page. */
    page?: number;
    /** Number of results per page (default: 100, max: 1000) */
    pageSize?: number;
    /** Project identifier for data isolation. Must be consistent across all calls in a conversation */
    project_id?: string;
  };
  function memory_search_knowledge(args: MemorySearch_knowledgeArgs): Promise<any>;

  /**
   * CREATE new entities with OBSERVATIONS and optional tags. MANDATORY: If creating multiple entities, use a SINGLE call (batch). Each entity requires a unique name, type, and at least one observation. Ignores existing names. Use search_knowledge first.
   */
  type MemoryCreate_entitiesArgs = {
    /** Array of entity objects to create. Each entity must have at least one observation. */
    entities: ({
      /** Unique entity identifier. Use descriptive names (e.g., 'John_Smith_Engineer', 'React_v18') */
      name: string;
      /** Entity category. Valid types: 'person', 'technology', 'project', 'company', 'concept', 'event', 'preference' */
      entityType: string;
      /** Array of factual statements about the entity. Must contain at least one non-empty string. */
      observations: (string)[];
      /** Optional tags for categorization and filtering (e.g., ['urgent', 'technical', 'completed']) */
      tags?: (string)[];
    })[];
    /** Project identifier for data isolation. Must be consistent across all calls in a conversation */
    project_id?: string;
  };
  function memory_create_entities(args: MemoryCreate_entitiesArgs): Promise<any>;

  /**
   * ADD new factual observations to existing entities. Requires exact entity names that exist in the knowledge graph. Use search_knowledge first to verify entity existence.
   */
  type MemoryAdd_observationsArgs = {
    /** Array of observation updates. Each update specifies an entity and new observations to add. */
    observations: ({
      /** Exact name of existing entity to update */
      entityName: string;
      /** Array of new factual statements to add. Must contain at least one non-empty string. */
      observations: (string)[];
    })[];
    /** Project identifier for data isolation. Must be consistent across all calls in a conversation */
    project_id?: string;
  };
  function memory_add_observations(args: MemoryAdd_observationsArgs): Promise<any>;

  /**
   * CREATE directional RELATIONSHIPS between existing entities. Both source and target entities must exist. Use active voice relationship types (e.g., 'works_at', 'manages', 'depends_on'). Verify entity existence with search_knowledge first.
   */
  type MemoryCreate_relationsArgs = {
    /** Array of relationship objects to create between existing entities */
    relations: ({
      /** Source entity name (must exist in knowledge graph) */
      from: string;
      /** Target entity name (must exist in knowledge graph) */
      to: string;
      /** Relationship type in active voice (e.g., 'works_at', 'manages', 'created_by', 'depends_on', 'uses') */
      relationType: string;
    })[];
    /** Project identifier for data isolation. Must be consistent across all calls in a conversation */
    project_id?: string;
  };
  function memory_create_relations(args: MemoryCreate_relationsArgs): Promise<any>;

  /**
   * Permanently DELETE entities and all their RELATIONSHIPS. This action is irreversible and cascades to remove all connections. Verify entity existence with search_knowledge first. Consider delete_observations for partial updates.
   */
  type MemoryDelete_entitiesArgs = {
    /** Array of exact entity names to permanently delete */
    entityNames: (string)[];
    /** Project identifier for data isolation. Must be consistent across all calls in a conversation */
    project_id?: string;
  };
  function memory_delete_entities(args: MemoryDelete_entitiesArgs): Promise<any>;

  /**
   * DELETE specific OBSERVATIONS from entities while preserving the entity, its relationships, and tags. Use for correcting errors or removing outdated facts without deleting the entire entity.
   */
  type MemoryDelete_observationsArgs = {
    /** Array of deletion requests specifying which observations to remove from which entities */
    deletions: ({
      /** Exact name of entity to update */
      entityName: string;
      /** Array of exact observation strings to remove from the entity */
      observations: (string)[];
    })[];
    /** Project identifier for data isolation. Must be consistent across all calls in a conversation */
    project_id?: string;
  };
  function memory_delete_observations(args: MemoryDelete_observationsArgs): Promise<any>;

  /**
   * DELETE specific RELATIONSHIPS between entities while preserving both entities. Use for updating connection status when relationships change (job changes, project completion, etc.).
   */
  type MemoryDelete_relationsArgs = {
    /** Array of specific relationships to delete */
    relations: ({
      /** Source entity name */
      from: string;
      /** Target entity name */
      to: string;
      /** Exact relationship type to remove (must match existing relation) */
      relationType: string;
    })[];
    /** Project identifier for data isolation. Must be consistent across all calls in a conversation */
    project_id?: string;
  };
  function memory_delete_relations(args: MemoryDelete_relationsArgs): Promise<any>;

  /**
   * RETRIEVE the complete KNOWLEDGE GRAPH with all entities and relationships for a project. Returns comprehensive view of the entire network structure. Can be large for projects with many entities.
   */
  type MemoryRead_graphArgs = {
    /** Project identifier for data isolation. Must be consistent across all calls in a conversation */
    project_id?: string;
  };
  function memory_read_graph(args: MemoryRead_graphArgs): Promise<any>;

  /**
   * RETRIEVE specific ENTITIES by exact names along with their interconnections. Returns detailed information about the specified entities and relationships between them. Requires knowing exact entity names.
   */
  type MemoryOpen_nodesArgs = {
    /** Array of exact entity names to retrieve with their details and interconnections */
    names: (string)[];
    /** Project identifier for data isolation. Must be consistent across all calls in a conversation */
    project_id?: string;
  };
  function memory_open_nodes(args: MemoryOpen_nodesArgs): Promise<any>;

  /**
   * ADD categorical TAGS to existing entities for filtering and organization. Tags are case-sensitive exact-match labels used for quick retrieval with search_knowledge. Common categories: status, priority, type, domain.
   */
  type MemoryAdd_tagsArgs = {
    /** Array of tag updates specifying which tags to add to which entities */
    updates: ({
      /** Exact name of existing entity to tag */
      entityName: string;
      /** Array of tags to add (case-sensitive, exact-match labels) */
      tags: (string)[];
    })[];
    /** Project identifier for data isolation. Must be consistent across all calls in a conversation */
    project_id?: string;
  };
  function memory_add_tags(args: MemoryAdd_tagsArgs): Promise<any>;

  /**
   * REMOVE specific TAGS from existing entities to maintain accurate categorization. Use for status updates, priority changes, or cleaning up outdated classifications. Tags must match exactly (case-sensitive).
   */
  type MemoryRemove_tagsArgs = {
    /** Array of tag removal requests specifying which tags to remove from which entities */
    updates: ({
      /** Exact name of entity to update */
      entityName: string;
      /** Array of exact tags to remove (case-sensitive, must match existing tags) */
      tags: (string)[];
    })[];
    /** Project identifier for data isolation. Must be consistent across all calls in a conversation */
    project_id?: string;
  };
  function memory_remove_tags(args: MemoryRemove_tagsArgs): Promise<any>;

}
```

---

### Usage: `system.memory_search_knowledge`
**Description:** SEARCH ENTITIES by TEXT or TAGS across names, types, observations, and tags. Supports exact/fuzzy search modes, multiple query batching, tag filtering, and pagination. Returns entities and their relationships. MUST USE BEFORE create_entities, add_observations, and create_relations to verify entity existence. PAGINATION: Use page parameter to navigate large result sets (page=0 for first page, page=1 for second, etc.).

**Code Mode Example:**
```typescript
// Example for system.memory_search_knowledge
await system.memory_search_knowledge({ /* ... */ });
```

---

### Usage: `system.memory_create_entities`
**Description:** CREATE new entities with OBSERVATIONS and optional tags. MANDATORY: If creating multiple entities, use a SINGLE call (batch). Each entity requires a unique name, type, and at least one observation. Ignores existing names. Use search_knowledge first.

**Code Mode Example:**
```typescript
// Example for system.memory_create_entities
await system.memory_create_entities({ /* ... */ });
```

---

### Usage: `system.memory_add_observations`
**Description:** ADD new factual observations to existing entities. Requires exact entity names that exist in the knowledge graph. Use search_knowledge first to verify entity existence.

**Code Mode Example:**
```typescript
// Example for system.memory_add_observations
await system.memory_add_observations({ /* ... */ });
```

---

### Usage: `system.memory_create_relations`
**Description:** CREATE directional RELATIONSHIPS between existing entities. Both source and target entities must exist. Use active voice relationship types (e.g., 'works_at', 'manages', 'depends_on'). Verify entity existence with search_knowledge first.

**Code Mode Example:**
```typescript
// Example for system.memory_create_relations
await system.memory_create_relations({ /* ... */ });
```

---

### Usage: `system.memory_delete_entities`
**Description:** Permanently DELETE entities and all their RELATIONSHIPS. This action is irreversible and cascades to remove all connections. Verify entity existence with search_knowledge first. Consider delete_observations for partial updates.

**Code Mode Example:**
```typescript
// Example for system.memory_delete_entities
await system.memory_delete_entities({ /* ... */ });
```

---

### Usage: `system.memory_delete_observations`
**Description:** DELETE specific OBSERVATIONS from entities while preserving the entity, its relationships, and tags. Use for correcting errors or removing outdated facts without deleting the entire entity.

**Code Mode Example:**
```typescript
// Example for system.memory_delete_observations
await system.memory_delete_observations({ /* ... */ });
```

---

### Usage: `system.memory_delete_relations`
**Description:** DELETE specific RELATIONSHIPS between entities while preserving both entities. Use for updating connection status when relationships change (job changes, project completion, etc.).

**Code Mode Example:**
```typescript
// Example for system.memory_delete_relations
await system.memory_delete_relations({ /* ... */ });
```

---

### Usage: `system.memory_read_graph`
**Description:** RETRIEVE the complete KNOWLEDGE GRAPH with all entities and relationships for a project. Returns comprehensive view of the entire network structure. Can be large for projects with many entities.

**Code Mode Example:**
```typescript
// Example for system.memory_read_graph
await system.memory_read_graph({ /* ... */ });
```

---

### Usage: `system.memory_open_nodes`
**Description:** RETRIEVE specific ENTITIES by exact names along with their interconnections. Returns detailed information about the specified entities and relationships between them. Requires knowing exact entity names.

**Code Mode Example:**
```typescript
// Example for system.memory_open_nodes
await system.memory_open_nodes({ /* ... */ });
```

---

### Usage: `system.memory_add_tags`
**Description:** ADD categorical TAGS to existing entities for filtering and organization. Tags are case-sensitive exact-match labels used for quick retrieval with search_knowledge. Common categories: status, priority, type, domain.

**Code Mode Example:**
```typescript
// Example for system.memory_add_tags
await system.memory_add_tags({ /* ... */ });
```

---

### Usage: `system.memory_remove_tags`
**Description:** REMOVE specific TAGS from existing entities to maintain accurate categorization. Use for status updates, priority changes, or cleaning up outdated classifications. Tags must match exactly (case-sensitive).

**Code Mode Example:**
```typescript
// Example for system.memory_remove_tags
await system.memory_remove_tags({ /* ... */ });
```

---
