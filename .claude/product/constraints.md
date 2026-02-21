# Constraints

## Technical Constraints
- iOS profiling (`xctrace`) only works on macOS — acceptable since iOS dev requires Mac
- `xctrace` is record-then-export, no real-time streaming — live data requires Tier 2 native module
- `xctrace export` XML format is underdocumented and changes across Xcode versions
- Perfetto protobuf configs must be shipped as presets for common RN scenarios
- Timestamp alignment needed to correlate native traces with Hermes JS profiler data

## Business Constraints
- Open source (license TBD: MIT vs Apache 2.0)
- Solo developer initially — prioritize Phase 1 MVP over breadth
- Must work on iOS 16+ simulators and Android API 28+ (emulator + physical)

## Dependencies
- Xcode CLI tools (`xcode-select --install`) for iOS
- Android SDK + ADB for Android
- Bun runtime for the CLI itself
- `execa` for subprocess management
- `ink` for terminal UI rendering

## Non-Negotiables
- Cross-platform from day one (both iOS and Android in Phase 1)
- CLI execution under 30s for a 10s measurement
- Zero app modifications required for Tier 1 metrics
- Weighted scoring model: UI FPS 25%, JS FPS 20%, CPU 15%, memory 15%, frame drops 15%, TTI 10%
