#!/bin/bash

# Configuration
BRANCHES=("main" "ai-context" "debug")
REMOTE="origin"

# Safety check: Ensure we are in a git repo
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "Error: Not a git repository."
  exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "Current branch: $CURRENT_BRANCH"
echo "Branches to sync: ${BRANCHES[*]}"

# Check for uncommitted changes
STASHED=false
if ! git diff-index --quiet HEAD --; then
  echo "Warning: You have uncommitted changes. Stashing them..."
  git stash save "Auto-stash before branch sync (sync-branches.sh)"
  STASHED=true
fi

for TARGET in "${BRANCHES[@]}"; do
  if [ "$TARGET" == "$CURRENT_BRANCH" ]; then
    continue
  fi

  echo ""
  echo "-----------------------------------------------"
  echo "Syncing $CURRENT_BRANCH -> $TARGET"
  echo "-----------------------------------------------"

  # Checkout target
  if ! git checkout "$TARGET"; then
    echo "Error: Failed to checkout $TARGET. Skipping..."
    continue
  fi

  # Pull latest from remote to avoid drift
  echo "Pulling latest $TARGET from $REMOTE..."
  git pull "$REMOTE" "$TARGET" --rebase

  # Merge source into target without committing
  echo "Merging $CURRENT_BRANCH into $TARGET..."
  if ! git merge "$CURRENT_BRANCH" --no-commit --no-ff; then
    echo "Conflict detected. Resolving all conflicts in favor of $CURRENT_BRANCH..."
    
    # Get all files with merge conflicts and resolve them using the source branch
    git diff --name-only --diff-filter=U | while read -r file; do
      if git rev-parse --verify "$CURRENT_BRANCH:$file" >/dev/null 2>&1; then
        git checkout --theirs "$file"
        git add "$file"
      else
        git rm -f "$file"
      fi
    done
  fi

  # Explicitly restore .gitignore from target's own HEAD
  echo "Restoring $TARGET version of .gitignore..."
  git checkout HEAD -- .gitignore
  
  # Stage the .gitignore
  git add .gitignore

  # Enforce the target's .gitignore by removing newly merged but restricted files
  echo "Applying .gitignore to strip restricted files..."
  git ls-files -i -c --exclude-standard -z | xargs -0 -r git rm -q

  # Check if the target branch is behind the source branch
  BEHIND=false
  if ! git merge-base --is-ancestor "$CURRENT_BRANCH" HEAD; then
    BEHIND=true
  fi

  # Check if there are changes to commit (file changes OR history divergence)
  if git diff --cached --quiet && [ "$BEHIND" = false ]; then
    echo "No substantive changes and history is already up to date for $TARGET."
  else
    echo "Committing synced changes to $TARGET (incorporating history)..."
    # We use --allow-empty in case file content is identical but we want to mark the merge
    git commit --allow-empty -m "Sync: [Agent Update] from $CURRENT_BRANCH (preserving .gitignore)"
    
    echo "Pushing $TARGET to $REMOTE..."
    if ! git push "$REMOTE" "$TARGET"; then
       echo "Error: Failed to push $TARGET. You may need to resolve this manually."
    fi
  fi
done

# Return to source branch
echo ""
echo "-----------------------------------------------"
echo "Returning to $CURRENT_BRANCH..."
git checkout "$CURRENT_BRANCH"

if [ "$STASHED" = true ]; then
  echo "Restoring stashed changes..."
  git stash pop
fi

echo "Branch synchronization complete!"
