# @lanternajs/ios

iOS performance data collection via `xcrun xctrace` for [Lanterna](https://github.com/rogerfuentes/lanterna) — a CLI-first performance profiler for React Native and Expo apps.

## Installation

```bash
npm install @lanternajs/ios
```

## What's inside

- **Collectors**: Gather FPS, CPU, memory, and frame drop metrics from iOS simulators and devices
- **Parsers**: Parse xctrace XML export output and memory diagnostics
- **Process management**: Find and monitor iOS app processes
- **Xcode version detection**: Handle differences across Xcode releases

## Usage

This package is primarily used internally by `@lanternajs/cli`. If you're building custom iOS profiling tooling:

```ts
import { collectIosMetrics } from "@lanternajs/ios";
```

## Requirements

- macOS with Xcode installed
- `xcrun xctrace` available on PATH
- iOS Simulator running or physical device connected

## License

Apache-2.0 — see [LICENSE](https://github.com/rogerfuentes/lanterna/blob/main/LICENSE)
