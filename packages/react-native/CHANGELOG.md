# @lanternajs/react-native

## 0.0.4

### Patch Changes

- 6488df2: Add console.warn when WebSocket connection fails after max reconnect attempts with ATS troubleshooting hint
- c39c29c: Implement Expo Router auto-detection for navigation tracking when no navigationRef is provided
- fe56ebc: Fix iOS native module autolinking: add expo-module.config.json, include podspec in published files, and use TurboModuleRegistry.get instead of getEnforcing for graceful degradation
- b57d0de: Add wsHost and wsPort props to LanternaProvider for physical device monitoring

## 0.0.3

### Patch Changes

- 6d3cc6a: fix: resolve workspace:\* dependencies to real versions before npm publish
- Updated dependencies [6d3cc6a]
  - @lanternajs/core@0.0.3

## 0.0.2

### Patch Changes

- 2efc597: Add CI workflows, npm publish infrastructure, package READMEs, and rename to @lanternajs scope
- Updated dependencies [2efc597]
  - @lanternajs/core@0.0.2
