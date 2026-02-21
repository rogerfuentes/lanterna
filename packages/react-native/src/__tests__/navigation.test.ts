import { describe, expect, test } from "bun:test";
import type { NavigationState, ScreenMetrics } from "../navigation";
import { getActiveRouteName, NavigationTracker } from "../navigation";

// Mock navigation states for testing
const homeState: NavigationState = {
	index: 0,
	routes: [{ name: "Home" }, { name: "Profile" }],
};

const profileState: NavigationState = {
	index: 1,
	routes: [{ name: "Home" }, { name: "Profile" }],
};

// Nested navigator
const nestedState: NavigationState = {
	index: 0,
	routes: [
		{
			name: "MainTabs",
			state: {
				index: 1,
				routes: [{ name: "Feed" }, { name: "Search" }],
			},
		},
	],
};

// Deeply nested navigator
const deepNestedState: NavigationState = {
	index: 0,
	routes: [
		{
			name: "Root",
			state: {
				index: 0,
				routes: [
					{
						name: "MainTabs",
						state: {
							index: 1,
							routes: [{ name: "Feed" }, { name: "Settings" }],
						},
					},
				],
			},
		},
	],
};

const emptyState: NavigationState = {
	index: 0,
	routes: [],
};

describe("getActiveRouteName", () => {
	test("extracts correct route from flat state", () => {
		expect(getActiveRouteName(homeState)).toBe("Home");
		expect(getActiveRouteName(profileState)).toBe("Profile");
	});

	test("extracts deepest route from nested state", () => {
		expect(getActiveRouteName(nestedState)).toBe("Search");
	});

	test("extracts deepest route from deeply nested state", () => {
		expect(getActiveRouteName(deepNestedState)).toBe("Settings");
	});

	test("returns null for empty state", () => {
		expect(getActiveRouteName(emptyState)).toBeNull();
	});

	test("returns null for out-of-bounds index", () => {
		const badState: NavigationState = {
			index: 5,
			routes: [{ name: "Home" }],
		};
		expect(getActiveRouteName(badState)).toBeNull();
	});

	test("returns null for negative index", () => {
		const negState: NavigationState = {
			index: -1,
			routes: [{ name: "Home" }],
		};
		expect(getActiveRouteName(negState)).toBeNull();
	});
});

