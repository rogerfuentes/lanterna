# @lanternajs/cli

CLI entry point for [Lanterna](https://github.com/rogerfuentes/lanterna) — Lighthouse for mobile apps. One command to capture, analyze, and report React Native performance metrics.

## Installation

```bash
npm install -g @lanternajs/cli
```

## Usage

```bash
# Measure a running app
lanterna measure com.example.app

# Measure with options
lanterna measure com.example.app --duration 15 --platform ios --output report.json

# Run a Maestro E2E flow with performance collection
lanterna test --maestro login-flow.yaml

# Compare against a baseline
lanterna measure com.example.app --baseline previous-report.json

# Start live monitoring dashboard
lanterna monitor
```

## Commands

| Command | Description |
|---------|-------------|
| `measure <package>` | Collect performance metrics for a running app |
| `test --maestro <flow>` | Run a Maestro E2E flow and collect metrics |
| `monitor` | Start live monitoring dashboard (WebSocket server) |

## Requirements

- **Android**: `adb` on PATH, device/emulator connected
- **iOS**: macOS with Xcode, simulator running or device connected
- **Maestro** (optional): For E2E test flows

## License

Apache-2.0 — see [LICENSE](https://github.com/rogerfuentes/lanterna/blob/main/LICENSE)
