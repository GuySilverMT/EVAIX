import { TRPCError } from '@trpc/server';
import { prisma } from '../db.js';
import { Prisma } from '@prisma/client';

/**
 * Basetool Service - Abstraction layer for database operations
 * Uses Prisma directly instead of external Basetool API
 */

interface TableSchema {
  name: string;
  columns: ColumnSchema[];
}

interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey?: boolean;
  defaultValue?: string | null;
}

interface TableData {
  rows: Record<string, unknown>[];
  totalCount: number;
}

interface QueryFilters {
  where?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  limit?: number;
  offset?: number;
}

// Map Prisma model names to their delegate names
const MODEL_DELEGATES: Record<string, keyof typeof prisma> = {
  'ProviderConfig': 'providerConfig',
  'Workspace': 'workspace',
  'Model': 'model',
  'RoleVariant': 'roleVariant',
  'RoleAssessment': 'roleAssessment',
  'ModelCapabilities': 'modelCapabilities',
  'ChatModel': 'chatModel',
  'EmbeddingModel': 'embeddingModel',
  'VisionModel': 'visionModel',
  'AudioModel': 'audioModel',
  'ImageModel': 'imageModel',
  'ComplianceModel': 'complianceModel',
  'RewardModel': 'rewardModel',
  'UnknownModel': 'unknownModel',
  'ModelUsage': 'modelUsage',
  'Role': 'role',
  'RoleCategory': 'roleCategory',
  'Tool': 'tool',
  'RoleTool': 'roleTool',
  'Job': 'job',
  'KnowledgeVector': 'knowledgeVector',
  'FileIndex': 'fileIndex',
  'WorkOrderCard': 'workOrderCard',
  'PromptRefinement': 'promptRefinement',
  'ModelFailure': 'modelFailure',
  'CardConfig': 'cardConfig',
  'CustomButton': 'customButton',
  'ComponentRole': 'componentRole',
  'VoiceEngine': 'voiceEngine',
  'VoiceRole': 'voiceRole',
};

