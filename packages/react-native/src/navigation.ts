/**
 * Navigation instrumentation for React Navigation and Expo Router.
 * Tracks screen transitions, TTID, TTFD, and builds a navigation timeline.
 */

/**
 * Minimal representation of React Navigation's state object.
 * Defined locally to avoid requiring @react-navigation/native as a dependency.
 */
export interface NavigationState {
	index: number;
	routes: Array<{
		name: string;
		state?: NavigationState;
	}>;
}

/** Metrics for a single screen visit. */
export interface ScreenMetrics {
	screenName: string;
	visitedAt: number;
	leftAt?: number;
	/** Time to Initial Display in milliseconds. */
	ttid?: number;
	/** Time to Full Display in milliseconds (set manually via screenReady()). */
	ttfd?: number;
	/** React render duration in milliseconds. */
	renderDuration?: number;
	/** Total time spent on this screen in milliseconds. */
	timeOnScreen?: number;
}

/** Aggregated navigation timeline data. */
export interface NavigationTimeline {
	screens: ScreenMetrics[];
	currentScreen: string | null;
	totalScreenChanges: number;
	averageTTID: number | null;
	slowestScreen: ScreenMetrics | null;
}

/**
 * Extract the active route name from a React Navigation state object.
 * Recursively traverses nested navigators to find the deepest active route.
 */
export function getActiveRouteName(state: NavigationState): string | null {
	if (!state.routes || state.routes.length === 0) return null;

	const index = state.index;
	if (index < 0 || index >= state.routes.length) return null;

	const route = state.routes[index];

	// Recursively descend into nested navigators
	if (route.state) {
		return getActiveRouteName(route.state);
	}

	return route.name;
}

/**
 * Tracks navigation state changes and records screen-level performance metrics.
 * Works with any navigation library that exposes a state object matching NavigationState.
 */
export class NavigationTracker {
	private screens: ScreenMetrics[] = [];
	private currentScreen: ScreenMetrics | null = null;
	private listeners = new Set<(screen: ScreenMetrics) => void>();

	/**
	 * Called when navigation state changes.
	 * Extracts the current route name and records screen transition.
	 */
	handleStateChange(state: NavigationState): void {
		const routeName = getActiveRouteName(state);
		if (routeName === null) return;

		// If navigating to the same screen that is already current, treat as a no-op
		if (this.currentScreen && this.currentScreen.screenName === routeName) return;

		const now = Date.now();

		// Close the previous screen
		if (this.currentScreen) {
			this.currentScreen.leftAt = now;
			this.currentScreen.timeOnScreen = now - this.currentScreen.visitedAt;
		}

		// Create the new screen entry
		const screen: ScreenMetrics = {
			screenName: routeName,
			visitedAt: now,
			ttid: 0, // TTID is zero at the moment of state change (instant display)
		};

		this.screens.push(screen);
		this.currentScreen = screen;

		// Notify listeners
		for (const listener of this.listeners) {
			listener(screen);
		}
	}

	/**
	 * Mark that the current screen is fully displayed (manual TTFD).
	 * Call this when the screen has finished loading all data and is fully interactive.
	 */
	screenReady(): void {
		if (!this.currentScreen) return;
		this.currentScreen.ttfd = Date.now() - this.currentScreen.visitedAt;
	}

	/**
	 * Set the render duration for the current screen.
	 * Call this after measuring React render time (e.g., from Profiler callback).
	 */
	setRenderDuration(durationMs: number): void {
		if (!this.currentScreen) return;
		this.currentScreen.renderDuration = durationMs;
	}

	/**
	 * Get the full navigation timeline with computed aggregates.
	 */
	getTimeline(): NavigationTimeline {
		const ttidValues: number[] = [];
		for (const s of this.screens) {
			if (s.ttid !== undefined) ttidValues.push(s.ttid);
		}
		const averageTTID =
			ttidValues.length > 0 ? ttidValues.reduce((sum, v) => sum + v, 0) / ttidValues.length : null;

		let slowestScreen: ScreenMetrics | null = null;
		for (const screen of this.screens) {
			if (screen.ttid === undefined) continue;
			if (!slowestScreen || screen.ttid > (slowestScreen.ttid ?? 0)) {
				slowestScreen = screen;
			}
		}

		return {
			screens: [...this.screens],
			currentScreen: this.currentScreen?.screenName ?? null,
			totalScreenChanges: this.screens.length,
			averageTTID,
			slowestScreen,
		};
	}

	/**
	 * Get metrics for a specific screen (most recent visit).
	 */
	getScreenMetrics(screenName: string): ScreenMetrics | null {
		for (let i = this.screens.length - 1; i >= 0; i--) {
			if (this.screens[i].screenName === screenName) {
				return this.screens[i];
			}
		}
		return null;
	}

	/**
	 * Subscribe to screen change events.
	 * Returns an unsubscribe function.
	 */
	onScreenChange(listener: (screen: ScreenMetrics) => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	/**
	 * Reset all tracking data.
	 */
	clear(): void {
		this.screens = [];
		this.currentScreen = null;
		this.listeners.clear();
	}
}
