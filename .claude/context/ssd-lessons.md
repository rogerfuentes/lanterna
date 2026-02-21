# SSD Lessons Learned

## Overview
Practical lessons from applying the Spec → Strategy → Summary → Learnings workflow.

## Patterns

### Strategy Matters
- Writing strategy.md before code prevents scope creep
- E1-I6 strategy chose plain ANSI over ink — saved an entire dependency and complexity layer
- Strategy should explicitly state what goes in which package

### Agent Strategy Section
- Every spec.md should include an "Agent Strategy" section
- Determines whether to parallelize (independent parsers) or serialize (integration work)
- E1-I3 split iOS/Android detection into parallel agents — effective, zero coordination needed
- E1-I7 (CLI measure) was best as single agent — integration work with tight coupling

### Dependency Graph
- `index.md` dependency graph is the single source of truth for what's unblocked
- Update it immediately when an initiative completes (status + checkmark)
- Identifies parallel opportunities: E1-I4 + I5 + I6 all ran simultaneously

### Parallel Sessions
- Independent epics (E3 + E4) can run in separate Claude Code sessions
- Works because they share no files — each writes to different packages
- Orchestrator session stays available for merging and conflict resolution

### Initiative Sizing
- Sweet spot: 3-6 files, 1 package, testable in isolation
- E1-I2 (core types + scoring) was ideal — self-contained, everything else builds on it
- E1-I7 (CLI measure) was correct as the last initiative — pure integration

## Anti-patterns
- Don't skip spec.md — even "obvious" initiatives benefit from scope boundaries
- Don't merge strategy into spec — they serve different purposes (what vs how)
- Don't forget to update index.md — stale status creates confusion
