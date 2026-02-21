# Lanterna

> Illuminate your app's performance.

A CLI-first, cross-platform performance profiler for React Native and Expo apps. One command to capture, analyze, and report performance metrics — no Xcode or Android Studio required.

```bash
lanterna measure com.example.app
```

```
╭───────────────────────────────────────╮
│  lanterna v0.0.1                      │
│                                       │
│  Score: 72 / 100  Needs Work          │
│  ██████████████░░░░░░  72%            │
│                                       │
│  Device: Pixel 6 (android, emulator)  │
│  Duration: 10s                        │
├───────────────────────────────────────┤
│  UI FPS         57.3 fps    ████  95  │
│  JS FPS         48.2 fps    ███░  62  │
│  CPU Usage      35.1%       ███░  55  │
│  Memory         245 MB      ███░  78  │
│  Frame Drops    8.2%        ██░░  42  │
│  TTI            1.8s        ████  90  │
╰───────────────────────────────────────╯
```

## Why Lanterna?

- **Cross-platform from day one** — iOS via `xcrun xctrace` + Android via `adb`. Flashlight is Android-only.
- **Zero-config entry point** — Works on any running app, no code changes needed (Tier 1).
- **RN-aware scoring** — Weighted 0-100 score with 11 built-in heuristics that reference specific RN APIs.
- **Per-screen breakdown** — Navigation instrumentation for React Navigation and Expo Router.
- **CI/CD ready** — JSON export, baseline comparison, regression detection, GitHub Action.

## Quick Start

```bash
# Install
bun add -g @lanterna/cli

# Measure a running app
lanterna measure com.example.app

# Custom duration
lanterna measure com.example.app --duration 15

# Export JSON for CI
lanterna measure com.example.app --output report.json

# Compare against baseline
lanterna measure com.example.app --baseline previous.json
```

### Prerequisites

