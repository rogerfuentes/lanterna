#!/bin/bash
set -e

# E2E: Baseline comparison — run twice, second time with --baseline.
# Verifies that comparison output is generated correctly.

TMP_DIR="$(mktemp -d)"
FIRST_RUN="$TMP_DIR/first-run.json"
SECOND_RUN="$TMP_DIR/second-run.json"

echo "=== E2E: baseline comparison ==="

# First run — establish baseline
echo "First run (baseline)..."
lanterna measure com.lanterna.demo \
  --platform ios \
  --duration 10 \
  --output "$FIRST_RUN"

if [ ! -f "$FIRST_RUN" ]; then
  echo "FAIL: First run output not created"
  exit 1
fi

echo "First run complete."

# Second run — compare against baseline
echo "Second run (comparison)..."
lanterna measure com.lanterna.demo \
  --platform ios \
  --duration 10 \
  --baseline "$FIRST_RUN" \
  --output "$SECOND_RUN"

if [ ! -f "$SECOND_RUN" ]; then
  echo "FAIL: Second run output not created"
  exit 1
fi

# Verify the comparison data exists in the output
python3 -c "
import json
data = json.load(open('$SECOND_RUN'))
comparison = data.get('comparison')
assert comparison is not None, 'No comparison data in second run output'
print(f'Comparison data found: {list(comparison.keys())}')
overall_delta = comparison.get('overallDelta', None)
assert overall_delta is not None, 'No overallDelta in comparison'
print(f'Overall delta: {overall_delta}')
"

echo "PASS: baseline comparison"
rm -rf "$TMP_DIR"
