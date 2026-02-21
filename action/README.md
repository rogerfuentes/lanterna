# Lanterna Performance Check - GitHub Action

A composite GitHub Action that runs Lanterna performance profiling on your React Native app and reports results.

## Usage

```yaml
# .github/workflows/performance.yml
name: Performance Check
on: [pull_request]
jobs:
  lanterna:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: user/lanterna-action@v1
        with:
          package: com.example.app
          duration: '15'
          platform: android
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `package` | Yes | - | App package name / bundle ID |
| `duration` | No | `10` | Measurement duration in seconds |
| `platform` | No | - | Target platform (`ios` or `android`) |
| `baseline-artifact` | No | `lanterna-baseline` | Name of the artifact storing the baseline report |
| `score-threshold` | No | `40` | Minimum score to pass (0-100) |
| `comment` | No | `true` | Post results as PR comment |

## Outputs

| Output | Description |
|--------|-------------|
| `score` | Overall performance score (0-100) |
| `category` | Score category (`good`, `needs_work`, `poor`) |
| `report-path` | Path to the JSON report |

## How it works

1. Installs Bun and `@lanterna/cli` globally
2. Downloads any existing baseline artifact for comparison
3. Runs `lanterna measure` against the specified app package
4. Uploads the report as a baseline artifact for future runs
5. Fails the step if the score is below the configured threshold
