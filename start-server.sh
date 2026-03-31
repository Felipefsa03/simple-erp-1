#!/bin/bash
# LuminaFlow Server Startup Script
# Auto-restart on crash

SERVER_CMD="node backend/server.mjs"
MAX_RESTARTS=10
RESTART_COUNT=0
RESTART_DELAY=3000

echo "Starting LuminaFlow Server..."
echo "============================="

while [ $RESTART_COUNT -lt $MAX_RESTARTS ]; do
    echo "[Server] Starting (attempt $((RESTART_COUNT + 1))/$MAX_RESTARTS)..."
    
    # Run the server
    $SERVER_CMD
    
    # Check exit code
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo "[Server] Clean exit. Stopping auto-restart."
        break
    fi
    
    RESTART_COUNT=$((RESTART_COUNT + 1))
    
    if [ $RESTART_COUNT -lt $MAX_RESTARTS ]; then
        echo "[Server] Crash detected (exit code: $EXIT_CODE). Restarting in ${RESTART_DELAY}ms..."
        sleep $(echo "scale=3; $RESTART_DELAY/1000" | bc)
    else
        echo "[Server] Max restarts reached. Stopping."
    fi
done

echo "Server stopped."
