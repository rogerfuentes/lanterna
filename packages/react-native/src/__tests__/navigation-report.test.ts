import { describe, expect, test } from "bun:test";
import type { NavigationTimeline, ScreenMetrics } from "../navigation";
import { formatNavigationReport } from "../navigation-report";

function makeScreen(overrides: Partial<ScreenMetrics> & { screenName: string }): ScreenMetrics {
	return {
		visitedAt: Date.now(),
		...overrides,
	};
}

function makeTimeline(overrides: Partial<NavigationTimeline> = {}): NavigationTimeline {
	return {
		screens: [],
		currentScreen: null,
		totalScreenChanges: 0,
		averageTTID: null,
		slowestScreen: null,
		...overrides,
	};
}

describe("formatNavigationReport", () => {
	test("report contains screen names", () => {
		const screen1 = makeScreen({
			screenName: "HomeScreen",
			ttid: 120,
			renderDuration: 45,
			timeOnScreen: 8200,
		});
		const screen2 = makeScreen({
			screenName: "ProfileScreen",
			ttid: 250,
			renderDuration: 82,
			timeOnScreen: 3100,
		});

		const timeline = makeTimeline({
			screens: [screen1, screen2],
			totalScreenChanges: 2,
			averageTTID: 185,
			slowestScreen: screen2,
		});

		const report = formatNavigationReport(timeline);
		expect(report).toContain("HomeScreen");
		expect(report).toContain("ProfileScreen");
	});

	test("report contains TTID values", () => {
		const screen = makeScreen({
			screenName: "HomeScreen",
			ttid: 120,
			renderDuration: 45,
			timeOnScreen: 8200,
		});

		const timeline = makeTimeline({
			screens: [screen],
			totalScreenChanges: 1,
			averageTTID: 120,
			slowestScreen: screen,
		});

		const report = formatNavigationReport(timeline);
		expect(report).toContain("120ms");
	});

	test("report shows slowest marker", () => {
		const screen1 = makeScreen({
			screenName: "FastScreen",
			ttid: 50,
			timeOnScreen: 1000,
		});
		const screen2 = makeScreen({
			screenName: "SlowScreen",
			ttid: 600,
			timeOnScreen: 2000,
		});

		const timeline = makeTimeline({
			screens: [screen1, screen2],
			totalScreenChanges: 2,
			averageTTID: 325,
			slowestScreen: screen2,
		});

		const report = formatNavigationReport(timeline);
		expect(report).toContain("slowest");
	});

	test("report shows average TTID in header", () => {
		const screen1 = makeScreen({
			screenName: "Home",
			ttid: 100,
		});
		const screen2 = makeScreen({
			screenName: "Profile",
			ttid: 200,
		});

		const timeline = makeTimeline({
			screens: [screen1, screen2],
			totalScreenChanges: 2,
			averageTTID: 150,
			slowestScreen: screen2,
		});

		const report = formatNavigationReport(timeline);
		expect(report).toContain("avg TTID: 150ms");
	});

	test("empty timeline handled gracefully", () => {
		const timeline = makeTimeline();
		const report = formatNavigationReport(timeline);
		expect(report).toContain("No navigation data recorded");
	});

	test("report header shows screen count", () => {
		const screens = [
			makeScreen({ screenName: "A", ttid: 10 }),
			makeScreen({ screenName: "B", ttid: 20 }),
			makeScreen({ screenName: "C", ttid: 30 }),
		];

		const timeline = makeTimeline({
			screens,
			totalScreenChanges: 3,
			averageTTID: 20,
			slowestScreen: screens[2],
		});

		const report = formatNavigationReport(timeline);
		expect(report).toContain("3 screens");
	});

	test("report shows render duration", () => {
		const screen = makeScreen({
			screenName: "Home",
			ttid: 100,
			renderDuration: 45,
			timeOnScreen: 5000,
		});

		const timeline = makeTimeline({
			screens: [screen],
			totalScreenChanges: 1,
			averageTTID: 100,
			slowestScreen: screen,
		});

		const report = formatNavigationReport(timeline);
		expect(report).toContain("45ms");
	});

	test("report shows time on screen in seconds for large values", () => {
		const screen = makeScreen({
			screenName: "Home",
			ttid: 100,
			timeOnScreen: 8200,
		});

		const timeline = makeTimeline({
			screens: [screen],
			totalScreenChanges: 1,
			averageTTID: 100,
			slowestScreen: screen,
		});

		const report = formatNavigationReport(timeline);
		expect(report).toContain("8.2s");
	});

	test("single screen says 1 screen not 1 screens", () => {
		const screen = makeScreen({ screenName: "Home", ttid: 50 });
		const timeline = makeTimeline({
			screens: [screen],
			totalScreenChanges: 1,
			averageTTID: 50,
			slowestScreen: screen,
		});

		const report = formatNavigationReport(timeline);
		expect(report).toContain("1 screen,");
		expect(report).not.toContain("1 screens");
	});

	test("report shows N/A for null averageTTID", () => {
		const screen = makeScreen({ screenName: "Home" });
		const timeline = makeTimeline({
			screens: [screen],
			totalScreenChanges: 1,
			averageTTID: null,
			slowestScreen: null,
		});

		const report = formatNavigationReport(timeline);
		expect(report).toContain("N/A");
	});

	test("report contains column headers", () => {
		const screen = makeScreen({ screenName: "Home", ttid: 100 });
		const timeline = makeTimeline({
			screens: [screen],
			totalScreenChanges: 1,
			averageTTID: 100,
			slowestScreen: screen,
		});

		const report = formatNavigationReport(timeline);
		expect(report).toContain("Screen");
		expect(report).toContain("TTID");
		expect(report).toContain("Render");
		expect(report).toContain("Time on Screen");
	});
});
