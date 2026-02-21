/**
 * Integration types and helpers for React Navigation and Expo Router.
 * These define the API surface for navigation tracking integration.
 *
 * Actual React hook implementations would use these types but require
 * a React runtime — these utilities are framework-agnostic and testable in Bun.
 */

import type { NavigationState, NavigationTracker, ScreenMetrics } from "./navigation";

/** Configuration for the navigation tracking integration. */
export interface LanternaNavigationConfig {
	tracker: NavigationTracker;
	onScreenChange?: (screen: ScreenMetrics) => void;
}

/**
 * Creates a navigation state change handler that feeds into a NavigationTracker.
 * Use this with NavigationContainer's onStateChange prop.
 *
 * Usage with React Navigation:
 *   const tracker = new NavigationTracker();
 *   <NavigationContainer onStateChange={createNavigationHandler(tracker)}>
 *
 * Usage with Expo Router:
 *   // In root _layout.tsx
 *   const tracker = new NavigationTracker();
 *   useEffect(() => {
 *     const nav = rootNavigation;
 *     nav?.addListener('state', (e) => tracker.handleStateChange(e.data.state));
 *   }, []);
 */
export function createNavigationHandler(
	tracker: NavigationTracker,
): (state: NavigationState | undefined) => void {
	return (state: NavigationState | undefined) => {
		if (state) {
			tracker.handleStateChange(state);
		}
	};
}

/**
 * Creates a configured navigation handler with an optional screen change callback.
 * Convenience wrapper that wires up both the tracker and a listener.
 *
 * Usage:
 *   const { handler, tracker } = createNavigationIntegration({
 *     tracker: new NavigationTracker(),
 *     onScreenChange: (screen) => console.log('Navigated to', screen.screenName),
 *   });
 *   <NavigationContainer onStateChange={handler}>
 */
export function createNavigationIntegration(config: LanternaNavigationConfig): {
	handler: (state: NavigationState | undefined) => void;
	tracker: NavigationTracker;
} {
	if (config.onScreenChange) {
		config.tracker.onScreenChange(config.onScreenChange);
	}

	return {
		handler: createNavigationHandler(config.tracker),
		tracker: config.tracker,
	};
}
