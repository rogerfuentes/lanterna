#!/bin/bash
set -e

# E2E: Maestro-driven profiling — run lanterna test with a Maestro flow.
# Requires: Maestro CLI installed, app running on simulator.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TMP_DIR="$(mktemp -d)"
OUTPUT_FILE="$TMP_DIR/maestro-output.json"

echo "=== E2E: lanterna test --maestro ==="

# Run Maestro-driven test with the full navigation flow
lanterna test \
  --maestro "$SCRIPT_DIR/flows/full-navigation.yaml" \
  --platform ios \
  --duration 30 \
  --output "$OUTPUT_FILE"

if [ ! -f "$OUTPUT_FILE" ]; then
  echo "FAIL: Maestro test output not created"
  exit 1
fi

# Verify valid JSON
python3 -c "import json; json.load(open('$OUTPUT_FILE'))"

# Verify score exists
python3 -c "
import json
data = json.load(open('$OUTPUT_FILE'))
score = data.get('score', {}).get('overall', -1)
assert score > 0, f'Invalid score: {score}'
print(f'Maestro test score: {score}')
"

echo "PASS: maestro"
rm -rf "$TMP_DIR"
