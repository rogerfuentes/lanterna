import { describe, expect, test } from "bun:test";
import { analyzeSession, builtInHeuristics } from "../heuristics";
import type { Device, MeasurementSession, MetricScore, ScoreResult } from "../types";
import { MetricType, ScoreCategory } from "../types";

const device: Device = {
	id: "test-device",
	name: "Test Device",
	platform: "android",
	type: "emulator",
};

function makeSession(): MeasurementSession {
	return {
		device,
		platform: "android",
		samples: [],
		duration: 10,
		startedAt: Date.now(),
	};
}

function makeMetricScore(type: MetricType, value: number, score: number): MetricScore {
	let category = ScoreCategory.GOOD;
	if (score < 40) category = ScoreCategory.POOR;
	else if (score < 75) category = ScoreCategory.NEEDS_WORK;

	return { type, value, score, category, weight: 0.15 };
}

function makeScoreResult(
	metrics: Array<{ type: MetricType; value: number; score: number }>,
): ScoreResult {
	const perMetric = metrics.map((m) => makeMetricScore(m.type, m.value, m.score));
	const overall =
		perMetric.length > 0
			? Math.round(perMetric.reduce((sum, m) => sum + m.score, 0) / perMetric.length)
			: 100;

	let category = ScoreCategory.GOOD;
	if (overall < 40) category = ScoreCategory.POOR;
	else if (overall < 75) category = ScoreCategory.NEEDS_WORK;

	return { overall, category, perMetric };
}

describe("analyzeSession", () => {
	test("healthy session returns no recommendations", () => {
		const session = makeSession();
		const score = makeScoreResult([
			{ type: MetricType.UI_FPS, value: 60, score: 100 },
			{ type: MetricType.JS_FPS, value: 60, score: 100 },
			{ type: MetricType.CPU, value: 10, score: 100 },
			{ type: MetricType.MEMORY, value: 150, score: 100 },
			{ type: MetricType.FRAME_DROPS, value: 1, score: 100 },
			{ type: MetricType.TTI, value: 1, score: 100 },
		]);

		const result = analyzeSession(session, score);
		expect(result).toHaveLength(0);
	});

	test("no metrics returns no recommendations", () => {
		const session = makeSession();
		const score = makeScoreResult([]);

		const result = analyzeSession(session, score);
		expect(result).toHaveLength(0);
	});
});

describe("individual heuristics", () => {
	test("low-ui-fps fires when UI FPS score is below 75", () => {
		const session = makeSession();
		const score = makeScoreResult([{ type: MetricType.UI_FPS, value: 50, score: 50 }]);

		const result = analyzeSession(session, score);
		const rec = result.find((r) => r.id === "low-ui-fps");
		expect(rec).toBeDefined();
		expect(rec?.severity).toBe("warning");
		expect(rec?.metric).toBe(MetricType.UI_FPS);
		expect(rec?.suggestion).toContain("React.memo");
	});

	test("low-ui-fps is critical when score is below 40", () => {
		const session = makeSession();
		const score = makeScoreResult([{ type: MetricType.UI_FPS, value: 35, score: 20 }]);

		const result = analyzeSession(session, score);
		const rec = result.find((r) => r.id === "low-ui-fps");
		expect(rec).toBeDefined();
		expect(rec?.severity).toBe("critical");
	});

	test("low-js-fps fires when JS FPS score is below 75", () => {
		const session = makeSession();
		const score = makeScoreResult([{ type: MetricType.JS_FPS, value: 48, score: 40 }]);

		const result = analyzeSession(session, score);
		const rec = result.find((r) => r.id === "low-js-fps");
		expect(rec).toBeDefined();
		expect(rec?.metric).toBe(MetricType.JS_FPS);
		expect(rec?.suggestion).toContain("InteractionManager");
	});

	test("high-cpu fires when CPU score is below 75", () => {
		const session = makeSession();
		const score = makeScoreResult([{ type: MetricType.CPU, value: 55, score: 30 }]);

		const result = analyzeSession(session, score);
		const rec = result.find((r) => r.id === "high-cpu");
		expect(rec).toBeDefined();
		expect(rec?.severity).toBe("critical");
		expect(rec?.metric).toBe(MetricType.CPU);
		expect(rec?.suggestion).toContain("Hermes");
	});

	test("high-memory fires when memory score is below 75", () => {
		const session = makeSession();
		const score = makeScoreResult([{ type: MetricType.MEMORY, value: 450, score: 50 }]);

		const result = analyzeSession(session, score);
		const rec = result.find((r) => r.id === "high-memory");
		expect(rec).toBeDefined();
		expect(rec?.metric).toBe(MetricType.MEMORY);
		expect(rec?.suggestion).toContain("removeClippedSubviews");
	});

	test("excessive-frame-drops fires when frame drops score is below 75", () => {
		const session = makeSession();
		const score = makeScoreResult([{ type: MetricType.FRAME_DROPS, value: 12, score: 45 }]);

		const result = analyzeSession(session, score);
		const rec = result.find((r) => r.id === "excessive-frame-drops");
		expect(rec).toBeDefined();
		expect(rec?.metric).toBe(MetricType.FRAME_DROPS);
		expect(rec?.suggestion).toContain("windowSize");
	});

	test("slow-tti fires when TTI score is below 75", () => {
		const session = makeSession();
		const score = makeScoreResult([{ type: MetricType.TTI, value: 3.5, score: 35 }]);

		const result = analyzeSession(session, score);
		const rec = result.find((r) => r.id === "slow-tti");
		expect(rec).toBeDefined();
		expect(rec?.severity).toBe("critical");
		expect(rec?.metric).toBe(MetricType.TTI);
		expect(rec?.suggestion).toContain("React.lazy");
	});
});

