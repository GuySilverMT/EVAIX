## 🛠️ TOOL SIGNATURES
```typescript
declare namespace system {
  /**
   * Analyze PostgreSQL database configuration and performance
   */
  type PostgresPg_analyze_databaseArgs = {
    /** PostgreSQL connection string (optional if POSTGRES_CONNECTION_STRING environment variable or --connection-string CLI option is set) */
    connectionString?: string;
    /** Type of analysis to perform */
    analysisType?: 'configuration' | 'performance' | 'security';
  };
  function postgres_pg_analyze_database(args: PostgresPg_analyze_databaseArgs): Promise<any>;

  /**
   * Manage PostgreSQL functions - get, create, or drop functions with a single tool. Examples: operation="get" to list functions, operation="create" with functionName="test_func", parameters="" (empty for no params), returnType="TEXT", functionBody="SELECT 'Hello'"
   */
  type PostgresPg_manage_functionsArgs = {
    /** PostgreSQL connection string (optional) */
    connectionString?: string;
    /** Operation to perform: get (list/info), create (new function), or drop (remove function) */
    operation: 'get' | 'create' | 'drop';
    /** Name of the function (required for create/drop, optional for get to filter) */
    functionName?: string;
    /** Schema name (defaults to public) */
    schema?: string;
    /** Function parameters - required for create operation, required for drop when function is overloaded. Use empty string "" for functions with no parameters */
    parameters?: string;
    /** Return type of the function (required for create operation) */
    returnType?: string;
    /** Function body code (required for create operation) */
    functionBody?: string;
    /** Function language (defaults to plpgsql for create) */
    language?: 'sql' | 'plpgsql' | 'plpython3u';
    /** Function volatility (defaults to VOLATILE for create) */
    volatility?: 'VOLATILE' | 'STABLE' | 'IMMUTABLE';
    /** Function security context (defaults to INVOKER for create) */
    security?: 'INVOKER' | 'DEFINER';
    /** Whether to replace the function if it exists (for create operation) */
    replace?: boolean;
    /** Whether to include IF EXISTS clause (for drop operation) */
    ifExists?: boolean;
    /** Whether to include CASCADE clause (for drop operation) */
    cascade?: boolean;
  };
  function postgres_pg_manage_functions(args: PostgresPg_manage_functionsArgs): Promise<any>;

  /**
   * Manage PostgreSQL Row-Level Security - enable/disable RLS and manage policies. Examples: operation="enable" with tableName="users", operation="create_policy" with tableName, policyName, using, check
   */
  type PostgresPg_manage_rlsArgs = {
    /** PostgreSQL connection string (optional) */
    connectionString?: string;
    /** Operation: enable/disable RLS, create_policy, edit_policy, drop_policy, get_policies */
    operation: 'enable' | 'disable' | 'create_policy' | 'edit_policy' | 'drop_policy' | 'get_policies';
    /** Table name (required for enable/disable/create_policy/edit_policy/drop_policy, optional filter for get_policies) */
    tableName?: string;
    /** Schema name (defaults to public) */
    schema?: string;
    /** Policy name (required for create_policy/edit_policy/drop_policy) */
    policyName?: string;
    /** USING expression for policy (required for create_policy, optional for edit_policy) */
    using?: string;
    /** WITH CHECK expression for policy (optional for create_policy/edit_policy) */
    check?: string;
    /** Command the policy applies to (for create_policy) */
    command?: 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    /** Role the policy applies to (for create_policy) */
    role?: string;
    /** Whether to replace policy if exists (for create_policy) */
    replace?: boolean;
    /** List of roles for policy (for edit_policy) */
    roles?: (string)[];
    /** Include IF EXISTS clause (for drop_policy) */
    ifExists?: boolean;
  };
  function postgres_pg_manage_rls(args: PostgresPg_manage_rlsArgs): Promise<any>;

  /**
   * Debug common PostgreSQL issues
   */
  type PostgresPg_debug_databaseArgs = {
    connectionString?: string;
    issue: 'connection' | 'performance' | 'locks' | 'replication';
    logLevel?: 'info' | 'debug' | 'trace';
  };
  function postgres_pg_debug_database(args: PostgresPg_debug_databaseArgs): Promise<any>;

  /**
   * Manage PostgreSQL schema - get schema info, create/alter tables, manage enums. Examples: operation="get_info" for table lists, operation="create_table" with tableName and columns, operation="get_enums" to list enums, operation="create_enum" with enumName and values
   */
  type PostgresPg_manage_schemaArgs = {
    /** PostgreSQL connection string (optional) */
    connectionString?: string;
    /** Operation: get_info (schema/table info), create_table (new table), alter_table (modify table), get_enums (list ENUMs), create_enum (new ENUM) */
    operation: 'get_info' | 'create_table' | 'alter_table' | 'get_enums' | 'create_enum';
    /** Table name (optional for get_info to get specific table info, required for create_table/alter_table) */
    tableName?: string;
    /** Schema name (defaults to public) */
    schema?: string;
    /** Column definitions (required for create_table) */
    columns?: ({
      name: string;
      /** PostgreSQL data type */
      type: string;
      nullable?: boolean;
      /** Default value expression */
      default?: string;
    })[];
    /** Alter operations (required for alter_table) */
    operations?: ({
      type: 'add' | 'alter' | 'drop';
      columnName: string;
      /** PostgreSQL data type (for add/alter) */
      dataType?: string;
      /** Whether the column can be NULL (for add/alter) */
      nullable?: boolean;
      /** Default value expression (for add/alter) */
      default?: string;
    })[];
    /** ENUM name (optional for get_enums to filter, required for create_enum) */
    enumName?: string;
    /** ENUM values (required for create_enum) */
    values?: (string)[];
    /** Include IF NOT EXISTS clause (for create_enum) */
    ifNotExists?: boolean;
  };
  function postgres_pg_manage_schema(args: PostgresPg_manage_schemaArgs): Promise<any>;

  /**
   * Export table data to JSON or CSV format
   */
  type PostgresPg_export_table_dataArgs = {
    connectionString?: string;
    tableName: string;
    /** absolute path to save the exported data */
    outputPath: string;
    where?: string;
    limit?: number;
    format?: 'json' | 'csv';
  };
  function postgres_pg_export_table_data(args: PostgresPg_export_table_dataArgs): Promise<any>;

  /**
   * Import data from JSON or CSV file into a table
   */
  type PostgresPg_import_table_dataArgs = {
    connectionString?: string;
    tableName: string;
    /** absolute path to the file to import */
    inputPath: string;
    truncateFirst?: boolean;
    format?: 'json' | 'csv';
    delimiter?: string;
  };
  function postgres_pg_import_table_data(args: PostgresPg_import_table_dataArgs): Promise<any>;

  /**
   * Copy data between two databases
   */
  type PostgresPg_copy_between_databasesArgs = {
    sourceConnectionString: string;
    targetConnectionString: string;
    tableName: string;
    where?: string;
    truncateTarget?: boolean;
  };
  function postgres_pg_copy_between_databases(args: PostgresPg_copy_between_databasesArgs): Promise<any>;

  /**
   * Get real-time monitoring information for a PostgreSQL database
   */
  type PostgresPg_monitor_databaseArgs = {
    connectionString?: string;
    includeTables?: boolean;
    includeQueries?: boolean;
    includeLocks?: boolean;
    includeReplication?: boolean;
    /** Alert thresholds */
    alertThresholds?: {
      /** Connection usage percentage threshold */
      connectionPercentage?: number;
      /** Long-running query threshold in seconds */
      longRunningQuerySeconds?: number;
      /** Cache hit ratio threshold */
      cacheHitRatio?: number;
      /** Dead tuples percentage threshold */
      deadTuplesPercentage?: number;
      /** Vacuum age threshold in days */
      vacuumAge?: number;
    };
  };
  function postgres_pg_monitor_database(args: PostgresPg_monitor_databaseArgs): Promise<any>;

  /**
   * Get step-by-step PostgreSQL setup instructions
   */
  type PostgresPg_get_setup_instructionsArgs = {
    platform: 'linux' | 'macos' | 'windows';
    version?: string;
    useCase?: 'development' | 'production';
  };
  function postgres_pg_get_setup_instructions(args: PostgresPg_get_setup_instructionsArgs): Promise<any>;

  /**
   * Manage PostgreSQL triggers - get, create, drop, and enable/disable triggers. Examples: operation="get" to list triggers, operation="create" with triggerName, tableName, functionName, operation="drop" with triggerName and tableName, operation="set_state" with triggerName, tableName, enable
   */
  type PostgresPg_manage_triggersArgs = {
    /** PostgreSQL connection string (optional) */
    connectionString?: string;
    /** Operation: get (list triggers), create (new trigger), drop (remove trigger), set_state (enable/disable trigger) */
    operation: 'get' | 'create' | 'drop' | 'set_state';
    /** Schema name (defaults to public) */
    schema?: string;
    /** Table name (optional filter for get, required for create/drop/set_state) */
    tableName?: string;
    /** Trigger name (required for create/drop/set_state) */
    triggerName?: string;
    /** Function name (required for create operation) */
    functionName?: string;
    /** Trigger timing (for create operation, defaults to AFTER) */
    timing?: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
    /** Trigger events (for create operation, defaults to ["INSERT"]) */
    events?: ('INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE')[];
    /** FOR EACH ROW or STATEMENT (for create operation, defaults to ROW) */
    forEach?: 'ROW' | 'STATEMENT';
    /** WHEN clause condition (for create operation) */
    when?: string;
    /** Whether to replace trigger if exists (for create operation) */
    replace?: boolean;
    /** Include IF EXISTS clause (for drop operation) */
    ifExists?: boolean;
    /** Include CASCADE clause (for drop operation) */
    cascade?: boolean;
    /** Whether to enable the trigger (required for set_state operation) */
    enable?: boolean;
  };
  function postgres_pg_manage_triggers(args: PostgresPg_manage_triggersArgs): Promise<any>;

  /**
   * Manage PostgreSQL indexes - get, create, drop, reindex, and analyze usage with a single tool. Examples: operation="get" to list indexes, operation="create" with indexName, tableName, columns, operation="analyze_usage" for performance analysis
   */
  type PostgresPg_manage_indexesArgs = {
    /** PostgreSQL connection string (optional) */
    connectionString?: string;
    /** Operation: get (list indexes), create (new index), drop (remove index), reindex (rebuild), analyze_usage (find unused/duplicate) */
    operation: 'get' | 'create' | 'drop' | 'reindex' | 'analyze_usage';
    /** Schema name (defaults to public) */
    schema?: string;
    /** Table name (optional for get/analyze_usage, required for create) */
    tableName?: string;
    /** Index name (required for create/drop) */
    indexName?: string;
    /** Include usage statistics (for get operation) */
    includeStats?: boolean;
    /** Column names for the index (required for create operation) */
    columns?: (string)[];
    /** Create unique index (for create operation) */
    unique?: boolean;
    /** Create/drop index concurrently (for create/drop operations) */
    concurrent?: boolean;
    /** Index method (for create operation, defaults to btree) */
    method?: 'btree' | 'hash' | 'gist' | 'spgist' | 'gin' | 'brin';
    /** WHERE clause for partial index (for create operation) */
    where?: string;
    /** Include IF NOT EXISTS clause (for create operation) */
    ifNotExists?: boolean;
    /** Include IF EXISTS clause (for drop operation) */
    ifExists?: boolean;
    /** Include CASCADE clause (for drop operation) */
    cascade?: boolean;
    /** Target name for reindex (required for reindex operation) */
    target?: string;
    /** Type of target for reindex (required for reindex operation) */
    type?: 'index' | 'table' | 'schema' | 'database';
    /** Minimum index size in bytes (for analyze_usage operation) */
    minSizeBytes?: number;
    /** Include unused indexes (for analyze_usage operation) */
    showUnused?: boolean;
    /** Detect duplicate indexes (for analyze_usage operation) */
    showDuplicates?: boolean;
  };
  function postgres_pg_manage_indexes(args: PostgresPg_manage_indexesArgs): Promise<any>;

  /**
   * Manage PostgreSQL query analysis and performance - operation="explain" for EXPLAIN plans, operation="get_slow_queries" for slow query analysis, operation="get_stats" for query statistics, operation="reset_stats" for clearing statistics
   */
  type PostgresPg_manage_queryArgs = {
    /** Operation: explain (EXPLAIN/EXPLAIN ANALYZE query), get_slow_queries (find slow queries from pg_stat_statements), get_stats (query statistics with cache hit ratios), reset_stats (reset pg_stat_statements) */
    operation: 'explain' | 'get_slow_queries' | 'get_stats' | 'reset_stats';
    connectionString?: string;
    /** SQL query to explain (required for explain operation) */
    query?: string;
    /** Use EXPLAIN ANALYZE - actually executes the query (for explain operation) */
    analyze?: boolean;
    /** Include buffer usage information (for explain operation) */
    buffers?: boolean;
    /** Include verbose output (for explain operation) */
    verbose?: boolean;
    /** Include cost estimates (for explain operation) */
    costs?: boolean;
    /** Output format (for explain operation) */
    format?: 'text' | 'json' | 'xml' | 'yaml';
    /** Number of slow queries to return (for get_slow_queries operation) */
    limit?: number;
    /** Minimum average duration in milliseconds (for get_slow_queries operation) */
    minDuration?: number;
    /** Sort order (for get_slow_queries and get_stats operations) */
    orderBy?: 'mean_time' | 'total_time' | 'calls' | 'cache_hit_ratio';
    /** Include normalized query text (for get_slow_queries operation) */
    includeNormalized?: boolean;
    /** Minimum number of calls (for get_stats operation) */
    minCalls?: number;
    /** Filter queries containing this pattern (for get_stats operation) */
    queryPattern?: string;
    /** Specific query ID to reset (for reset_stats operation, resets all if not provided) */
    queryId?: string;
  };
  function postgres_pg_manage_query(args: PostgresPg_manage_queryArgs): Promise<any>;

  /**
   * Manage PostgreSQL users and permissions - create, drop, alter users, grant/revoke permissions. Examples: operation="create" with username="testuser", operation="grant" with username, permissions, target, targetType
   */
  type PostgresPg_manage_usersArgs = {
    /** PostgreSQL connection string (optional) */
    connectionString?: string;
    /** Operation: create (new user), drop (remove user), alter (modify user), grant (permissions), revoke (permissions), get_permissions (view permissions), list (all users) */
    operation: 'create' | 'drop' | 'alter' | 'grant' | 'revoke' | 'get_permissions' | 'list';
    /** Username (required for create/drop/alter/grant/revoke/get_permissions, optional filter for list) */
    username?: string;
    /** Password for the user (for create operation) */
    password?: string;
    /** Grant superuser privileges (for create/alter operations) */
    superuser?: boolean;
    /** Allow user to create databases (for create/alter operations) */
    createdb?: boolean;
    /** Allow user to create roles (for create/alter operations) */
    createrole?: boolean;
    /** Allow user to login (for create/alter operations) */
    login?: boolean;
    /** Allow replication privileges (for create/alter operations) */
    replication?: boolean;
    /** Maximum number of connections (for create/alter operations) */
    connectionLimit?: number;
    /** Password expiration date YYYY-MM-DD (for create/alter operations) */
    validUntil?: string;
    /** Inherit privileges from parent roles (for create/alter operations) */
    inherit?: boolean;
    /** Include IF EXISTS clause (for drop operation) */
    ifExists?: boolean;
    /** Include CASCADE to drop owned objects (for drop/revoke operations) */
    cascade?: boolean;
    /** Permissions to grant/revoke: ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER", "ALL"] */
    permissions?: ('SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE' | 'REFERENCES' | 'TRIGGER' | 'ALL')[];
    /** Target object name (for grant/revoke operations) */
    target?: string;
    /** Type of target object (for grant/revoke operations) */
    targetType?: 'table' | 'schema' | 'database' | 'sequence' | 'function';
    /** Allow user to grant these permissions to others (for grant operation) */
    withGrantOption?: boolean;
    /** Filter by schema (for get_permissions operation) */
    schema?: string;
    /** Include system roles (for list operation) */
    includeSystemRoles?: boolean;
  };
  function postgres_pg_manage_users(args: PostgresPg_manage_usersArgs): Promise<any>;

  /**
   * Manage PostgreSQL constraints - get, create foreign keys, drop foreign keys, create constraints, drop constraints. Examples: operation="get" to list constraints, operation="create_fk" with constraintName, tableName, columnNames, referencedTable, referencedColumns
   */
  type PostgresPg_manage_constraintsArgs = {
    /** PostgreSQL connection string (optional) */
    connectionString?: string;
    /** Operation: get (list constraints), create_fk (foreign key), drop_fk (drop foreign key), create (constraint), drop (constraint) */
    operation: 'get' | 'create_fk' | 'drop_fk' | 'create' | 'drop';
    /** Schema name (defaults to public) */
    schema?: string;
    /** Constraint name (required for create_fk/drop_fk/create/drop) */
    constraintName?: string;
    /** Table name (optional filter for get, required for create_fk/drop_fk/create/drop) */
    tableName?: string;
    /** Filter by constraint type (for get operation) */
    constraintType?: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK';
    /** Column names in the table (required for create_fk) */
    columnNames?: (string)[];
    /** Referenced table name (required for create_fk) */
    referencedTable?: string;
    /** Referenced column names (required for create_fk) */
    referencedColumns?: (string)[];
    /** Referenced table schema (for create_fk, defaults to same as table schema) */
    referencedSchema?: string;
    /** ON UPDATE action (for create_fk) */
    onUpdate?: 'NO ACTION' | 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'SET DEFAULT';
    /** ON DELETE action (for create_fk) */
    onDelete?: 'NO ACTION' | 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'SET DEFAULT';
    /** Type of constraint to create (for create operation) */
    constraintTypeCreate?: 'unique' | 'check' | 'primary_key';
    /** Check expression (for create operation with check constraints) */
    checkExpression?: string;
    /** Make constraint deferrable (for create_fk/create operations) */
    deferrable?: boolean;
    /** Initially deferred (for create_fk/create operations) */
    initiallyDeferred?: boolean;
    /** Include IF EXISTS clause (for drop_fk/drop operations) */
    ifExists?: boolean;
    /** Include CASCADE clause (for drop_fk/drop operations) */
    cascade?: boolean;
  };
  function postgres_pg_manage_constraints(args: PostgresPg_manage_constraintsArgs): Promise<any>;

  /**
   * Execute SELECT queries and data retrieval operations - operation="select/count/exists" with query and optional parameters. Examples: operation="select", query="SELECT * FROM users WHERE created_at > $1", parameters=["2024-01-01"]
   */
  type PostgresPg_execute_queryArgs = {
    /** PostgreSQL connection string (optional) */
    connectionString?: string;
    /** Query operation: select (fetch rows), count (count rows), exists (check existence) */
    operation: 'select' | 'count' | 'exists';
    /** SQL SELECT query to execute */
    query: string;
    /** Parameter values for prepared statement placeholders ($1, $2, etc.) */
    parameters?: (any)[];
    /** Maximum number of rows to return (safety limit) */
    limit?: number;
    /** Query timeout in milliseconds */
    timeout?: number;
  };
  function postgres_pg_execute_query(args: PostgresPg_execute_queryArgs): Promise<any>;

  /**
   * Execute data modification operations (INSERT/UPDATE/DELETE/UPSERT) - operation="insert/update/delete/upsert" with table and data. Examples: operation="insert", table="users", data={"name":"John","email":"john@example.com"}
   */
  type PostgresPg_execute_mutationArgs = {
    /** PostgreSQL connection string (optional) */
    connectionString?: string;
    /** Mutation operation: insert (add rows), update (modify rows), delete (remove rows), upsert (insert or update) */
    operation: 'insert' | 'update' | 'delete' | 'upsert';
    /** Table name for the operation */
    table: string;
    /** Data object with column-value pairs (required for insert/update/upsert) */
    data?: Record<string, any>;
    /** WHERE clause for update/delete operations (without WHERE keyword) */
    where?: string;
    /** Columns for conflict resolution in upsert (ON CONFLICT) */
    conflictColumns?: (string)[];
    /** RETURNING clause to get back inserted/updated data */
    returning?: string;
    /** Schema name (defaults to public) */
    schema?: string;
  };
  function postgres_pg_execute_mutation(args: PostgresPg_execute_mutationArgs): Promise<any>;

  /**
   * Execute arbitrary SQL statements - sql="ANY_VALID_SQL" with optional parameters and transaction support. Examples: sql="CREATE INDEX ...", sql="WITH complex_cte AS (...) SELECT ...", transactional=true
   */
  type PostgresPg_execute_sqlArgs = {
    /** PostgreSQL connection string (optional) */
    connectionString?: string;
    /** SQL statement to execute (can be any valid PostgreSQL SQL) */
    sql: string;
    /** Parameter values for prepared statement placeholders ($1, $2, etc.) */
    parameters?: (any)[];
    /** Whether to expect rows back (false for statements like CREATE, DROP, etc.) */
    expectRows?: boolean;
    /** Query timeout in milliseconds */
    timeout?: number;
    /** Whether to wrap in a transaction */
    transactional?: boolean;
  };
  function postgres_pg_execute_sql(args: PostgresPg_execute_sqlArgs): Promise<any>;

  /**
   * Manage PostgreSQL object comments - get, set, remove comments on tables, columns, functions, and other database objects. Examples: operation="get" with objectType="table", objectName="users", operation="set" with comment text, operation="bulk_get" for discovery
   */
  type PostgresPg_manage_commentsArgs = {
    /** PostgreSQL connection string (optional) */
    connectionString?: string;
    /** Operation: get (retrieve comments), set (add/update comment), remove (delete comment), bulk_get (discovery mode) */
    operation: 'get' | 'set' | 'remove' | 'bulk_get';
    /** Type of database object (required for get/set/remove) */
    objectType?: 'table' | 'column' | 'index' | 'constraint' | 'function' | 'trigger' | 'view' | 'sequence' | 'schema' | 'database';
    /** Name of the object (required for get/set/remove) */
    objectName?: string;
    /** Schema name (defaults to public, required for most object types) */
    schema?: string;
    /** Column name (required when objectType is "column") */
    columnName?: string;
    /** Comment text (required for set operation) */
    comment?: string;
    /** Include system objects in bulk_get (defaults to false) */
    includeSystemObjects?: boolean;
    /** Filter by object type in bulk_get operation */
    filterObjectType?: 'table' | 'column' | 'index' | 'constraint' | 'function' | 'trigger' | 'view' | 'sequence' | 'schema' | 'database';
  };
  function postgres_pg_manage_comments(args: PostgresPg_manage_commentsArgs): Promise<any>;

}
```

