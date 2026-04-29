import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { z } from 'zod';
import { getBasetoolService } from '../services/basetool.service.js';
import { TRPCError } from '@trpc/server';

/**
 * Basetool Router - tRPC endpoints for Basetool operations
 * Provides a clean interface for frontend to interact with Basetool
 */

export const basetoolRouter = createTRPCRouter({
  /**
   * Get all table schemas
   */
  getTableSchemas: publicProcedure.query(async () => {
    const service = getBasetoolService();
    return await service.getTableSchemas();
  }),

  /**
   * Get schema for a specific table
   */
  getTableSchema: publicProcedure
    .input(z.object({ tableName: z.string() }))
    .query(async ({ input }) => {
      const service = getBasetoolService();
      return await service.getTableSchema(input.tableName);
    }),

  /**
   * List all available tables
   */
  listTables: publicProcedure.query(async () => {
    const service = getBasetoolService();
    return await service.listTables();
  }),

  /**
   * Get data from a table with optional filters
   */
  getTableData: publicProcedure
    .input(
      z.object({
        tableName: z.string(),
        filters: z
          .object({
            where: z.record(z.unknown()).optional(),
            orderBy: z.record(z.enum(['asc', 'desc'])).optional(),
            limit: z.number().min(1).max(1000).optional(),
            offset: z.number().min(0).optional()
          })
          .optional()
      })
    )
    .query(async ({ input }) => {
      const service = getBasetoolService();
      return await service.getTableData(input.tableName, input.filters);
    }),

  /**
   * Create a new row in a table
   */
  createRow: publicProcedure
    .input(
      z.object({
        tableName: z.string(),
        values: z.record(z.unknown())
      })
    )
    .mutation(async ({ input }) => {
      const service = getBasetoolService();
      return await service.createRow(input.tableName, input.values);
    }),

  /**
   * Update an existing row in a table
   */
  updateRow: publicProcedure
    .input(
      z.object({
        tableName: z.string(),
        rowId: z.string(),
        values: z.record(z.unknown())
      })
    )
    .mutation(async ({ input }) => {
      const service = getBasetoolService();
      return await service.updateRow(input.tableName, input.rowId, input.values);
    }),

  /**
   * Delete a row from a table
   */
  deleteRow: publicProcedure
    .input(
      z.object({
        tableName: z.string(),
        rowId: z.string()
      })
    )
    .mutation(async ({ input }) => {
      const service = getBasetoolService();
      await service.deleteRow(input.tableName, input.rowId);
      return { success: true };
    }),

  /**
   * Execute a custom SQL query
   */
  executeSQL: publicProcedure
    .input(
      z.object({
        query: z.string(),
        params: z.record(z.unknown()).optional()
      })
    )
    .mutation(async ({ input }) => {
      const service = getBasetoolService();
      return await service.runSQL(input.query, input.params);
    }),

  /**
   * Generate SQL from visual query builder relationships
   */
  generateSQL: publicProcedure
    .input(
      z.object({
        tables: z.array(z.string()),
        relationships: z.array(
          z.object({
            fromTable: z.string(),
            fromColumn: z.string(),
            toTable: z.string(),
            toColumn: z.string(),
            type: z.enum(['inner', 'left', 'right', 'full']).optional()
          })
        ),
        select: z.array(z.string()).optional(),
        filters: z.record(z.unknown()).optional(),
        orderBy: z
          .array(
            z.object({
              column: z.string(),
              direction: z.enum(['asc', 'desc'])
            })
          )
          .optional(),
        limit: z.number().optional(),
        userQuery: z.string().optional()
      })
    )
    .mutation(async ({ input }) => {
      const { getAiSqlGeneratorService } = await import('../services/aiSqlGenerator.service.js');
      const basetoolService = getBasetoolService();
      const aiService = getAiSqlGeneratorService();

      // Get table schemas for context
      const schemas = await Promise.all(
        input.tables.map(async (tableName) => {
          const schema = await basetoolService.getTableSchema(tableName);
          return {
            name: schema.name,
            columns: schema.columns.map((col) => ({
              name: col.name,
              type: col.type
            }))
          };
        })
      );

      // Generate SQL
      const sql = await aiService.generateSQL(input, schemas);

      // Validate SQL
      const validation = aiService.validateSQL(sql);
      if (!validation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invalid SQL: ${validation.errors.join(', ')}`
        });
      }

      return { sql, validation };
    }),

  /**
   * Validate a SQL query
   */
  validateSQL: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const { getAiSqlGeneratorService } = await import('../services/aiSqlGenerator.service.js');
      const aiService = getAiSqlGeneratorService();
      return aiService.validateSQL(input.query);
    }),

  /**
   * Batch create multiple rows in a table
   */
  batchCreateRows: publicProcedure
    .input(
      z.object({
        tableName: z.string(),
        rows: z.array(z.record(z.unknown()))
      })
    )
    .mutation(async ({ input }) => {
      const service = getBasetoolService();
      return await service.batchCreateRows(input.tableName, input.rows);
    })
});
