# @lanternajs/expo-devtools-plugin

Expo DevTools plugin for [Lanterna](https://github.com/rogerfuentes/lanterna) — a CLI-first performance profiler for React Native and Expo apps.

## Installation

```bash
npm install @lanternajs/expo-devtools-plugin
```

## Usage

This plugin is automatically activated when using `<LanternaProvider>` from `@lanternajs/react-native` in an Expo app. It streams live performance metrics to the Expo DevTools browser panel.

No additional configuration required — just wrap your app with `LanternaProvider` and open Expo DevTools.

## What's included

- **Live metrics dashboard**: FPS, memory, CPU in the Expo DevTools browser panel
- **Screen-level metrics**: Per-screen render times, TTID, time-on-screen
- **Network summary**: Active requests, total count, average duration
- **Bridge stats**: Calls per second, top modules

## Requirements

- Expo >= 50.0.0
- `@lanternajs/react-native` installed and configured

## License

Apache-2.0 — see [LICENSE](https://github.com/rogerfuentes/lanterna/blob/main/LICENSE)