describe("js-ui-correlation heuristic", () => {
	test("fires when both JS and UI FPS are below threshold", () => {
		const session = makeSession();
		const score = makeScoreResult([
			{ type: MetricType.UI_FPS, value: 48, score: 40 },
			{ type: MetricType.JS_FPS, value: 45, score: 30 },
		]);

		const result = analyzeSession(session, score);
		const rec = result.find((r) => r.id === "js-ui-correlation");
		expect(rec).toBeDefined();
		expect(rec?.severity).toBe("info");
		expect(rec?.suggestion).toContain("MessageQueue");
	});

	test("does NOT fire when only UI FPS is low", () => {
		const session = makeSession();
		const score = makeScoreResult([
			{ type: MetricType.UI_FPS, value: 48, score: 40 },
			{ type: MetricType.JS_FPS, value: 60, score: 100 },
		]);

		const result = analyzeSession(session, score);
		const rec = result.find((r) => r.id === "js-ui-correlation");
		expect(rec).toBeUndefined();
	});

	test("does NOT fire when only JS FPS is low", () => {
		const session = makeSession();
		const score = makeScoreResult([
			{ type: MetricType.UI_FPS, value: 60, score: 100 },
			{ type: MetricType.JS_FPS, value: 45, score: 30 },
		]);

		const result = analyzeSession(session, score);
		const rec = result.find((r) => r.id === "js-ui-correlation");
		expect(rec).toBeUndefined();
	});
});

describe("severity ordering", () => {
	test("critical recommendations come before warning and info", () => {
		const session = makeSession();
		const score = makeScoreResult([
			{ type: MetricType.UI_FPS, value: 48, score: 50 },
			{ type: MetricType.JS_FPS, value: 45, score: 50 },
			{ type: MetricType.CPU, value: 70, score: 10 },
			{ type: MetricType.TTI, value: 4.5, score: 20 },
		]);

		const result = analyzeSession(session, score);
		expect(result.length).toBeGreaterThanOrEqual(3);

		const severities = result.map((r) => r.severity);
		const criticalIdx = severities.indexOf("critical");
		const warningIdx = severities.indexOf("warning");
		const infoIdx = severities.indexOf("info");

		if (criticalIdx !== -1 && warningIdx !== -1) {
			expect(criticalIdx).toBeLessThan(warningIdx);
		}
		if (warningIdx !== -1 && infoIdx !== -1) {
			expect(warningIdx).toBeLessThan(infoIdx);
		}
		if (criticalIdx !== -1 && infoIdx !== -1) {
			expect(criticalIdx).toBeLessThan(infoIdx);
		}
	});

	test("all-poor session produces multiple recommendations", () => {
		const session = makeSession();
		const score = makeScoreResult([
			{ type: MetricType.UI_FPS, value: 30, score: 0 },
			{ type: MetricType.JS_FPS, value: 30, score: 0 },
			{ type: MetricType.CPU, value: 80, score: 0 },
			{ type: MetricType.MEMORY, value: 600, score: 0 },
			{ type: MetricType.FRAME_DROPS, value: 20, score: 0 },
			{ type: MetricType.TTI, value: 5, score: 0 },
		]);

		const result = analyzeSession(session, score);
		// 6 individual heuristics + 1 correlation = 7
		expect(result).toHaveLength(7);
	});
});

