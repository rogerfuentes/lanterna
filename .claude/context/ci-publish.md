# CI/CD & npm Publishing

## Overview
GitHub Actions CI + OIDC Trusted Publishing to npm under the `@lanternajs` scope.

## Changesets (IMPORTANT)

Every PR that changes packages **must** include a changeset. The changeset check workflow enforces this.

### Creating a changeset (non-interactive)

`bunx changeset` is interactive and won't work in non-TTY environments (CI, Claude Code). Create the file directly:

```bash
# File: .changeset/<descriptive-name>.md
```

```markdown
---
"@lanternajs/core": minor
"@lanternajs/cli": minor
---

Add device grouping to score comparison reports

Users can now compare scores across device tiers (low/mid/high). The CLI
renders a grouped table and the JSON export includes a `deviceGroup` field.
```

### Bump types
- **patch** (`0.0.1` → `0.0.2`): Bug fixes, internal refactors, docs, config changes
- **minor** (`0.1.0` → `0.2.0`): New features, new exports, new CLI flags
- **major** (`1.0.0` → `2.0.0`): Breaking API changes (avoid pre-1.0 — use minor instead)

### Which packages to include
- Only list packages whose **public API or behavior** changed
- If you changed `core` internals that `android` consumes, list both
- Don't list packages that only had transitive dependency bumps — `updateInternalDependencies: "patch"` handles that automatically
- All 7 packages are `linked` — they'll get the same version number

### Writing good changelog entries

The text below the `---` becomes the CHANGELOG.md entry and the npm release note. Write it for **users**, not developers:

**Good:**
```
Add `--threshold` flag to `lanterna measure` for custom score boundaries

Previously the score thresholds were hardcoded. Now you can pass
`--threshold good=90,poor=50` to customize per-metric boundaries.
```

**Bad:**
```
refactor scoring module and update CLI args parser
```

**Guidelines:**
- First line: what changed, in imperative mood (like a commit message)
- Optional body: why it matters, migration notes, or usage example
- Don't describe implementation — describe the user-visible change
- For patch/config changes, one line is fine: `Fix memory parser crash on Android 14 devices`

## Package Build

- Root `tsconfig.json`: `noEmit: true` (type-checking only)
- Each package has `tsconfig.build.json` extending root, overriding:
  - `noEmit: false`, `outDir: "dist"`, `declaration: true`, `declarationMap: true`
  - `paths: {}` — clears root paths so workspace resolution finds built `.d.ts` files
  - `exclude: ["src/**/*.test.ts", "src/**/__tests__"]`
- Build order matters (sequential in root script): core → android/ios/report → cli → react-native/expo-devtools-plugin
- `react-native` has no `rootDir` (includes both `src/` and `plugin/src/`), so `main` points to `dist/src/index.js`

## GitHub Workflows

- **CI** (`ci.yml`): runs on PR → lint, typecheck, build, test
- **Changeset Check** (`changeset-check.yml`): runs on PR → fails if no changeset
- **Release** (`release.yml`): runs on push to main → build, test, `changeset version`, npm publish with OIDC provenance

## npm Package Setup

- All packages scoped under `@lanternajs` (npm org: `lanternajs`)
- Each `package.json` needs: `main`, `types`, `files`, `license`, `description`, `repository`, `publishConfig`
- Each package needs its own `README.md` — npm displays it on the package page
- `files` array controls what ships: always include `dist`, optionally `src` for source maps
- OIDC requires GitHub environment `npm` + Trusted Publishing configured per package on npmjs.com

## Anti-patterns

- Don't skip changesets — release workflow can't publish without a version bump
- Don't use `bunx changeset` in non-TTY — create the `.md` file directly
- Don't inherit root tsconfig `paths` in build configs — causes cross-package `rootDir` conflicts
- Don't mix scoped/unscoped package names — keep everything under `@lanternajs/`
