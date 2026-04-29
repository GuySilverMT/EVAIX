#!/bin/bash

# A more robust script to stop development servers.

# --- Configuration ---
PORTS_TO_STOP=(4000 5173) # API port and UI port

# --- Main Logic ---
echo "Attempting to stop processes on ports: ${PORTS_TO_STOP[*]}"
echo "-------------------------------------------------"

STOPPED_SOMETHING=false

for port in "${PORTS_TO_STOP[@]}"; do
  echo "Checking port $port..."
  # Use fuser to find and kill the process on the port. The -k flag sends SIGKILL.
  # fuser exits with 0 if it finds and kills a process.
  if fuser -k -n tcp "$port" &>/dev/null; then
    STOPPED_SOMETHING=true
    echo "  - Process on port $port terminated."
    sleep 1 # Give a moment for the OS to release the port
  else
    echo "  - No process found on this port."
  fi
done

echo "-------------------------------------------------"
if [ "$STOPPED_SOMETHING" = false ]; then
  echo "All specified ports were already free."
fi
echo "Stop script finished."