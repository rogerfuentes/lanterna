# Technical Context Files

This folder contains technical patterns and conventions specific to this project.

## Creating Context Files

Each file should focus on a single topic and follow this structure:

```markdown
# Topic Name

## Overview
Brief description of what this file covers.

## Patterns
The specific patterns, conventions, or approaches used.

## Examples
Code examples demonstrating the patterns.

## Anti-patterns
What to avoid and why.
```

## Naming Convention

Use kebab-case for filenames:
- `architecture.md` - System structure and module organization
- `api-conventions.md` - API design patterns
- `testing.md` - Testing strategies and patterns
- `state-management.md` - State handling approaches
- `error-handling.md` - Error patterns and recovery

## Token Budget

Keep each file focused and concise:
- Target: 300-500 tokens per file
- Maximum: 800 tokens per file
- If a file grows beyond 800 tokens, consider splitting it

## Updating CLAUDE.md

After creating a context file, add it to the Technical Context table in CLAUDE.md:

```markdown
| `context/your-file.md` | Load when working on [specific scenarios] |
```

Be specific about when Claude should load the file to avoid unnecessary context.