---

### Usage: `system.postgres_pg_analyze_database`
**Description:** Analyze PostgreSQL database configuration and performance

**Code Mode Example:**
```typescript
// Example for system.postgres_pg_analyze_database
await system.postgres_pg_analyze_database({ /* ... */ });
```

---

### Usage: `system.postgres_pg_manage_functions`
**Description:** Manage PostgreSQL functions - get, create, or drop functions with a single tool. Examples: operation="get" to list functions, operation="create" with functionName="test_func", parameters="" (empty for no params), returnType="TEXT", functionBody="SELECT 'Hello'"

**Code Mode Example:**
```typescript
// Example for system.postgres_pg_manage_functions
await system.postgres_pg_manage_functions({ /* ... */ });
```

---

### Usage: `system.postgres_pg_manage_rls`
**Description:** Manage PostgreSQL Row-Level Security - enable/disable RLS and manage policies. Examples: operation="enable" with tableName="users", operation="create_policy" with tableName, policyName, using, check

**Code Mode Example:**
```typescript
// Example for system.postgres_pg_manage_rls
await system.postgres_pg_manage_rls({ /* ... */ });
```

---

### Usage: `system.postgres_pg_debug_database`
**Description:** Debug common PostgreSQL issues

**Code Mode Example:**
```typescript
// Example for system.postgres_pg_debug_database
await system.postgres_pg_debug_database({ /* ... */ });
```

