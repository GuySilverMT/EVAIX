# Shell Scripts Audit - Root Directory

## Current Shell Scripts (7 total)

### ✅ KEEP - Active Development Tools

**start-ui.sh**
- **Purpose:** Start UI dev server
- **Usage:** `./start-ui.sh`
- **Status:** ✅ Keep - Active dev tool

**stop-dev.sh**
- **Purpose:** Stop API + UI servers (ports 4000, 5173)
- **Usage:** `./stop-dev.sh`
- **Status:** ✅ Keep - Active dev tool

**cleanup.sh**
- **Purpose:** Remove build logs and artifacts
- **Usage:** `./cleanup.sh`
- **Status:** ✅ Keep - Useful utility

**start-voice-input.sh**
- **Purpose:** Launch voice-to-text system
- **Usage:** `./start-voice-input.sh`
- **Status:** ✅ Keep - Active feature

---

### ⚠️ ARCHIVE/REVIEW - One-Time or Obsolete

**fix_git.sh**
- **Purpose:** Remove secrets from git history (token.json, antigravity.ts)
- **Status:** ⚠️ One-time fix, likely already done
- **Action:** Archive (already executed)

**test-anti-corruption.sh**
- **Purpose:** Test Anti-Corruption Pipeline implementation
- **Status:** ⚠️ One-time verification script
- **Action:** Archive (tests completed, system working)

**test_script.sh**
- **Purpose:** Test podman/podman-compose
- **Status:** ⚠️ Generic test, unclear if needed
- **Action:** Archive (appears to be one-time test)

---

## Cleanup Actions

### Scripts to Archive
```bash
mkdir -p scripts/archive/shell-tests
mv fix_git.sh scripts/archive/shell-tests/
mv test-anti-corruption.sh scripts/archive/shell-tests/
mv test_script.sh scripts/archive/shell-tests/
```

### Scripts to Keep (4)
- start-ui.sh
- stop-dev.sh  
- cleanup.sh
- start-voice-input.sh

---

## Recommendation

**KEEP (4 scripts):**
All are active development tools used regularly.

**ARCHIVE (3 scripts):**
- `fix_git.sh` - Git cleanup (one-time, likely done)
- `test-anti-corruption.sh` - Pipeline test (verified working)
- `test_script.sh` - Generic podman test

---

## Notes

**fix_git.sh Details:**
- Removes `token.json` and `antigravity.ts` from git
- Both files now in `.gitignore`
- `antigravity.ts` already archived in Phase 2 cleanup
- Script no longer needed

**test-anti-corruption.sh Details:**
- Tests UnifiedIngestionService implementation
- Anti-Corruption Pipeline confirmed working
- Surveyor service active and documented
- Test can be archived

**test_script.sh Details:**
- Simple podman check
- Appears to be troubleshooting script
- Can be removed or archived
