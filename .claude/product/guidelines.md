# Product Guidelines

## Brand Voice
- Technical but approachable — target audience knows JS/TS but not native tooling
- Concise CLI output — no walls of text, use color and symbols for scannability
- Opinionated scoring with clear recommendations, not raw data dumps
- Name comes from Italian for "lantern" — illuminate performance issues

## UX Principles
- Zero-config first: `lanterna measure` should just work with no flags
- Progressive disclosure: basic score first, drill into details on demand
- Platform-agnostic output: same report format regardless of iOS or Android
- CI/CD-friendly: JSON export, exit codes for threshold failures

## Content Standards
- Metric names match industry conventions (FPS, TTI, CPU %, memory MB)
- Color coding: green (good), yellow (needs work), red (poor)
- Recommendations should be RN-specific and actionable (mention specific APIs, components)
- Error messages should suggest fixes, not just describe the problem

## Design System
- Terminal UI via ink (React-based CLI rendering)
- HTML reports follow Lighthouse visual patterns (score circle, metric cards)