---

### Usage: `system.postgres_pg_manage_schema`
**Description:** Manage PostgreSQL schema - get schema info, create/alter tables, manage enums. Examples: operation="get_info" for table lists, operation="create_table" with tableName and columns, operation="get_enums" to list enums, operation="create_enum" with enumName and values

**Code Mode Example:**
```typescript
// Example for system.postgres_pg_manage_schema
await system.postgres_pg_manage_schema({ /* ... */ });
```

---

### Usage: `system.postgres_pg_export_table_data`
**Description:** Export table data to JSON or CSV format

**Code Mode Example:**
```typescript
// Example for system.postgres_pg_export_table_data
await system.postgres_pg_export_table_data({ /* ... */ });
```

---

### Usage: `system.postgres_pg_import_table_data`
**Description:** Import data from JSON or CSV file into a table

**Code Mode Example:**
```typescript
// Example for system.postgres_pg_import_table_data
await system.postgres_pg_import_table_data({ /* ... */ });
```

---

### Usage: `system.postgres_pg_copy_between_databases`
**Description:** Copy data between two databases

**Code Mode Example:**
```typescript
// Example for system.postgres_pg_copy_between_databases
await system.postgres_pg_copy_between_databases({ /* ... */ });
```

---

### Usage: `system.postgres_pg_monitor_database`
**Description:** Get real-time monitoring information for a PostgreSQL database

