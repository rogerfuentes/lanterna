# @lanternajs/report

Terminal and HTML report output for [Lanterna](https://github.com/rogerfuentes/lanterna) — a CLI-first performance profiler for React Native and Expo apps.

## Installation

```bash
npm install @lanternajs/report
```

## What's inside

- **Terminal output**: Colored, formatted performance reports in the terminal
- **HTML reports**: Standalone HTML performance reports
- **JSON export**: Machine-readable JSON output
- **Markdown**: Markdown-formatted reports (for CI comments, PRs)
- **Comparison**: Side-by-side baseline diff reports
- **Perfetto export**: Export traces for Chrome's Perfetto UI
- **Speedscope export**: Export profiles for Speedscope viewer

## Usage

This package is primarily used internally by `@lanternajs/cli`. If you're building custom report formats:

```ts
import { renderTerminalReport, exportJson } from "@lanternajs/report";
```

## License

Apache-2.0 — see [LICENSE](https://github.com/rogerfuentes/lanterna/blob/main/LICENSE)
