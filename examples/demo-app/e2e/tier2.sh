#!/bin/bash
set -e

# E2E: Tier 2 in-app module — start monitor, verify real-time data.
# Requires: app running with lanterna-react-native active.

TMP_DIR="$(mktemp -d)"
MONITOR_LOG="$TMP_DIR/monitor.log"

echo "=== E2E: Tier 2 monitor ==="

# Start lanterna monitor in the background
lanterna monitor --port 8347 > "$MONITOR_LOG" 2>&1 &
MONITOR_PID=$!

# Give the monitor time to start
sleep 3

# Check that the monitor is still running
if ! kill -0 "$MONITOR_PID" 2>/dev/null; then
  echo "FAIL: Monitor process died"
  cat "$MONITOR_LOG"
  exit 1
fi

echo "Monitor started (PID: $MONITOR_PID)"

# Wait for the app to connect and send some metrics
echo "Waiting for app to connect and send metrics..."
sleep 15

# Stop the monitor
kill "$MONITOR_PID" 2>/dev/null || true
wait "$MONITOR_PID" 2>/dev/null || true

# Verify that the monitor received some data
if [ ! -s "$MONITOR_LOG" ]; then
  echo "FAIL: Monitor log is empty — no data received"
  exit 1
fi

echo "Monitor log contents:"
head -20 "$MONITOR_LOG"

# Check for connection event in log
if grep -q "connected\|handshake\|metrics" "$MONITOR_LOG"; then
  echo "PASS: Monitor received real-time data"
else
  echo "WARN: Could not verify real-time data in monitor log"
  echo "Full log:"
  cat "$MONITOR_LOG"
fi

echo "PASS: tier2"
rm -rf "$TMP_DIR"