**Code Mode Example:**
```typescript
// Example for system.postgres_pg_monitor_database
await system.postgres_pg_monitor_database({ /* ... */ });
```

---

### Usage: `system.postgres_pg_get_setup_instructions`
**Description:** Get step-by-step PostgreSQL setup instructions

**Code Mode Example:**
```typescript
// Example for system.postgres_pg_get_setup_instructions
await system.postgres_pg_get_setup_instructions({ /* ... */ });
```

---

### Usage: `system.postgres_pg_manage_triggers`
**Description:** Manage PostgreSQL triggers - get, create, drop, and enable/disable triggers. Examples: operation="get" to list triggers, operation="create" with triggerName, tableName, functionName, operation="drop" with triggerName and tableName, operation="set_state" with triggerName, tableName, enable

**Code Mode Example:**
```typescript
// Example for system.postgres_pg_manage_triggers
await system.postgres_pg_manage_triggers({ /* ... */ });
```

---

### Usage: `system.postgres_pg_manage_indexes`
**Description:** Manage PostgreSQL indexes - get, create, drop, reindex, and analyze usage with a single tool. Examples: operation="get" to list indexes, operation="create" with indexName, tableName, columns, operation="analyze_usage" for performance analysis

**Code Mode Example:**
```typescript
// Example for system.postgres_pg_manage_indexes
await system.postgres_pg_manage_indexes({ /* ... */ });
```

