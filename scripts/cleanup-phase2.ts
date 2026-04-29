#!/usr/bin/env tsx

/**
 * Final Script Cleanup - Phase 2
 * 
 * Removes obsolete scripts that reference deprecated services
 * and documents remaining active scripts.
 */

import fs from 'fs/promises';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(color: keyof typeof colors, ...args: unknown[]) {
  console.log(colors[color], ...args, colors.reset);
}

// Scripts using deprecated ModelDoctor (replaced by Surveyor)
const obsoleteModelDoctorScripts = [
  'apps/api/scripts/audit_doctor.ts',
  'apps/api/scripts/force_heal.ts',
];

// Experimental/Test scripts (not production)
const experimentalScripts = [
  'apps/api/scripts/antigravity.ts',  // Gemini 3 experiment
  'scripts/test-healer-protocol.ts',   // Test script
  'scripts/verify-agent-fixes.ts',     // Verification script
  'scripts/verify-hybrid-role-creation.ts',  // Test script
  'scripts/seed-coordinator.ts',       // One-time seed
];

// Keep these - they're production tools
const productionScripts = [
  'scripts/sync-all.ts',               // Full system sync
  'scripts/env-loader.ts',             // Utility
  'scripts/cleanup-scripts.ts',        // This script
  'scripts/generate_mcp_manifests.ts', // MCP docs
  'scripts/generate_native_docs.ts',   // Tool docs
  'scripts/run-aqa-audit.ts',          // Tool audit
];

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const cwd = process.cwd();
  
  log('cyan', '\n🧹 Final Script Cleanup - Phase 2\n');
  
  if (dryRun) {
    log('yellow', '⚠️  DRY RUN MODE\n');
  }
  
  let deletedCount = 0;
  let archivedCount = 0;
  
  // Delete obsolete ModelDoctor scripts
  log('red', '🗑️  Removing obsolete ModelDoctor scripts:\n');
  for (const scriptPath of obsoleteModelDoctorScripts) {
    const fullPath = path.join(cwd, scriptPath);
    const filename = path.basename(scriptPath);
    
    try {
      await fs.access(fullPath);
      
      if (dryRun) {
        log('yellow', `  Would delete: ${filename} (uses deprecated ModelDoctor)`);
      } else {
        await fs.unlink(fullPath);
        log('green', `  ✅ Deleted: ${filename}`);
        deletedCount++;
      }
    } catch {
      log('cyan', `  ℹ️  Not found: ${filename}`);
    }
  }
  
  // Archive experimental scripts
log('blue', '\n📦 Archiving experimental/test scripts:\n');
  const archiveDir = path.join(cwd, 'scripts', 'archive', 'experimental');
  
  if (!dryRun) {
    await fs.mkdir(archiveDir, { recursive: true });
  }
  
  for (const scriptPath of experimentalScripts) {
    const fullPath = path.join(cwd, scriptPath);
    const filename = path.basename(scriptPath);
    const destPath = path.join(archiveDir, filename);
    
    try {
      await fs.access(fullPath);
      
      if (dryRun) {
        log('yellow', `  Would archive: ${filename}`);
      } else {
        await fs.rename(fullPath, destPath);
        log('green', `  ✅ Archived: ${filename}`);
        archivedCount++;
      }
    } catch {
      log('cyan', `  ℹ️  Not found: ${filename}`);
    }
  }
  
  // Show production scripts
  log('green', '\n\n✅ Production Scripts (keeping):\n');
  for (const script of productionScripts) {
    log('green', `  • ${script}`);
  }
  
  // Summary
  log('cyan', '\n' + '='.repeat(60));
  
  if (dryRun) {
    log('yellow', `\nWould delete: ${obsoleteModelDoctorScripts.length} obsolete scripts`);
    log('yellow', `Would archive: ${experimentalScripts.length} experimental scripts`);
    log('cyan', '\nRun without --dry-run to execute');
  } else {
    log('green', `\n✅ Deleted: ${deletedCount} obsolete scripts`);
    log('green', `✅ Archived: ${archivedCount} experimental scripts`);
  }
  
  log('cyan', '\n📚 Reason for removal:');
  log('cyan', '   • audit_doctor, force_heal → Use SURVEYOR now');
  log('cyan', '   • antigravity → Gemini 3 experiment (not prod)');
  log('cyan', '   • test-* scripts → Development only');
  
  log('cyan', '\n✅ Production script: sync-all.ts');
  log('cyan', '   Syncs models + MCP tools in one command');
  
  log('cyan', '\n' + '='.repeat(60) + '\n');
}

main().catch(console.error);
