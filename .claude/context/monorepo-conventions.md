# Monorepo Conventions

## Overview
Bun workspace patterns and TypeScript configuration for this monorepo.

## Patterns

### TypeScript
- `noEmit: true` — TypeScript is for type checking only, Bun runs `.ts` directly
- No `tsc --build` or project references — Bun resolves `@lanternajs/*` workspace aliases natively
- Root `tsconfig.json` with `paths: { "@lanternajs/*": ["./packages/*/src"] }`
- Typecheck: `bun run typecheck` (runs `tsc --noEmit`)

### Imports
- Cross-package: `import { X } from "@lanternajs/core"` — no `.ts` extensions
- Intra-package: `import { X } from "./module"` — no `.ts` extensions
- `moduleResolution: "bundler"` handles all resolution

### Linting
- Always run `bun run lint:fix` before `bun run lint`
- Biome auto-fixes: import ordering, formatting (line width, trailing commas)
- Biome catches: unused imports, non-null assertions (use `?.` instead of `!.`)
- ANSI regex needs `biome-ignore` comment for control characters

### Testing
- All tests: `bun test`
- Single package: `bun test packages/core`
- Bun's built-in test runner, `import { describe, expect, test } from "bun:test"`
- Need `@types/bun` as devDependency for `Bun.spawn`, `Bun.file`, etc.

## Anti-patterns
- Don't use `tsc --build` with `--noEmit` (they conflict)
- Don't add `.ts` extensions to imports
- Don't use non-null assertions (`!.`) — Biome flags them, use optional chaining (`?.`)