---

### Usage: `system.postgres_pg_manage_query`
**Description:** Manage PostgreSQL query analysis and performance - operation="explain" for EXPLAIN plans, operation="get_slow_queries" for slow query analysis, operation="get_stats" for query statistics, operation="reset_stats" for clearing statistics

**Code Mode Example:**
```typescript
// Example for system.postgres_pg_manage_query
await system.postgres_pg_manage_query({ /* ... */ });
```

---

### Usage: `system.postgres_pg_manage_users`
**Description:** Manage PostgreSQL users and permissions - create, drop, alter users, grant/revoke permissions. Examples: operation="create" with username="testuser", operation="grant" with username, permissions, target, targetType

**Code Mode Example:**
```typescript
// Example for system.postgres_pg_manage_users
await system.postgres_pg_manage_users({ /* ... */ });
```

---

### Usage: `system.postgres_pg_manage_constraints`
**Description:** Manage PostgreSQL constraints - get, create foreign keys, drop foreign keys, create constraints, drop constraints. Examples: operation="get" to list constraints, operation="create_fk" with constraintName, tableName, columnNames, referencedTable, referencedColumns

**Code Mode Example:**
```typescript
// Example for system.postgres_pg_manage_constraints
await system.postgres_pg_manage_constraints({ /* ... */ });
```

