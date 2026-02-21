# Agent Patterns

## Overview
How we use Claude Code agents effectively for parallel work in this monorepo.

## Patterns

### Worktree Isolation
- Use `isolation: "worktree"` for parallel agents that touch different packages
- **Always commit before launching worktree agents** — worktrees fail on repos with no commits
- After agents complete, copy files from `.claude/worktrees/agent-*/` back to main tree
- Clean up worktrees before running lint (`rm -rf .claude/worktrees/agent-*/ && git worktree prune`)
- Biome errors on nested `biome.json` found in worktree copies — cleanup fixes this

### Agent Prompts
- Include full type definitions in the prompt (agents can't browse other packages)
- Specify exact import paths: `import { X } from "@lanterna/core"`
- Specify formatting rules: tabs, 100 char width
- Tell agents which files they can/cannot modify
- Include fixture data examples for parsers

### Post-Agent Checklist
1. Copy files from worktree to main
2. Remove worktree directories
3. Fix `.ts` extensions in imports (agents add them, `bundler` resolution doesn't need them)
4. Run `bun run lint:fix` (import ordering)
5. Run full validation: `typecheck && lint && test`

## Anti-patterns
- Don't launch worktree agents without a commit — they'll fail with "git rev-parse failed"
- Don't run `bun run lint` before cleaning up worktrees — nested biome.json causes errors
- Don't assume agents will get import ordering right — always run lint:fix after