export class BasetoolService {
  /**
   * Get all table schemas from the database
   */
  async getTableSchemas(): Promise<TableSchema[]> {
    try {
      // Query PostgreSQL information schema for table metadata
      const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;

      const schemas: TableSchema[] = [];

      for (const table of tables) {
        const columns = await prisma.$queryRaw<Array<{
          column_name: string;
          data_type: string;
          is_nullable: string;
          column_default: string | null;
        }>>`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' 
          AND table_name = ${table.table_name}
          ORDER BY ordinal_position
        `;

        schemas.push({
          name: table.table_name,
          columns: columns.map(col => ({
            name: col.column_name,
            type: col.data_type,
            nullable: col.is_nullable === 'YES',
            primaryKey: col.column_name === 'id', // Simple heuristic
            defaultValue: col.column_default
          }))
        });
      }

      return schemas;
    } catch (error) {
      console.error('Error fetching table schemas:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch table schemas from database'
      });
    }
  }

  /**
   * Get schema for a specific table
   */
  async getTableSchema(tableName: string): Promise<TableSchema> {
    try {
      const columns = await prisma.$queryRaw<Array<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }>>`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
        ORDER BY ordinal_position
      `;

      if (columns.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Table ${tableName} not found`
        });
      }

      return {
        name: tableName,
        columns: columns.map(col => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          primaryKey: col.column_name === 'id',
          defaultValue: col.column_default
        }))
      };
    } catch (error) {
      console.error(`Error fetching schema for table ${tableName}:`, error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to fetch schema for table ${tableName}`
      });
    }
  }

  /**
   * Get data from a table with optional filters
   */
  async getTableData(
    tableName: string,
    filters?: QueryFilters
  ): Promise<TableData> {
    try {
      const delegateName = MODEL_DELEGATES[tableName];

      if (!delegateName) {
        // Fallback to raw SQL for unmapped tables
        const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT * FROM "${tableName}" LIMIT ${filters?.limit || 100} OFFSET ${filters?.offset || 0}`
        );
        return { rows, totalCount: rows.length };
      }

      const delegate = prisma[delegateName] as any;

      const [rows, totalCount] = await Promise.all([
        delegate.findMany({
          where: filters?.where,
          orderBy: filters?.orderBy,
          take: filters?.limit || 100,
          skip: filters?.offset || 0
        }),
        delegate.count({ where: filters?.where })
      ]);

      return { rows, totalCount };
    } catch (error) {
      console.error(`Error fetching data from table ${tableName}:`, error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to fetch data from table ${tableName}`
      });
    }
  }

  /**
   * Create a new row in a table
   */
  async createRow(
    tableName: string,
    values: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      const delegateName = MODEL_DELEGATES[tableName];

      if (!delegateName) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Table ${tableName} is not supported for create operations`
        });
      }

      const delegate = prisma[delegateName] as any;
      const result = await delegate.create({ data: values });

      return result;
    } catch (error) {
      console.error(`Error creating row in table ${tableName}:`, error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to create row in table ${tableName}`
      });
    }
  }

  /**
   * Update an existing row in a table
   */
  async updateRow(
    tableName: string,
    rowId: string,
    values: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      const delegateName = MODEL_DELEGATES[tableName];

      if (!delegateName) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Table ${tableName} is not supported for update operations`
        });
      }

      const delegate = prisma[delegateName] as any;
      const result = await delegate.update({
        where: { id: rowId },
        data: values
      });

      return result;
    } catch (error) {
      console.error(`Error updating row in table ${tableName}:`, error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to update row in table ${tableName}`
      });
    }
  }

  /**
   * Delete a row from a table
   */
  async deleteRow(tableName: string, rowId: string): Promise<void> {
    try {
      const delegateName = MODEL_DELEGATES[tableName];

      if (!delegateName) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Table ${tableName} is not supported for delete operations`
        });
      }

      const delegate = prisma[delegateName] as any;
      await delegate.delete({ where: { id: rowId } });
    } catch (error) {
      console.error(`Error deleting row from table ${tableName}:`, error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to delete row from table ${tableName}`
      });
    }
  }

  /**
   * Execute a custom SQL query (READ-ONLY for safety)
   * @param query - SQL query to execute
   * @param params - Optional query parameters for parameterized queries
   */
  async runSQL(
    query: string,
    params?: Record<string, unknown>
  ): Promise<Record<string, unknown>[]> {
    try {
      // Validate that query is SELECT only (security measure)
      const trimmedQuery = query.trim().toUpperCase();
      if (!trimmedQuery.startsWith('SELECT')) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only SELECT queries are allowed for security reasons'
        });
      }

      // Execute raw query
      const result = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(query);
      return result;
    } catch (error) {
      console.error('Error executing SQL query:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to execute SQL query'
      });
    }
  }

  /**
   * List all available tables
   */
  async listTables(): Promise<string[]> {
    try {
      const schemas = await this.getTableSchemas();
      return schemas.map(schema => schema.name);
    } catch (error) {
      console.error('Error listing tables:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to list tables'
      });
    }
  }

  /**
   * Batch create multiple rows in a table
   */
  async batchCreateRows(
    tableName: string,
    rows: Record<string, unknown>[]
  ): Promise<Record<string, unknown>[]> {
    try {
      const delegateName = MODEL_DELEGATES[tableName];

      if (!delegateName) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Table ${tableName} is not supported for batch create operations`
        });
      }

      const delegate = prisma[delegateName] as any;

      // Use transaction for batch operations
      const results = await prisma.$transaction(
        rows.map(row => delegate.create({ data: row }))
      );

      return results;
    } catch (error) {
      console.error(`Error batch creating rows in table ${tableName}:`, error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to batch create rows in table ${tableName}`
      });
    }
  }
}

// Singleton instance for the service
let basetoolServiceInstance: BasetoolService | null = null;

/**
 * Get or create the Basetool service singleton instance
 */
export function getBasetoolService(): BasetoolService {
  if (!basetoolServiceInstance) {
    basetoolServiceInstance = new BasetoolService();
  }
  return basetoolServiceInstance;
}