---

### Usage: `system.postgres_pg_execute_query`
**Description:** Execute SELECT queries and data retrieval operations - operation="select/count/exists" with query and optional parameters. Examples: operation="select", query="SELECT * FROM users WHERE created_at > $1", parameters=["2024-01-01"]

**Code Mode Example:**
```typescript
// Example for system.postgres_pg_execute_query
await system.postgres_pg_execute_query({ /* ... */ });
```

---

### Usage: `system.postgres_pg_execute_mutation`
**Description:** Execute data modification operations (INSERT/UPDATE/DELETE/UPSERT) - operation="insert/update/delete/upsert" with table and data. Examples: operation="insert", table="users", data={"name":"John","email":"john@example.com"}

**Code Mode Example:**
```typescript
// Example for system.postgres_pg_execute_mutation
await system.postgres_pg_execute_mutation({ /* ... */ });
```

---

### Usage: `system.postgres_pg_execute_sql`
**Description:** Execute arbitrary SQL statements - sql="ANY_VALID_SQL" with optional parameters and transaction support. Examples: sql="CREATE INDEX ...", sql="WITH complex_cte AS (...) SELECT ...", transactional=true

**Code Mode Example:**
```typescript
// Example for system.postgres_pg_execute_sql
await system.postgres_pg_execute_sql({ /* ... */ });
```

---

### Usage: `system.postgres_pg_manage_comments`
**Description:** Manage PostgreSQL object comments - get, set, remove comments on tables, columns, functions, and other database objects. Examples: operation="get" with objectType="table", objectName="users", operation="set" with comment text, operation="bulk_get" for discovery

**Code Mode Example:**
```typescript
// Example for system.postgres_pg_manage_comments
await system.postgres_pg_manage_comments({ /* ... */ });
```

---
