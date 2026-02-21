# Product Vision

## What We're Building
Lanterna is a CLI-first, cross-platform performance profiler for React Native and Expo apps. It captures, analyzes, and reports performance metrics from a single terminal command — no Xcode or Android Studio required. Think "Lighthouse for mobile apps."

## Who It's For
- RN/Expo developers without native profiling expertise
- Mobile team leads who need standardized cross-platform perf benchmarks
- QA engineers who need quantifiable metrics for "it feels slow" reports
- Solo/indie developers with no time to learn native tooling

## Key Problems We Solve
- iOS profiling requires opening Xcode Instruments — steep learning curve
- Android profiling requires Android Studio Profiler — equally complex
- No unified cross-platform performance view exists
- Flashlight (closest competitor) is Android-only
- No CLI-native tool exists for CI/CD pipeline integration

## Success Looks Like
- `npx lanterna measure` works on both platforms out of the box
- Consistent scores (< 5% variance) across runs
- Adopted by open-source RN projects for perf benchmarking
- Recognized as the cross-platform alternative to Flashlight

## What We're NOT Building
- A replacement for Xcode Instruments or Android Studio Profiler (we complement, not replace)
- A production monitoring tool (that's Sentry/Firebase Performance territory)
- A GUI application (CLI-first; HTML reports come later)
- A generic mobile profiler (RN/Expo-specific insights are the differentiator)
