# Workflow

## Git Strategy: Trunk-Based Development

- Main branch is always deployable
- Short-lived feature branches (<1 day ideal)
- Branch naming: `<type>/<short-description>` (e.g., `feat/user-profile`)
- Merge via squash or rebase

## Branch Types
- `feat/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code improvements
- `docs/` - Documentation

## Commit Format
Conventional commits:
- `feat: add user profile page`
- `fix: resolve navigation crash`
- `refactor: simplify auth logic`

## PR Size
Target 200-400 lines of code per PR for easy review.
