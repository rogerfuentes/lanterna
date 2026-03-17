---
"@lanternajs/ios": patch
"@lanternajs/cli": patch
---

Fix iOS metrics collection on physical devices by using `xcrun devicectl` for process discovery and memory measurement instead of host-only `pgrep` and `top` commands
