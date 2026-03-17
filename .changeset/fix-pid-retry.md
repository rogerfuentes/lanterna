---
"@lanternajs/android": patch
"@lanternajs/ios": patch
"@lanternajs/cli": patch
---

Add PID retry polling (up to 5s) so measure command waits for apps that are still launching instead of failing immediately
