import { TRPCError } from '@trpc/server';

/**
 * AI SQL Generator Service
 * Converts visual relationship mappings into SQL queries using LLM
 */

interface TableRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type?: 'inner' | 'left' | 'right' | 'full';
}

interface QueryRequest {
  tables: string[];
  relationships: TableRelationship[];
  select?: string[];
  filters?: Record<string, unknown>;
  orderBy?: { column: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  userQuery?: string; // Natural language query from user
}

interface TableSchema {
  name: string;
  columns: { name: string; type: string }[];
}

export class AiSqlGeneratorService {
  /**
   * Generate SQL query from visual relationships and user intent
   */
  async generateSQL(
    request: QueryRequest,
    schemas: TableSchema[]
  ): Promise<string> {
    // Build the prompt for the LLM
    const prompt = this.buildPrompt(request, schemas);

    try {
      // Here we would call an LLM service (OpenAI, Anthropic, etc.)
      // For now, we'll use a deterministic approach
      const sql = this.buildSQLDeterministically(request, schemas);
      return sql;
    } catch (error) {
      console.error('Error generating SQL:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate SQL query'
      });
    }
  }

  /**
   * Build prompt for LLM to generate SQL
   */
  private buildPrompt(request: QueryRequest, schemas: TableSchema[]): string {
    const schemaDescriptions = schemas
      .map(
        (schema) =>
          `Table: ${schema.name}\nColumns: ${schema.columns
            .map((col) => `${col.name} (${col.type})`)
            .join(', ')}`
      )
      .join('\n\n');

    const relationshipDescriptions = request.relationships
      .map(
        (rel) =>
          `${rel.fromTable}.${rel.fromColumn} -> ${rel.toTable}.${rel.toColumn} (${rel.type || 'inner'} join)`
      )
      .join('\n');

    return `
You are a SQL expert. Generate a SQL query based on the following information:

DATABASE SCHEMA:
${schemaDescriptions}

TABLE RELATIONSHIPS:
${relationshipDescriptions}

SELECTED COLUMNS:
${request.select?.join(', ') || 'All columns from all tables'}

FILTERS:
${JSON.stringify(request.filters || {}, null, 2)}

${request.userQuery ? `USER QUERY: ${request.userQuery}` : ''}

Generate a valid PostgreSQL query that:
1. Joins the tables based on the relationships
2. Selects the specified columns
3. Applies the filters
4. Returns the requested data

Return ONLY the SQL query, no explanations.
    `.trim();
  }

  /**
   * Build SQL deterministically from the request
   * This is a fallback when LLM is not available
   */
  private buildSQLDeterministically(
    request: QueryRequest,
    schemas: TableSchema[]
  ): string {
    const { tables, relationships, select, filters, orderBy, limit } = request;

    // Build SELECT clause
    let selectClause: string;
    if (select && select.length > 0) {
      selectClause = select.join(', ');
    } else {
      // Select all columns from all tables
      selectClause = tables.map((table) => `${table}.*`).join(', ');
    }

    // Build FROM clause (first table)
    const fromTable = tables[0];
    if (!fromTable) {
      throw new Error('At least one table is required');
    }

    // Build JOIN clauses
    const joinClauses: string[] = [];
    for (const rel of relationships) {
      const joinType = (rel.type || 'inner').toUpperCase();
      joinClauses.push(
        `${joinType} JOIN ${rel.toTable} ON ${rel.fromTable}.${rel.fromColumn} = ${rel.toTable}.${rel.toColumn}`
      );
    }

    // Build WHERE clause
    const whereClauses: string[] = [];
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value === null) {
          whereClauses.push(`${key} IS NULL`);
        } else if (typeof value === 'string') {
          whereClauses.push(`${key} = '${value.replace(/'/g, "''")}'`);
        } else if (typeof value === 'number') {
          whereClauses.push(`${key} = ${value}`);
        } else if (typeof value === 'boolean') {
          whereClauses.push(`${key} = ${value ? 'TRUE' : 'FALSE'}`);
        }
      }
    }

    // Build ORDER BY clause
    let orderByClause = '';
    if (orderBy && orderBy.length > 0) {
      orderByClause = `ORDER BY ${orderBy
        .map((o) => `${o.column} ${o.direction.toUpperCase()}`)
        .join(', ')}`;
    }

    // Build LIMIT clause
    const limitClause = limit ? `LIMIT ${limit}` : '';

    // Assemble the query
    const parts = [
      `SELECT ${selectClause}`,
      `FROM ${fromTable}`,
      ...joinClauses,
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '',
      orderByClause,
      limitClause
    ];

    return parts.filter((p) => p !== '').join('\n');
  }

  /**
   * Validate a SQL query for safety
   * Prevents dangerous operations
   */
  validateSQL(sql: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const upperSQL = sql.toUpperCase();

    // Check for dangerous operations
    const dangerousKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE'];
    for (const keyword of dangerousKeywords) {
      if (upperSQL.includes(keyword)) {
        errors.push(`SQL contains dangerous keyword: ${keyword}`);
      }
    }

    // Must be a SELECT query
    if (!upperSQL.trim().startsWith('SELECT')) {
      errors.push('Only SELECT queries are allowed');
    }

    // Check for multiple statements
    const trimmed = sql.trim();
    const lastSemicolon = trimmed.lastIndexOf(';');
    if (lastSemicolon >= 0 && lastSemicolon < trimmed.length - 1) {
      errors.push('Multiple SQL statements are not allowed');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Explain a SQL query in natural language
   */
  async explainSQL(sql: string): Promise<string> {
    // This would call an LLM to explain the query
    // For now, return a simple explanation
    return `This query performs the following operations:
1. Retrieves data from the specified tables
2. Joins tables based on their relationships
3. Filters results based on conditions
4. Orders and limits the results as specified`;
  }
}

// Singleton instance
let aiSqlGeneratorInstance: AiSqlGeneratorService | null = null;

/**
 * Get or create the AI SQL Generator service singleton
 */
export function getAiSqlGeneratorService(): AiSqlGeneratorService {
  if (!aiSqlGeneratorInstance) {
    aiSqlGeneratorInstance = new AiSqlGeneratorService();
  }
  return aiSqlGeneratorInstance;
}
