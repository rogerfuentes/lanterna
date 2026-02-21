# SSD Workflow (Spec → Strategy → Summary → Learnings)

## Overview
Our development process for each initiative follows a 4-document lifecycle. Each initiative lives in `.claude/specs/<initiative>/` and progresses through these stages.

## Flow

### 1. `spec.md` — What are we building?
- Problem statement, acceptance criteria, scope boundaries
- Created before any code is written
- References PRD sections and technical research

### 2. `strategy.md` — How do we build it?
- Implementation plan with concrete steps
- Agent delegation strategy (what can run in parallel via team agents)
- Dependencies on other initiatives
- Created via `/cdd:create` or manually

### 3. `summary.md` — What did we build?
- Actual implementation notes, key decisions made
- Files created/modified, API surface
- Written after implementation is complete

### 4. `learnings.md` — What did we learn?
- Gotchas, surprises, patterns discovered
- Things to carry forward to future initiatives
- Optional — only when meaningful insights emerge

## Conventions
- Initiative naming: `E{epic}-I{number}-{kebab-description}`
- Status tracking: `.claude/specs/index.md`
- Use team agents for parallel work when initiative has independent subtasks
- **Commit before launching worktree agents** — worktrees require at least one commit
- Update `index.md` status immediately after completing each initiative

## Anti-patterns
- Don't skip spec.md and jump to code
- Don't write strategy.md without reading the spec first
- Don't create learnings.md if there's nothing meaningful — empty files add noise
