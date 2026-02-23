# Monorepo Conventions

## Overview
Bun workspace patterns and TypeScript configuration for this monorepo.

## Patterns

### TypeScript
- Root `tsconfig.json` has `noEmit: true` — used for type-checking only, Bun runs `.ts` directly
- Each package has `tsconfig.build.json` for compilation to `dist/` (see `context/ci-publish.md`)
- Root `tsconfig.json` with `paths: { "@lanternajs/*": ["./packages/*/src"] }`
- Typecheck: `bun run typecheck` (runs `tsc --noEmit`)
- Build: `bun run build` (runs `tsc --project` sequentially for each package)

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
- Don't add `.ts` extensions to imports
- Don't use non-null assertions (`!.`) — Biome flags them, use optional chaining (`?.`)
- Don't inherit root tsconfig `paths` in build configs — override with `paths: {}`