- **iOS**: macOS with Xcode Command Line Tools (`xcode-select --install`)
- **Android**: Android SDK with ADB in your PATH
- **Runtime**: [Bun](https://bun.sh) v1.0+

## Commands

### `lanterna measure <package>`

Detect device, collect metrics, score, and report.

```bash
lanterna measure com.example.app
lanterna measure com.example.app --duration 30
lanterna measure com.example.app --platform ios
lanterna measure com.example.app --device emulator-5554
lanterna measure com.example.app --output report.json
lanterna measure com.example.app --baseline previous.json
```

| Option | Description |
|--------|-------------|
| `--duration <s>` | Measurement duration (default: 10) |
| `--platform <ios\|android>` | Force platform (auto-detect if omitted) |
| `--device <id>` | Target device ID (auto-select if omitted) |
| `--output <path>` | Export JSON report |
| `--baseline <path>` | Compare against previous run |

### `lanterna test --maestro <flow.yaml>`

Profile during Maestro E2E test flows. Runs metric collection in parallel with your flow.

```bash
lanterna test --maestro flows/login.yaml
lanterna test --maestro flows/checkout.yaml --output report.json
lanterna test --maestro flows/checkout.yaml --duration 30 --platform android
```

### `lanterna monitor`

Live performance dashboard via WebSocket. Connects to apps instrumented with `lanterna-react-native`.

```bash
lanterna monitor
lanterna monitor --port 9000
```

```
╭─────────────────────────────────────────────╮
│  lanterna monitor                            │
│  Port: 8347  Status: ● running               │
├─────────────────────────────────────────────┤
│  com.example.myapp                           │
│  Pixel 6 (android)                           │
│  📍 ProfileScreen                             │
│  UI FPS: 58.2  Drops: 3                      │
│  JS FPS: 55.1                                │
│  CPU: 28.3%                                  │
│  Memory: 245 MB                              │
╰─────────────────────────────────────────────╯
```

## Scoring Model

Weighted 0-100 score inspired by Lighthouse.

| Metric | Weight | Good | Needs Work | Poor |
|--------|--------|------|------------|------|
| UI Thread FPS | 25% | >= 57 | 45-57 | < 45 |
| JS Thread FPS | 20% | >= 57 | 45-57 | < 45 |
| CPU Usage | 15% | < 30% | 30-60% | > 60% |
| Memory (peak) | 15% | < 300MB | 300-500MB | > 500MB |
| Frame Drop Rate | 15% | < 5% | 5-15% | > 15% |
| TTI | 10% | < 2s | 2-4s | > 4s |

### Heuristics

Lanterna includes 11 built-in heuristics that produce actionable, RN-specific recommendations:

- Low UI/JS FPS detection with `React.memo`, `useMemo`, `getItemLayout` suggestions
- High CPU with Hermes profiler recommendations
- Memory pressure with `removeClippedSubviews`, image optimization tips
- Excessive frame drops with `react-native-reanimated` worklet suggestions
- Slow TTI with `React.lazy`, code splitting, Hermes recommendations
- JS-UI thread correlation analysis
- Slow screen TTID (> 500ms) detection
- Excessive network requests or slow endpoints
- High bridge/JSI call traffic
- Excessive Yoga layout passes

## Three-Tier Data Collection

### Tier 1: External (zero-config)

No app modifications needed. Works on any running app.

- **Android**: `adb shell top`, `dumpsys meminfo`, `dumpsys gfxinfo`
- **iOS**: `xcrun xctrace record` + `xcrun xctrace export`

### Tier 2: In-App Module

Install `lanterna-react-native` for real-time data.

```bash
npm install lanterna-react-native
```

```typescript
import { LanternaModule } from 'lanterna-react-native';

// Start profiling
await LanternaModule.startProfiling({ fps: true, hermes: true });

// Custom marks
LanternaModule.mark('screen_loaded');

// Stop and get metrics
const session = await LanternaModule.stopProfiling();
```

#### Navigation Instrumentation

Per-screen metrics with React Navigation or Expo Router:

```typescript
import { NavigationTracker, createNavigationHandler } from 'lanterna-react-native';

const tracker = new NavigationTracker();

// React Navigation
<NavigationContainer onStateChange={createNavigationHandler(tracker)}>
  {/* your screens */}
</NavigationContainer>

// Get per-screen breakdown
const timeline = tracker.getTimeline();
// { screens: [{ screenName, ttid, renderDuration, timeOnScreen }], averageTTID, slowestScreen }
```

### Tier 3: Deep Instrumentation

Opt-in features with higher fidelity:

```typescript
await LanternaModule.startProfiling({
  fps: true,
  hermes: true,
  networkWaterfall: true,   // Intercept fetch/XHR timing
  bridgeTracking: true,     // Monitor bridge call frequency
  layoutTracking: true,     // Detect excessive Yoga layout passes
});
```

- **Network waterfall**: URL, method, status, duration, response size per request
- **Bridge/JSI tracking**: Calls per second, top modules, slowest calls
- **Layout tracking**: Components with excessive layout recalculations

All Tier 3 data appears in terminal, HTML, JSON, and markdown reports when present.

## Report Formats

| Format | Command / API | Use case |
|--------|--------------|----------|
| Terminal | `lanterna measure` | Quick dev feedback |
| JSON | `--output report.json` | CI pipelines, scripting |
| HTML | `renderHtmlReport()` | Shareable Lighthouse-style report |
| Markdown | `formatMarkdownReport()` | GitHub PR comments |
| Perfetto | `exportPerfetto()` | Deep trace analysis in ui.perfetto.dev |
| SpeedScope | `exportSpeedScope()` | JS profiling in speedscope.app |

## CI/CD Integration

### GitHub Action

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
          score-threshold: '60'
```

The action posts a formatted comment on your PR with the score, metrics, and comparison against the baseline.

### Expo Dev Tools Plugin

For Expo projects, install the dev tools plugin for a browser-based dashboard:

```bash
npx expo install lanterna-expo-devtools-plugin
```

```typescript
import { useLanternaDevTools } from 'lanterna-expo-devtools-plugin';

export default function App() {
  useLanternaDevTools(); // auto-connects to Expo dev server
  // ...
}
```

Press Shift+M in Expo CLI to open the Lanterna dashboard with live FPS graphs, CPU/memory charts, and navigation timeline.

## Packages

| Package | Description |
|---------|-------------|
| `@lanterna/cli` | Main CLI entry point |
| `@lanterna/core` | Scoring engine, types, device detection, heuristics |
| `@lanterna/android` | ADB-based data collection |
| `@lanterna/ios` | xctrace-based data collection |
| `@lanterna/report` | Terminal, HTML, JSON, Markdown, Perfetto, SpeedScope output |
| `lanterna-react-native` | In-app Turbo Module for Tier 2/3 data |
| `lanterna-expo-devtools-plugin` | Expo Dev Tools Plugin with browser dashboard |

## Development

```bash
bun install
bun test              # Run all tests (529 tests)
bun run typecheck     # TypeScript type checking
bun run lint          # Biome lint + format check
bun run lint:fix      # Auto-fix lint/format issues
bun run format        # Format all files
```

## License

MIT

## Acknowledgments

Inspired by [Lighthouse](https://github.com/nickarora/lighthouse) and [Flashlight](https://github.com/bamlab/flashlight). Built with [Bun](https://bun.sh), [TypeScript](https://www.typescriptlang.org/), and [Biome](https://biomejs.dev/).
