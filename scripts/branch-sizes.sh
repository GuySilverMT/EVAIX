#!/bin/bash

# Ensure the working directory is clean before checking out branches
if ! git diff-index --quiet HEAD --; then
  echo "⚠️  Error: You have uncommitted changes. Please commit or stash them before running this script."
  exit 1
fi

echo "📊 Calculating working tree size for all local branches..."
echo "-------------------------------------------------------"

# Get all local branches
branches=$(git for-each-ref --format='%(refname:short)' refs/heads/)

for branch in $branches; do
  # Checkout the branch quietly
  git checkout -q "$branch" 2>/dev/null
  
  # Calculate the size of ONLY the tracked files in MB (ignoring node_modules, etc.)
  bytes=$(git ls-tree -r -l HEAD | awk '{s+=$4} END {print s}')
  bytes=${bytes:-0}
  size=$((bytes / 1048576))
  
  # Print the result aligned
  printf "Branch: %-30s | Size: %4s MB\n" "$branch" "$size"
done

echo "-------------------------------------------------------"
echo "🔄 Returning to main..."
git checkout -q main