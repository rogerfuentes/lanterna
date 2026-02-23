#!/bin/bash

# E2E orchestrator — runs all E2E tests in sequence, reports pass/fail summary.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PASS=0
FAIL=0
SKIP=0
RESULTS=()

run_test() {
  local name="$1"
  local script="$2"

  echo ""
  echo "========================================"
  echo "  Running: $name"
  echo "========================================"

  if [ ! -f "$script" ]; then
    echo "SKIP: $script not found"
    SKIP=$((SKIP + 1))
    RESULTS+=("SKIP  $name")
    return
  fi

  if bash "$script"; then
    PASS=$((PASS + 1))
    RESULTS+=("PASS  $name")
  else
    FAIL=$((FAIL + 1))
    RESULTS+=("FAIL  $name")
  fi
}

echo "========================================"
echo "  Lanterna Demo App — E2E Test Suite"
echo "========================================"

run_test "Tier 1 Measure"     "$SCRIPT_DIR/measure.sh"
run_test "Baseline Comparison" "$SCRIPT_DIR/baseline.sh"
run_test "Maestro Flows"       "$SCRIPT_DIR/maestro.sh"
run_test "Tier 2 Monitor"      "$SCRIPT_DIR/tier2.sh"
run_test "Report Formats"      "$SCRIPT_DIR/reports.sh"

echo ""
echo "========================================"
echo "  Summary"
echo "========================================"
for r in "${RESULTS[@]}"; do
  echo "  $r"
done
echo ""
echo "  Passed: $PASS | Failed: $FAIL | Skipped: $SKIP"
echo "========================================"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
