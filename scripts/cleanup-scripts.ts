#!/usr/bin/env tsx

/**
 * Script Cleanup Utility
 * 
 * Archives old/one-time scripts and removes redundant ones.
 * Run with --dry-run first to preview changes.
 */

import fs from 'fs/promises';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(color: keyof typeof colors, ...args: unknown[]) {
  console.log(colors[color], ...args, colors.reset);
}

const scriptsToArchive = {
  migrations: [
    'apps/api/scripts/migrate-role-templates.ts',
    'apps/api/scripts/migrate-specs-to-capabilities.ts',
    'apps/api/scripts/fix_failed_migration.ts',
    'apps/api/scripts/verify_migration.ts',
    'apps/api/scripts/restore_from_backup.ts',
    'apps/api/scripts/restore_raw_table.ts',
    'apps/api/scripts/drop_view.ts',
  ],
  cleanup: [
    'apps/api/scripts/deduplicate_models.ts',
    'apps/api/scripts/deduplicate_roles.ts',
    'apps/api/scripts/cleanup_providers.ts',
  ],
  'old-seeds': [
    'apps/api/scripts/seed_chain_of_command.ts',
    'apps/api/scripts/seed_datacenter_helper.ts',
    'apps/api/scripts/seed_org_chart.ts',
    'apps/api/scripts/seed_prompt_engineer.ts',
    'apps/api/scripts/seed_ui_designer.ts',
  ],
  'one-time-fixes': [
    'apps/api/scripts/fix_role_typos.ts',
    'apps/api/scripts/delete_old_ui_role.ts',
    'apps/api/scripts/find-ghost-ui.ts',
  ]
};

const scriptsToDelete = [
  // Root duplicates
  'check_roles.ts',
  'check_duplicates.ts',
  'cleanup_models.ts',
  
  // Model ingestion redundant
  'apps/api/scripts/ingest_models_robust.ts',
  'apps/api/scripts/reingest-all.ts',
  'apps/api/scripts/refresh-models.ts',
  'apps/api/scripts/reset-and-sync.ts',
  
  // Verification redundant
  'apps/api/scripts/verify-ingestion-fix.ts',
  'apps/api/scripts/verify_normalization.ts',
  'apps/api/scripts/verify-specialization.ts',
  'apps/api/scripts/final-check.ts',
  
  // Debug redundant
  'apps/api/scripts/debug-models-json.ts',
  'apps/api/scripts/fetch-groq.ts',
  'apps/api/scripts/smoke-context.ts',
  'apps/api/scripts/smoke-context.js',
  'apps/api/scripts/smoke-context.d.ts',
  'apps/api/scripts/check_resource.js',
  'apps/api/scripts/check_resource.d.ts',
  'apps/api/scripts/check_saved_queries.js',
  'apps/api/scripts/check_saved_queries.d.ts',
  
  // Dangerous/legacy
  'apps/api/scripts/wipe-models.ts',
  'apps/api/scripts/wipe-roles.ts',
  'apps/api/scripts/prune_legacy_roles.ts',
  
  // One-time/done
  'apps/api/scripts/compare-orms.ts',
  'apps/api/scripts/gap-analysis.ts',
  'apps/api/scripts/diagnose-join.ts',
  'apps/api/scripts/demo_role_decoupling.ts',
];

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const cwd = process.cwd();
  
  log('cyan', '\n📦 Script Cleanup Utility\n');
  
  if (dryRun) {
    log('yellow', '⚠️  DRY RUN MODE - No changes will be made\n');
  }
  
  // Phase 1: Archive
  log('cyan', '📁 Phase 1: Archiving historical scripts\n');
  
  let archivedCount = 0;
  let notFoundCount = 0;
  
  for (const [category, scripts] of Object.entries(scriptsToArchive)) {
    const archiveDir = path.join(cwd, 'scripts', 'archive', category);
    
    if (!dryRun) {
      await fs.mkdir(archiveDir, { recursive: true });
    }
    
    log('blue', `\n  ${category}/`);
    
    for (const scriptPath of scripts) {
      const fullPath = path.join(cwd, scriptPath);
      const filename = path.basename(scriptPath);
      const destPath = path.join(archiveDir, filename);
      
      try {
        await fs.access(fullPath);
        
        if (dryRun) {
          log('yellow', `    Would archive: ${filename}`);
        } else {
          await fs.rename(fullPath, destPath);
          log('green', `    ✅ Archived: ${filename}`);
          archivedCount++;
        }
      } catch {
        log('cyan', `    ℹ️  Not found: ${filename}`);
        notFoundCount++;
      }
    }
  }
  
  // Phase 2: Delete redundant
  log('cyan', '\n\n🗑️  Phase 2: Deleting redundant scripts\n');
  
  let deletedCount = 0;
  
  for (const scriptPath of scriptsToDelete) {
    const fullPath = path.join(cwd, scriptPath);
    const filename = path.basename(scriptPath);
    
    try {
      await fs.access(fullPath);
      
      if (dryRun) {
        log('yellow', `  Would delete: ${scriptPath}`);
      } else {
        await fs.unlink(fullPath);
        log('green', `  ✅ Deleted: ${scriptPath}`);
        deletedCount++;
      }
    } catch {
      log('cyan', `  ℹ️  Not found: ${scriptPath}`);
      notFoundCount++;
    }
  }
  
  // Summary
  log('cyan', '\n' + '='.repeat(60));
  log('cyan', '📊 SUMMARY');
  log('cyan', '='.repeat(60));
  
  if (dryRun) {
    const totalArchive = Object.values(scriptsToArchive).flat().length - notFoundCount;
    const totalDelete = scriptsToDelete.length - notFoundCount;
    
    log('yellow', `\nWould archive: ${totalArchive} scripts`);
    log('yellow', `Would delete: ${totalDelete} scripts`);
    log('cyan', '\nRun without --dry-run to execute cleanup');
  } else {
    log('green', `\n✅ Archived: ${archivedCount} scripts`);
    log('green', `✅ Deleted: ${deletedCount} scripts`);
    log('cyan', `ℹ️  Not found: ${notFoundCount} scripts (already removed)`);
  }
  
  log('cyan', '\n📚 Active scripts documented in:');
  log('cyan', '   docs/SCRIPT_AUDIT_CLEANUP.md');
  log('cyan', '   docs/MODEL_INGESTION_SURVEYOR_GUIDE.md');
  log('cyan', '   docs/ROLE_GUIDE.md');
  log('cyan', '   docs/TOOL_MCP_GUIDE.md');
  
  log('cyan', '\n' + '='.repeat(60) + '\n');
}

main().catch(console.error);
