# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lanterna is a CLI-first, cross-platform performance profiler for React Native and Expo apps. Think "Lighthouse for mobile apps" — captures, analyzes, and reports performance metrics without requiring Xcode or Android Studio.

Key differentiator: iOS support via `xcrun xctrace` from the CLI (novel approach). Fills the "low-friction + cross-platform" gap that Flashlight (Android-only) leaves open.

## Tech Stack

- **Language**: TypeScript
- **Runtime**: Bun (workspaces for monorepo)
- **CLI rendering**: ink (React-based terminal UI)
- **Subprocess management**: execa
- **Linting/formatting**: Biome (tabs, 100 char line width)
- **Testing**: Bun's built-in test runner
- **Versioning/publishing**: Changesets (`@changesets/cli`)

## Commands

```bash
bun test                # Run all tests
bun run typecheck       # TypeScript type checking (tsc --noEmit)
bun run lint            # Biome lint + format check
bun run lint:fix        # Auto-fix lint/format issues
bun run format          # Format all files
bunx changeset          # Create a changeset for version bumps
bun run version         # Bump versions from changesets
bun run release         # Publish to npm
```

Run a single package's tests: `bun test packages/core`

Run the CLI: `bun run packages/cli/src/index.ts`

## Monorepo Structure

```
packages/
  core/     → @lanterna/core     (scoring engine, types, metric normalization — no internal deps)
  android/  → @lanterna/android  (adb + perfetto data collection → depends on core)
  ios/      → @lanterna/ios      (xctrace data collection → depends on core)
  report/   → @lanterna/report   (terminal + HTML output → depends on core)
  cli/      → @lanterna/cli      (main entry point → depends on all packages)
```

Cross-package imports use `@lanterna/*` workspace aliases resolved by Bun natively.

## Architecture

Three-tier data collection model:

1. **Tier 1 (External, zero-config)**: Collects metrics via platform CLIs without app modifications
   - Android: `adb shell top`, `dumpsys meminfo`, `dumpsys gfxinfo`, `perfetto`
   - iOS: `xcrun xctrace record` + `xcrun xctrace export` (outputs XML)
2. **Tier 2 (In-app module)**: `lanterna-react-native` package for real-time FPS, Hermes profiling, React Profiler bridge
3. **Tier 3 (Deep instrumentation)**: Hermes CPU profiles, network waterfall, bridge/JSI call tracking

Scoring: Weighted 0-100 score across UI FPS (25%), JS FPS (20%), CPU (15%), memory (15%), frame drops (15%), TTI (10%). Thresholds configurable via `.lanternarc`.

## Key Technical Details

- `xctrace export` outputs underdocumented XML — parser needs version-awareness across Xcode releases
- Perfetto uses protobuf config; ship preset configs for common RN scenarios
- Real-time iOS streaming not possible with xctrace (record-then-export) — live data requires Tier 2 native module
- Timestamp alignment needed to correlate native traces with Hermes JS profiler data
- Turbo Module (New Architecture) for Phase 3 native module, with backward compat for old arch

## Product Context
| File | Load when... |
|------|--------------|
| `product/vision.md` | Starting new features, making trade-off decisions |
| `product/guidelines.md` | Writing copy, designing UI, user-facing changes |
| `product/constraints.md` | Architectural decisions, timeline discussions |

## Technical Context
| File | Load when... |
|------|--------------|
| `context/workflow.md` | Git branching, commit format, PR conventions |
| `context/ssd-workflow.md` | Starting or reviewing any initiative (spec → strategy → summary → learnings) |
| `context/agent-patterns.md` | Launching parallel agents, using worktrees, writing agent prompts |
| `context/monorepo-conventions.md` | TypeScript config, imports, linting, testing patterns |
| `context/ssd-lessons.md` | Planning initiative sizing, agent strategy, parallel sessions |

## Working Agreements
- Run tests before committing
- Use early returns
- Keep functions small and focused
