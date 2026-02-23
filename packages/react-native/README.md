# @lanternajs/react-native

React Native in-app performance module for [Lanterna](https://github.com/rogerfuentes/lanterna) — a CLI-first performance profiler for React Native and Expo apps.

## Installation

```bash
npm install @lanternajs/react-native
```

## Usage

Wrap your app root with `<LanternaProvider>` for zero-config performance profiling:

```tsx
import { LanternaProvider } from "@lanternajs/react-native";

export default function App() {
  return (
    <LanternaProvider>
      <Stack />
    </LanternaProvider>
  );
}
```

## What's included

- **FPS tracking**: Real-time UI frame rate via native CADisplayLink (iOS) / Choreographer (Android)
- **Memory monitoring**: Periodic memory usage snapshots
- **Navigation tracking**: Auto-detects Expo Router, or pass your own `navigationRef`
- **Network interception**: Track request count, duration, and active connections
- **Bridge/JSI tracking**: Monitor native-JS bridge call frequency
- **Hermes profiling**: CPU profile sampling via Hermes runtime
- **WebSocket streaming**: Stream metrics to `lanterna monitor` CLI in real-time
- **Expo DevTools Plugin**: Integration with Expo DevTools browser panel

## Requirements

- React Native >= 0.73.0
- React >= 18.0.0

## License

Apache-2.0 — see [LICENSE](https://github.com/rogerfuentes/lanterna/blob/main/LICENSE)
