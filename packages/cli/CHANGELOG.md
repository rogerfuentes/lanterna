# @lanternajs/cli

## 0.0.4

### Patch Changes

- 3e4f972: Fix iOS metrics collection on physical devices by using `xcrun devicectl` for process discovery and memory measurement instead of host-only `pgrep` and `top` commands
- ae4f809: Add PID retry polling (up to 5s) so measure command waits for apps that are still launching instead of failing immediately
- Updated dependencies [3e4f972]
- Updated dependencies [ae4f809]
  - @lanternajs/ios@0.0.4
  - @lanternajs/android@0.0.4

## 0.0.3

### Patch Changes

- 6d3cc6a: fix: resolve workspace:\* dependencies to real versions before npm publish
- Updated dependencies [6d3cc6a]
  - @lanternajs/core@0.0.3
  - @lanternajs/android@0.0.3
  - @lanternajs/ios@0.0.3
  - @lanternajs/report@0.0.3

## 0.0.2

### Patch Changes

- 2efc597: Add CI workflows, npm publish infrastructure, package READMEs, and rename to @lanternajs scope
- Updated dependencies [2efc597]
  - @lanternajs/core@0.0.2
  - @lanternajs/android@0.0.2
  - @lanternajs/ios@0.0.2
  - @lanternajs/report@0.0.2