describe("NavigationTracker", () => {
	test("handleStateChange records screen visit with timestamp", () => {
		const tracker = new NavigationTracker();
		const before = Date.now();
		tracker.handleStateChange(homeState);
		const after = Date.now();

		const timeline = tracker.getTimeline();
		expect(timeline.screens).toHaveLength(1);
		expect(timeline.screens[0].screenName).toBe("Home");
		expect(timeline.screens[0].visitedAt).toBeGreaterThanOrEqual(before);
		expect(timeline.screens[0].visitedAt).toBeLessThanOrEqual(after);
	});

	test("handleStateChange closes previous screen", () => {
		const tracker = new NavigationTracker();
		tracker.handleStateChange(homeState);
		tracker.handleStateChange(profileState);

		const timeline = tracker.getTimeline();
		const homeScreen = timeline.screens[0];
		expect(homeScreen.leftAt).toBeDefined();
		expect(homeScreen.timeOnScreen).toBeDefined();
		expect(homeScreen.timeOnScreen).toBeGreaterThanOrEqual(0);
	});

	test("handleStateChange ignores null route names", () => {
		const tracker = new NavigationTracker();
		tracker.handleStateChange(emptyState);

		const timeline = tracker.getTimeline();
		expect(timeline.screens).toHaveLength(0);
	});

	test("same screen navigation is ignored", () => {
		const tracker = new NavigationTracker();
		tracker.handleStateChange(homeState);
		tracker.handleStateChange(homeState);

		const timeline = tracker.getTimeline();
		expect(timeline.screens).toHaveLength(1);
	});

	test("screenReady sets TTFD on current screen", () => {
		const tracker = new NavigationTracker();
		tracker.handleStateChange(homeState);
		tracker.screenReady();

		const timeline = tracker.getTimeline();
		expect(timeline.screens[0].ttfd).toBeDefined();
		expect(timeline.screens[0].ttfd).toBeGreaterThanOrEqual(0);
	});

	test("screenReady does nothing when no current screen", () => {
		const tracker = new NavigationTracker();
		// Should not throw
		tracker.screenReady();
	});

	test("getTimeline returns all screens in order", () => {
		const tracker = new NavigationTracker();
		tracker.handleStateChange(homeState);
		tracker.handleStateChange(profileState);

		const state3: NavigationState = {
			index: 0,
			routes: [{ name: "Settings" }],
		};
		tracker.handleStateChange(state3);

		const timeline = tracker.getTimeline();
		expect(timeline.screens).toHaveLength(3);
		expect(timeline.screens[0].screenName).toBe("Home");
		expect(timeline.screens[1].screenName).toBe("Profile");
		expect(timeline.screens[2].screenName).toBe("Settings");
	});

	test("getTimeline calculates averageTTID", () => {
		const tracker = new NavigationTracker();
		tracker.handleStateChange(homeState);
		tracker.handleStateChange(profileState);

		const timeline = tracker.getTimeline();
		// Both screens have ttid = 0 (instant display at state change)
		expect(timeline.averageTTID).toBe(0);
	});

	test("getTimeline returns null averageTTID when no screens", () => {
		const tracker = new NavigationTracker();
		const timeline = tracker.getTimeline();
		expect(timeline.averageTTID).toBeNull();
	});

	test("getTimeline identifies slowestScreen", () => {
		const tracker = new NavigationTracker();
		tracker.handleStateChange(homeState);
		tracker.handleStateChange(profileState);

		const timeline = tracker.getTimeline();
		// Both screens have ttid = 0, so slowest is the first one found with max ttid
		expect(timeline.slowestScreen).not.toBeNull();
	});

	test("getTimeline returns null slowestScreen when no screens", () => {
		const tracker = new NavigationTracker();
		const timeline = tracker.getTimeline();
		expect(timeline.slowestScreen).toBeNull();
	});

	test("getTimeline tracks currentScreen", () => {
		const tracker = new NavigationTracker();
		expect(tracker.getTimeline().currentScreen).toBeNull();

		tracker.handleStateChange(homeState);
		expect(tracker.getTimeline().currentScreen).toBe("Home");

		tracker.handleStateChange(profileState);
		expect(tracker.getTimeline().currentScreen).toBe("Profile");
	});

	test("getTimeline tracks totalScreenChanges", () => {
		const tracker = new NavigationTracker();
		expect(tracker.getTimeline().totalScreenChanges).toBe(0);

		tracker.handleStateChange(homeState);
		expect(tracker.getTimeline().totalScreenChanges).toBe(1);

		tracker.handleStateChange(profileState);
		expect(tracker.getTimeline().totalScreenChanges).toBe(2);
	});

	test("getScreenMetrics returns most recent visit for a screen name", () => {
		const tracker = new NavigationTracker();
		tracker.handleStateChange(homeState);
		tracker.handleStateChange(profileState);

		// Navigate back to Home
		const homeAgainState: NavigationState = {
			index: 0,
			routes: [{ name: "Home" }, { name: "Profile" }],
		};
		tracker.handleStateChange(homeAgainState);

		const timeline = tracker.getTimeline();
		const metrics = tracker.getScreenMetrics("Home");
		expect(metrics).not.toBeNull();
		// Should return the third entry (second Home visit), not the first
		expect(metrics).toBe(timeline.screens[2]);
		expect(metrics?.screenName).toBe("Home");
	});

	test("getScreenMetrics returns null for unknown screen", () => {
		const tracker = new NavigationTracker();
		expect(tracker.getScreenMetrics("Unknown")).toBeNull();
	});

	test("onScreenChange listener fires on each transition", () => {
		const tracker = new NavigationTracker();
		const events: ScreenMetrics[] = [];
		tracker.onScreenChange((screen) => events.push(screen));

		tracker.handleStateChange(homeState);
		tracker.handleStateChange(profileState);

		expect(events).toHaveLength(2);
		expect(events[0].screenName).toBe("Home");
		expect(events[1].screenName).toBe("Profile");
	});

	test("onScreenChange returns unsubscribe function", () => {
		const tracker = new NavigationTracker();
		const events: ScreenMetrics[] = [];
		const unsub = tracker.onScreenChange((screen) => events.push(screen));

		tracker.handleStateChange(homeState);
		expect(events).toHaveLength(1);

		unsub();
		tracker.handleStateChange(profileState);
		expect(events).toHaveLength(1); // No new event after unsubscribe
	});

	test("clear resets all data", () => {
		const tracker = new NavigationTracker();
		tracker.handleStateChange(homeState);
		tracker.handleStateChange(profileState);

		tracker.clear();

		const timeline = tracker.getTimeline();
		expect(timeline.screens).toHaveLength(0);
		expect(timeline.currentScreen).toBeNull();
		expect(timeline.totalScreenChanges).toBe(0);
		expect(timeline.averageTTID).toBeNull();
		expect(timeline.slowestScreen).toBeNull();
	});

	test("clear removes listeners", () => {
		const tracker = new NavigationTracker();
		const events: ScreenMetrics[] = [];
		tracker.onScreenChange((screen) => events.push(screen));

		tracker.clear();
		tracker.handleStateChange(homeState);

		expect(events).toHaveLength(0);
	});

	test("multiple visits to same screen tracked separately", () => {
		const tracker = new NavigationTracker();
		tracker.handleStateChange(homeState);
		tracker.handleStateChange(profileState);
		// Navigate back to Home
		tracker.handleStateChange({
			index: 0,
			routes: [{ name: "Home" }, { name: "Profile" }],
		});

		const timeline = tracker.getTimeline();
		expect(timeline.screens).toHaveLength(3);
		expect(timeline.screens[0].screenName).toBe("Home");
		expect(timeline.screens[2].screenName).toBe("Home");
		// They are different entries
		expect(timeline.screens[0]).not.toBe(timeline.screens[2]);
	});

	test("tab navigation same screen re-focused is handled correctly", () => {
		const tracker = new NavigationTracker();

		// Navigate to Home tab
		tracker.handleStateChange({
			index: 0,
			routes: [{ name: "Home" }, { name: "Profile" }, { name: "Settings" }],
		});
		expect(tracker.getTimeline().screens).toHaveLength(1);

		// Re-focus same Home tab — should be a no-op
		tracker.handleStateChange({
			index: 0,
			routes: [{ name: "Home" }, { name: "Profile" }, { name: "Settings" }],
		});
		expect(tracker.getTimeline().screens).toHaveLength(1);

		// Switch to Profile tab
		tracker.handleStateChange({
			index: 1,
			routes: [{ name: "Home" }, { name: "Profile" }, { name: "Settings" }],
		});
		expect(tracker.getTimeline().screens).toHaveLength(2);
		expect(tracker.getTimeline().currentScreen).toBe("Profile");
	});

	test("nested navigation is tracked correctly", () => {
		const tracker = new NavigationTracker();
		tracker.handleStateChange(nestedState);

		const timeline = tracker.getTimeline();
		expect(timeline.screens).toHaveLength(1);
		expect(timeline.screens[0].screenName).toBe("Search");
	});

	test("setRenderDuration sets render time on current screen", () => {
		const tracker = new NavigationTracker();
		tracker.handleStateChange(homeState);
		tracker.setRenderDuration(45);

		const timeline = tracker.getTimeline();
		expect(timeline.screens[0].renderDuration).toBe(45);
	});

	test("setRenderDuration does nothing when no current screen", () => {
		const tracker = new NavigationTracker();
		// Should not throw
		tracker.setRenderDuration(100);
	});
});
