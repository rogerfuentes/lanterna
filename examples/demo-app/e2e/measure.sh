#!/bin/bash
set -e

# E2E: Tier 1 measurement — run lanterna measure and verify output.
# Expects: the demo app is running on a simulator/emulator.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
TMP_DIR="$(mktemp -d)"
OUTPUT_FILE="$TMP_DIR/measure-output.json"

echo "=== E2E: lanterna measure ==="
echo "Output: $OUTPUT_FILE"

# Run measurement for 10 seconds
lanterna measure com.lanterna.demo \
  --platform ios \
  --duration 10 \
  --output "$OUTPUT_FILE"

# Verify the output file exists and is valid JSON
if [ ! -f "$OUTPUT_FILE" ]; then
  echo "FAIL: Output file not created"
  exit 1
fi

# Verify JSON is valid
if ! python3 -c "import json; json.load(open('$OUTPUT_FILE'))"; then
  echo "FAIL: Output is not valid JSON"
  exit 1
fi

# Extract the overall score and verify it's in the expected range (30-90)
SCORE=$(python3 -c "
import json
data = json.load(open('$OUTPUT_FILE'))
print(data.get('score', {}).get('overall', -1))
")

echo "Overall score: $SCORE"

if python3 -c "
score = $SCORE
assert 30 <= score <= 90, f'Score {score} is outside expected range 30-90'
print('Score is within expected range')
"; then
  echo "PASS: measure"
else
  echo "FAIL: Score $SCORE is outside expected range 30-90"
  exit 1
fi

# Verify that per-metric scores exist
python3 -c "
import json
data = json.load(open('$OUTPUT_FILE'))
metrics = data.get('score', {}).get('perMetric', [])
assert len(metrics) > 0, 'No per-metric scores found'
metric_types = [m['type'] for m in metrics]
print(f'Metrics found: {metric_types}')
"

echo "PASS: measure"
rm -rf "$TMP_DIR"
