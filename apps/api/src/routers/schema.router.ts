import { createTRPCRouter, publicProcedure } from '../trpc.js';
import { z } from 'zod';
import { prisma } from '../db.js';
import { TRPCError } from '@trpc/server';

const sanitize = (str: string) => {
  if (!/^[a-zA-Z0-9_]+$/.test(str)) throw new Error(`Invalid identifier: ${str}`);
  return `"${str}"`;
};

// --- Interfaces for Raw Queries ---
interface PostgresColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

interface PostgresTable {
  tablename: string;
}

interface TableCount {
  count: bigint | number;
}

interface ToRegClass {
  reg: string | null;
}

export const schemaRouter = createTRPCRouter({
  proposeMigration: publicProcedure
    .input(z.object({
      tableName: z.string(),
      columnName: z.string(),
      type: z.enum(['TEXT', 'BOOLEAN', 'INTEGER', 'FLOAT', 'JSONB', 'TIMESTAMP']),
    }))
    .mutation(async ({ input }) => {
      const table = sanitize(input.tableName);
      const col = sanitize(input.columnName);
      
      let sql = '';
      switch (input.type) {
        case 'TEXT': sql = `ALTER TABLE ${table} ADD COLUMN ${col} TEXT;`; break;
        case 'BOOLEAN': sql = `ALTER TABLE ${table} ADD COLUMN ${col} BOOLEAN DEFAULT false;`; break;
        case 'INTEGER': sql = `ALTER TABLE ${table} ADD COLUMN ${col} INTEGER;`; break;
        case 'FLOAT': sql = `ALTER TABLE ${table} ADD COLUMN ${col} DOUBLE PRECISION;`; break;
        case 'JSONB': sql = `ALTER TABLE ${table} ADD COLUMN ${col} JSONB DEFAULT '{}';`; break;
        case 'TIMESTAMP': sql = `ALTER TABLE ${table} ADD COLUMN ${col} TIMESTAMP(3);`; break;
      }
      
      return { 
        success: true, 
        sql,
        tableName: input.tableName,
        columnName: input.columnName,
        type: input.type 
      };
    }),

  commitMigration: publicProcedure
    .input(z.object({
      sql: z.string(),
      userSignature: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      if (!input.userSignature) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'User signature required for schema changes'
        });
      }
      
      await prisma.$executeRawUnsafe(input.sql);
      return { success: true };
    }),
  // 1. Get Table Schema (Crucial for seeing empty tables)
  getTableSchema: publicProcedure
    .input(z.object({ tableName: z.string() }))
    .query(async ({ input }) => {
      // Postgres query to get column details
      const result = await prisma.$queryRawUnsafe<PostgresColumn[]>(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, input.tableName);
      return result.map(r => ({
        name: r.column_name,
        column_name: r.column_name, // Alias for frontend compatibility
        type: r.data_type,
        data_type: r.data_type, // Alias for frontend compatibility
        nullable: r.is_nullable === 'YES',
        is_nullable: r.is_nullable // Alias
      }));
    }),

  // 2. Add Column (The "Evolutionary" Tool)
  addColumn: publicProcedure
    .input(z.object({
      tableName: z.string(),
      columnName: z.string(),
      type: z.enum(['TEXT', 'BOOLEAN', 'INTEGER', 'FLOAT', 'JSONB', 'TIMESTAMP']),
      isProtected: z.boolean().default(false) // <--- The "Discretion" Toggle
    }))
    .mutation(async ({ input }) => {
      const table = sanitize(input.tableName);
      
      // AUTO-PROTECTION: Enforce naming convention
      let colName = input.columnName;
      if (input.isProtected && !colName.startsWith('sec_')) {
        colName = `sec_${colName}`; 
      }
      const col = sanitize(colName);

      let sql = '';
      // Always nullable (Fail Open) unless explicitly defaulted
      switch (input.type) {
        case 'TEXT': sql = `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} TEXT;`; break;
        case 'BOOLEAN': sql = `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} BOOLEAN DEFAULT false;`; break;
        case 'INTEGER': sql = `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} INTEGER;`; break;
        case 'FLOAT': sql = `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} DOUBLE PRECISION;`; break;
        case 'JSONB': sql = `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} JSONB DEFAULT '{}';`; break;
        case 'TIMESTAMP': sql = `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} TIMESTAMP(3);`; break;
      }

      await prisma.$executeRawUnsafe(sql);
      return { success: true, column: colName };
    }),

  // 3. Drop a Column (Cleanup)
  dropColumn: publicProcedure
    .input(z.object({ tableName: z.string(), columnName: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.$executeRawUnsafe(`ALTER TABLE ${sanitize(input.tableName)} DROP COLUMN IF EXISTS ${sanitize(input.columnName)};`);
      return { success: true };
    }),

  // 4. Drop a Table (Hard Delete)
  dropTable: publicProcedure
    .input(z.object({ tableName: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ${sanitize(input.tableName)} CASCADE;`);
      return { success: true };
    }),
    
  // 5. Get Tables (For the Sidebar)
  getTables: publicProcedure.query(async () => {
    const result = await prisma.$queryRaw<PostgresTable[]>`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public' 
      AND tablename NOT LIKE '_prisma_%'
      ORDER BY tablename;
    `;
    return result.map(r => r.tablename);
  }),

  // 6. Create Table (Basic)
  createTable: publicProcedure
    .input(z.object({ tableName: z.string() }))
    .mutation(async ({ input }) => {
      const tableName = sanitize(input.tableName);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE ${tableName} (
          id TEXT PRIMARY KEY,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL
        );
      `);
      return { success: true, tableName: input.tableName };
    }),

  // 7. Get Table Data (Simple Select)
  getTableData: publicProcedure
    .input(z.object({ tableName: z.string(), limit: z.number().min(1).max(1000).default(100) }))
    .query(async ({ input }) => {
      const tableName = sanitize(input.tableName);
      // Use queryRawUnsafe to select from dynamic table name
      const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM ${tableName} LIMIT ${input.limit}`);
      const countResult = await prisma.$queryRawUnsafe<TableCount[]>(`SELECT COUNT(*) as count FROM ${tableName}`);
      
      // Handle BigInt serialization
      const serializedRows = JSON.parse(JSON.stringify(rows, (_, v) => typeof v === 'bigint' ? v.toString() : v)) as Record<string, unknown>[];
      const rowCount = Number(countResult[0]?.count || 0);

      return { rows: serializedRows, rowCount };
    }),

  // 7.5. Export Table Data (Dump)
  exportTable: publicProcedure
    .input(z.object({ tableName: z.string() }))
    .mutation(async ({ input }) => {
      const tableName = sanitize(input.tableName);
      // Limit to 10k rows for now to prevent OOM on large tables
      const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM ${tableName} LIMIT 10000`);
      
      // Handle BigInt serialization
      const serializedRows = JSON.parse(JSON.stringify(rows, (_, v) => typeof v === 'bigint' ? v.toString() : v)) as Record<string, unknown>[];
      
      return serializedRows;
    }),

  // 8. Import JSON to Table
  importJsonToTable: publicProcedure
    .input(z.object({ 
      tableName: z.string(), 
      jsonString: z.string(),
      options: z.object({
        allowReserved: z.boolean().default(false),
        preserveIds: z.boolean().default(false),
        upsertOnConflict: z.boolean().default(false),
        useStrictSchema: z.boolean().default(false),
        auditReason: z.string().optional()
      }).optional()
    }))
    .mutation(async ({ input }) => {
      const { tableName, jsonString, options } = input;
      const safeTableName = sanitize(tableName);
      
      // Basic reserved table check
      const reservedTables = ['User', 'Account', 'Session', 'Role', 'Permission']; 
      if (reservedTables.includes(tableName) && !options?.allowReserved) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Refusing to import into reserved table "${tableName}" without explicit verification.`
        });
      }

      let data: Record<string, unknown>[];
      try {
        const parsed = JSON.parse(jsonString) as unknown;
        if (!Array.isArray(parsed)) {
            if (typeof parsed === 'object' && parsed !== null) {
              data = [parsed as Record<string, unknown>];
            } else {
              throw new Error('Root must be array or object');
            }
        } else {
          data = parsed as Record<string, unknown>[];
        }
      } catch {
        throw new TRPCError({
          code: 'BAD_REQUEST', 
          message: 'Invalid JSON format'
        });
      }

      if (data.length === 0) return { success: true, rowCount: 0, tableName };

      // Simplified insert logic
      let insertedCount = 0;
      
      for (const row of data) {
         const keys = Object.keys(row).filter(k => k !== 'id' || options?.preserveIds);
         if (options?.preserveIds && row.id) {
            // Already included in keys if check passed, but double check not to duplicate
            if (!keys.includes('id')) keys.push('id');
         }
         
         if (keys.length === 0) continue;

         const cols = keys.map(k => `"${k}"`).join(', ');
         
         const vals = keys.map(k => {
             const v = row[k];
             if (v === null) return 'NULL';
             if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`; 
             if (typeof v === 'object') return `'${JSON.stringify(v)}'`;
             if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
             if (typeof v === 'number') return v;
             return 'NULL';
         }).join(', ');

         const query = `INSERT INTO ${safeTableName} (${cols}) VALUES (${vals}) ${
             options?.upsertOnConflict && row.id ? 
             `ON CONFLICT (id) DO UPDATE SET ${keys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')}` : 
             ''
         }`;

         await prisma.$executeRawUnsafe(query);
         insertedCount++;
      }

      return { success: true, rowCount: insertedCount, tableName };
    }),

  // 9. Create Table From JSON (Inference)
  createTableFromJson: publicProcedure
    .input(z.object({ 
      tableName: z.string(), 
      jsonString: z.string()
    }))
    .mutation(async ({ input }) => {
      const { tableName, jsonString } = input;
      const safeTableName = sanitize(tableName);

      // 1. Parse Data
      let data: Record<string, unknown>[];
      try {
        const parsed = JSON.parse(jsonString) as unknown;
        if (!Array.isArray(parsed)) {
            if (typeof parsed === 'object' && parsed !== null) {
              data = [parsed as Record<string, unknown>]; 
            } else {
              throw new Error('Root must be array or object');
            }
        } else {
          data = parsed as Record<string, unknown>[];
        }
      } catch {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid JSON' });
      }

      if (data.length === 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Empty JSON array' });

      // Check if table exists
      try {
        const existing = await prisma.$queryRawUnsafe<ToRegClass[]>(`SELECT to_regclass('${safeTableName}') as reg;`);
        if (existing[0]?.reg) {
             throw new TRPCError({ code: 'CONFLICT', message: `Table "${tableName}" already exists. Please delete it or rename your file.` });
        }
      } catch (e) {
        if (e instanceof TRPCError) throw e;
        // Ignore other errors here, proceed to create try
      }

      try {
          // 2. Infer Schema from First Row (Simple Strategy)
          const firstRow = data[0];
          const columnsToCreate: { name: string, type: string }[] = [];
          const standardCols = ['id', 'createdAt', 'updatedAt'];

          for (const [key, value] of Object.entries(firstRow)) {
              if (standardCols.includes(key)) continue; 
              
              let type = 'TEXT';
              if (typeof value === 'boolean') type = 'BOOLEAN';
              else if (typeof value === 'number') {
                 type = Number.isInteger(value) ? 'INTEGER' : 'DOUBLE PRECISION';
              } else if (typeof value === 'object' && value !== null) {
                 type = 'JSONB';
              }
              columnsToCreate.push({ name: key, type });
          }

          // 3. Create Shell Table
          await prisma.$executeRawUnsafe(`
            CREATE TABLE ${safeTableName} (
              "id" TEXT PRIMARY KEY,
              "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
          `);

          // 4. Add Inferred Columns
          for (const col of columnsToCreate) {
              const safeCol = sanitize(col.name);
              await prisma.$executeRawUnsafe(`ALTER TABLE ${safeTableName} ADD COLUMN IF NOT EXISTS ${safeCol} ${col.type};`);
          }

          // 5. Insert Data
          let insertedCount = 0;
          for (const row of data) {
             if (!row.id) row.id = Math.random().toString(36).substring(2, 15);
             
             const keys = Object.keys(row);
             if (keys.length === 0) continue;

             const cols = keys.map(k => `"${k}"`).join(', ');
             const vals = keys.map(k => {
                 const v = row[k];
                 if (v === null) return 'NULL';
                 if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`; 
                 if (typeof v === 'object') return `'${JSON.stringify(v)}'`;
                 if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
                 if (typeof v === 'number') return v;
                 return 'NULL';
             }).join(', ');

             await prisma.$executeRawUnsafe(`INSERT INTO ${safeTableName} (${cols}) VALUES (${vals});`);
             insertedCount++;
          }

          return { success: true, tableName, rowCount: insertedCount };

      } catch (e: unknown) {
          console.error("Create Table Failed:", e);
          const msg = e instanceof Error ? e.message : 'Failed to create table from JSON';
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: msg
          });
      }
    })
});
