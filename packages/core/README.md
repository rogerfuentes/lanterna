# @lanternajs/core

Scoring engine, types, and metric normalization for [Lanterna](https://github.com/rogerfuentes/lanterna) — a CLI-first performance profiler for React Native and Expo apps.

## Installation

```bash
npm install @lanternajs/core
```

## What's inside

- **Types**: `MetricSample`, `Device`, `ScoreResult`, `Platform`, and all shared interfaces
- **Scoring**: Weighted 0-100 score across FPS, CPU, memory, frame drops, and TTI
- **Thresholds**: Configurable good/needs-work/poor boundaries per metric
- **Comparison**: Baseline diff with regression detection
- **Device detection**: Auto-detect connected iOS simulators and Android emulators
- **Heuristics**: React Native-specific metric analysis

## Usage

This package is primarily used internally by other `@lanternajs/*` packages. If you're building custom tooling on top of Lanterna's scoring engine:

```ts
import { calculateScore, detectDevices, MetricType } from "@lanternajs/core";
```

## License

Apache-2.0 — see [LICENSE](https://github.com/rogerfuentes/lanterna/blob/main/LICENSE)
