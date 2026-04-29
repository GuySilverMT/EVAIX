#!/bin/bash

# Remove API logs
rm -f apps/api/final_build_errors*.txt
rm -f apps/api/build_errors_api.txt
rm -f apps/api/build_log*.txt

# Remove UI logs
rm -f apps/ui/build_log*.txt

# Remove Package logs
rm -f packages/coc/build_errors*.txt

# Remove Root logs
rm -f full_build_log*.txt
rm -f git_log.txt
rm -f dead_code_*.md
rm -f knip-analysis*.txt
rm -f knip-output.txt
rm -f knip-report.json
rm -f diagnostic_report.json

# Optional: Remove turbo logs (safe to delete, they regenerate)
find . -name "turbo-*.log" -type f -delete

echo "Cleanup complete."