describe("builtInHeuristics", () => {
	test("contains 11 heuristics", () => {
		expect(builtInHeuristics).toHaveLength(11);
	});

	test("all heuristics have unique ids", () => {
		const ids = builtInHeuristics.map((h) => h.id);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(ids.length);
	});
});

describe("tier 3 heuristics", () => {
	test("slow-screen-ttid fires on slow screens (> 500ms)", () => {
		const session = makeSession();
		session.navigationTimeline = {
			screens: [
				{ screenName: "HomeScreen", visitedAt: 0, ttid: 120 },
				{ screenName: "ProfileScreen", visitedAt: 1000, ttid: 750 },
			],
			currentScreen: "ProfileScreen",
			totalScreenChanges: 2,
			averageTTID: 435,
			slowestScreen: { screenName: "ProfileScreen", visitedAt: 1000, ttid: 750 },
		};
		const score = makeScoreResult([]);

		const result = analyzeSession(session, score);
		const rec = result.find((r) => r.id === "slow-screen-ttid");
		expect(rec).toBeDefined();
		expect(rec?.severity).toBe("warning");
		expect(rec?.message).toContain("ProfileScreen");
		expect(rec?.suggestion).toContain("React.lazy");
	});

	test("slow-screen-ttid is critical when TTID > 1000ms", () => {
		const session = makeSession();
		session.navigationTimeline = {
			screens: [{ screenName: "SlowScreen", visitedAt: 0, ttid: 1500 }],
			currentScreen: "SlowScreen",
			totalScreenChanges: 1,
			averageTTID: 1500,
			slowestScreen: { screenName: "SlowScreen", visitedAt: 0, ttid: 1500 },
		};
		const score = makeScoreResult([]);

		const result = analyzeSession(session, score);
		const rec = result.find((r) => r.id === "slow-screen-ttid");
		expect(rec).toBeDefined();
		expect(rec?.severity).toBe("critical");
	});

	test("slow-screen-ttid does NOT fire when all screens are fast", () => {
		const session = makeSession();
		session.navigationTimeline = {
			screens: [
				{ screenName: "HomeScreen", visitedAt: 0, ttid: 100 },
				{ screenName: "SettingsScreen", visitedAt: 1000, ttid: 200 },
			],
			currentScreen: "SettingsScreen",
			totalScreenChanges: 2,
			averageTTID: 150,
			slowestScreen: { screenName: "SettingsScreen", visitedAt: 1000, ttid: 200 },
		};
		const score = makeScoreResult([]);

		const result = analyzeSession(session, score);
		const rec = result.find((r) => r.id === "slow-screen-ttid");
		expect(rec).toBeUndefined();
	});

	test("excessive-network fires on many requests (> 10)", () => {
		const session = makeSession();
		session.networkRequests = Array.from({ length: 15 }, (_, i) => ({
			id: `req-${i}`,
			url: `/api/data/${i}`,
			method: "GET",
			startTime: i * 100,
			duration: 200,
			status: 200,
		}));
		const score = makeScoreResult([]);

		const result = analyzeSession(session, score);
		const rec = result.find((r) => r.id === "excessive-network");
		expect(rec).toBeDefined();
		expect(rec?.severity).toBe("warning");
		expect(rec?.message).toContain("15 network requests");
	});

	test("excessive-network fires on slow requests (> 3s)", () => {
		const session = makeSession();
		session.networkRequests = [
			{
				id: "req-1",
				url: "/api/slow",
				method: "POST",
				startTime: 0,
				duration: 4000,
				status: 200,
			},
		];
		const score = makeScoreResult([]);

		const result = analyzeSession(session, score);
		const rec = result.find((r) => r.id === "excessive-network");
		expect(rec).toBeDefined();
		expect(rec?.message).toContain("took > 3s");
	});

	test("excessive-network does NOT fire on few fast requests", () => {
		const session = makeSession();
		session.networkRequests = [
			{ id: "req-1", url: "/api/user", method: "GET", startTime: 0, duration: 200 },
			{ id: "req-2", url: "/api/config", method: "GET", startTime: 100, duration: 150 },
		];
		const score = makeScoreResult([]);

		const result = analyzeSession(session, score);
		const rec = result.find((r) => r.id === "excessive-network");
		expect(rec).toBeUndefined();
	});

	test("high-bridge-traffic fires when callsPerSecond > 50", () => {
		const session = makeSession();
		session.bridgeStats = {
			callsPerSecond: 75,
			totalCalls: 7500,
			topModules: [{ module: "UIManager", count: 120 }],
		};
		const score = makeScoreResult([]);

		const result = analyzeSession(session, score);
		const rec = result.find((r) => r.id === "high-bridge-traffic");
		expect(rec).toBeDefined();
		expect(rec?.severity).toBe("warning");
		expect(rec?.suggestion).toContain("JSI");
	});

	test("high-bridge-traffic is critical when callsPerSecond > 100", () => {
		const session = makeSession();
		session.bridgeStats = {
			callsPerSecond: 150,
			totalCalls: 15000,
			topModules: [],
		};
		const score = makeScoreResult([]);

		const result = analyzeSession(session, score);
		const rec = result.find((r) => r.id === "high-bridge-traffic");
		expect(rec).toBeDefined();
		expect(rec?.severity).toBe("critical");
	});

	test("high-bridge-traffic does NOT fire when callsPerSecond <= 50", () => {
		const session = makeSession();
		session.bridgeStats = {
			callsPerSecond: 30,
			totalCalls: 3000,
			topModules: [],
		};
		const score = makeScoreResult([]);

		const result = analyzeSession(session, score);
		const rec = result.find((r) => r.id === "high-bridge-traffic");
		expect(rec).toBeUndefined();
	});

	test("excessive-layouts fires when component has > 3 layout passes", () => {
		const session = makeSession();
		session.layoutStats = {
			totalLayoutEvents: 20,
			componentsWithExcessiveLayouts: [
				{ name: "FeedItem", count: 7 },
				{ name: "UserCard", count: 5 },
			],
			averageLayoutsPerComponent: 3.5,
		};
		const score = makeScoreResult([]);

		const result = analyzeSession(session, score);
		const rec = result.find((r) => r.id === "excessive-layouts");
		expect(rec).toBeDefined();
		expect(rec?.severity).toBe("warning");
		expect(rec?.message).toContain("FeedItem");
		expect(rec?.suggestion).toContain("StyleSheet.create");
	});

	test("excessive-layouts does NOT fire when all counts <= 3", () => {
		const session = makeSession();
		session.layoutStats = {
			totalLayoutEvents: 5,
			componentsWithExcessiveLayouts: [
				{ name: "Header", count: 2 },
				{ name: "Footer", count: 3 },
			],
			averageLayoutsPerComponent: 1.5,
		};
		const score = makeScoreResult([]);

		const result = analyzeSession(session, score);
		const rec = result.find((r) => r.id === "excessive-layouts");
		expect(rec).toBeUndefined();
	});

	test("tier 3 heuristics do NOT fire when tier 3 data is absent (backward compat)", () => {
		const session = makeSession();
		// No navigationTimeline, networkRequests, bridgeStats, or layoutStats
		const score = makeScoreResult([]);

		const result = analyzeSession(session, score);
		const tier3Ids = [
			"slow-screen-ttid",
			"excessive-network",
			"high-bridge-traffic",
			"excessive-layouts",
		];
		for (const id of tier3Ids) {
			expect(result.find((r) => r.id === id)).toBeUndefined();
		}
	});
});
