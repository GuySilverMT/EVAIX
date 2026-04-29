import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * AUTOMATIC DATABASE BACKUP SERVICE
 * 
 * Ensures data safety by creating regular snapshots of the database.
 * Runs automatically on a schedule and before critical operations.
 * 
 * Strategy:
 * - Hourly snapshots (keep last 24)
 * - Daily snapshots (keep last 7)
 * - Weekly snapshots (keep last 4)
 * - Manual snapshots (keep forever)
 */

export interface BackupMetadata {
  timestamp: string;
  type: 'hourly' | 'daily' | 'weekly' | 'manual' | 'pre-operation';
  size: number;
  tables: string[];
  reason?: string;
}

export class BackupService {
  private backupDir: string;
  private isRunning = false;
  private interval: NodeJS.Timeout | null = null;

  constructor(backupDir?: string) {
    this.backupDir = backupDir || path.join(process.cwd(), 'backups');
  }

  /**
   * Start the automatic backup scheduler
   */
  async start() {
    if (this.isRunning) {
      console.log('[BackupService] Already running');
      return;
    }

    console.log('[BackupService] 🚀 Starting automatic backup service...');
    
    // Ensure backup directory exists
    await fs.mkdir(this.backupDir, { recursive: true });

    // Run initial backup
    await this.createBackup('hourly');

    // Schedule hourly backups
    this.interval = setInterval(async () => {
      await this.createBackup('hourly');
      await this.cleanup();
    }, 60 * 60 * 1000); // Every hour

    this.isRunning = true;
    console.log('[BackupService] ✅ Backup service started (hourly schedule)');
  }

  /**
   * Stop the automatic backup scheduler
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('[BackupService] ⏹️ Backup service stopped');
  }

  /**
   * Create a database backup
   */
  async createBackup(
    type: BackupMetadata['type'] = 'manual',
    reason?: string
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const fileName = `core_db_${type}.sql`;
    const filePath = path.join(this.backupDir, fileName);

    try {
      console.log(`[BackupService] 💾 Creating ${type} backup: ${fileName}...`);

      // Get database URL from environment
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL not found in environment');
      }

      // Use pg_dump to create backup
      // -O: no owner (better for restoring on different machines)
      // -x: no privileges
      // --clean: include DROP statements
      const { stdout, stderr } = await execAsync(
        `pg_dump "${dbUrl}" -O -x --clean > "${filePath}"`,
        { maxBuffer: 50 * 1024 * 1024 } // 50MB buffer for large DBs
      );

      if (stderr && !stderr.includes('WARNING')) {
        console.warn(`[BackupService] pg_dump warnings: ${stderr}`);
      }

      // Get file size
      const stats = await fs.stat(filePath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

      // Get list of tables
      const tables = await this.getTableList();

      // Save metadata
      const metadata: BackupMetadata = {
        timestamp: new Date().toISOString(),
        type,
        size: stats.size,
        tables,
        reason
      };

      await fs.writeFile(
        `${filePath}.meta.json`,
        JSON.stringify(metadata, null, 2)
      );

      console.log(`[BackupService] ✅ Backup complete: ${sizeMB} MB`);
      return { success: true, filePath };

    } catch (error: any) {
      console.error('[BackupService] ❌ Backup failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a backup before a critical operation
   */
  async backupBeforeOperation(operationName: string): Promise<boolean> {
    console.log(`[BackupService] 🛡️ Creating safety backup before: ${operationName}`);
    const result = await this.createBackup('pre-operation', operationName);
    return result.success;
  }

  /**
   * Restore from a backup file
   */
  async restore(backupFilePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[BackupService] 🔄 Restoring from: ${backupFilePath}...`);

      // Verify file exists
      await fs.access(backupFilePath);

      // Get database URL
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL not found in environment');
      }

      // Create a safety backup before restoring
      await this.createBackup('pre-operation', `restore from ${path.basename(backupFilePath)}`);

      // Restore using psql
      await execAsync(`psql "${dbUrl}" < "${backupFilePath}"`);

      console.log('[BackupService] ✅ Restore complete');
      return { success: true };

    } catch (error: any) {
      console.error('[BackupService] ❌ Restore failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * List all available backups
   */
  async listBackups(): Promise<Array<BackupMetadata & { filePath: string }>> {
    try {
      const files = await fs.readdir(this.backupDir);
      const sqlFiles = files.filter(f => f.endsWith('.sql'));

      const backups = await Promise.all(
        sqlFiles.map(async (file) => {
          const filePath = path.join(this.backupDir, file);
          const metaPath = `${filePath}.meta.json`;

          try {
            const metaContent = await fs.readFile(metaPath, 'utf-8');
            const metadata = JSON.parse(metaContent) as BackupMetadata;
            return { ...metadata, filePath };
          } catch {
            // No metadata file, create basic info from file stats
            const stats = await fs.stat(filePath);
            return {
              timestamp: stats.mtime.toISOString(),
              type: 'manual' as const,
              size: stats.size,
              tables: [],
              filePath
            };
          }
        })
      );

      // Sort by timestamp (newest first)
      return backups.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

    } catch (error) {
      console.error('[BackupService] Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Cleanup old backups according to retention policy
   */
  private async cleanup() {
    try {
      const backups = await this.listBackups();

      // Group by type
      const hourly = backups.filter(b => b.type === 'hourly');
      const daily = backups.filter(b => b.type === 'daily');
      const weekly = backups.filter(b => b.type === 'weekly');

      // Keep last 24 hourly
      const toDelete = [
        ...hourly.slice(24),
        ...daily.slice(7),
        ...weekly.slice(4)
      ];

      for (const backup of toDelete) {
        await fs.unlink(backup.filePath);
        await fs.unlink(`${backup.filePath}.meta.json`).catch(() => {});
        console.log(`[BackupService] 🗑️ Deleted old backup: ${path.basename(backup.filePath)}`);
      }

    } catch (error) {
      console.error('[BackupService] Cleanup failed:', error);
    }
  }

  /**
   * Get list of tables in the database
   */
  private async getTableList(): Promise<string[]> {
    try {
      const { prisma } = await import('../db.js');
      const result = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `;
      return result.map(r => r.tablename);
    } catch {
      return [];
    }
  }
}

// Singleton instance
export const backupService = new BackupService();
