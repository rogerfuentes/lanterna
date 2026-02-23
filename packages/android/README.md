# @lanternajs/android

Android performance data collection via `adb` and Perfetto for [Lanterna](https://github.com/rogerfuentes/lanterna) — a CLI-first performance profiler for React Native and Expo apps.

## Installation

```bash
npm install @lanternajs/android
```

## What's inside

- **Collectors**: Gather FPS, CPU, memory, and frame drop metrics from Android devices
- **Parsers**: Parse output from `dumpsys gfxinfo`, `dumpsys meminfo`, and `top`
- **Process management**: Find and monitor Android app processes via ADB

## Usage

This package is primarily used internally by `@lanternajs/cli`. If you're building custom Android profiling tooling:

```ts
import { collectAndroidMetrics } from "@lanternajs/android";
```

## Requirements

- `adb` available on PATH
- Android device or emulator connected

## License

Apache-2.0 — see [LICENSE](https://github.com/rogerfuentes/lanterna/blob/main/LICENSE)
