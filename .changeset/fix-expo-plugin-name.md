---
"@lanternajs/expo-devtools-plugin": patch
---

Fix Expo DevTools plugin name in webui-dist after package rename

The webui-dist files still referenced the old `lanterna-expo-devtools-plugin`
name, preventing the browser panel from connecting to the app.
