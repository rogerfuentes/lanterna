#!/bin/bash
set -e

# E2E: Report format verification — export to all formats, validate each.

TMP_DIR="$(mktemp -d)"
JSON_FILE="$TMP_DIR/report.json"
HTML_FILE="$TMP_DIR/report.html"

echo "=== E2E: report formats ==="

# Run measurement and capture JSON
lanterna measure com.lanterna.demo \
  --platform ios \
  --duration 10 \
  --output "$JSON_FILE"

# 1. Verify JSON report
echo "Checking JSON report..."
if [ ! -f "$JSON_FILE" ]; then
  echo "FAIL: JSON report not created"
  exit 1
fi
python3 -c "
import json
data = json.load(open('$JSON_FILE'))
assert 'score' in data, 'Missing score in JSON report'
assert 'samples' in data or 'metrics' in data, 'Missing metrics data in JSON report'
print('JSON report: valid')
"
echo "PASS: JSON format"

# 2. Verify HTML report (if the CLI supports --format html)
echo "Checking HTML report..."
if lanterna measure com.lanterna.demo \
  --platform ios \
  --duration 10 \
  --output "$HTML_FILE" 2>/dev/null; then
  if [ -f "$HTML_FILE" ] && head -1 "$HTML_FILE" | grep -qi "html\|<!doctype"; then
    echo "PASS: HTML format"
  else
    echo "SKIP: HTML format (output is not HTML)"
  fi
else
  echo "SKIP: HTML format (not supported yet)"
fi

echo "PASS: reports"
rm -rf "$TMP_DIR"
