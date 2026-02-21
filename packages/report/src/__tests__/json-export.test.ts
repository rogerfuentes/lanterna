import { describe, expect, test } from "bun:test";
import {
	type MeasurementSession,
	MetricType,
	ScoreCategory,
	type ScoreResult,
} from "@lanterna/core";
import { formatJsonReport } from "../json-export";

function makeSession(overrides?: Partial<MeasurementSession>): MeasurementSession {
	return {
		device: {
			id: "emulator-5554",
			name: "Pixel 6",
			platform: "android",
			type: "emulator",
		},
		platform: "android",
		samples: [],
		duration: 10,
		startedAt: 1700000000000,
		...overrides,
	};
}

function makeScore(): ScoreResult {
	return {
		overall: 72,
		category: ScoreCategory.NEEDS_WORK,
		perMetric: [
			{
				type: MetricType.UI_FPS,
				value: 57.3,
				score: 95,
				category: ScoreCategory.GOOD,
				weight: 0.25,
			},
			{
				type: MetricType.JS_FPS,
				value: 48.2,
				score: 62,
				category: ScoreCategory.NEEDS_WORK,
				weight: 0.2,
			},
			{
				type: MetricType.CPU,
				value: 35.1,
				score: 55,
				category: ScoreCategory.NEEDS_WORK,
				weight: 0.15,
			},
			{
				type: MetricType.MEMORY,
				value: 245,
				score: 78,
				category: ScoreCategory.GOOD,
				weight: 0.15,
			},
			{
				type: MetricType.FRAME_DROPS,
				value: 8.2,
				score: 42,
				category: ScoreCategory.POOR,
				weight: 0.15,
			},
			{
				type: MetricType.TTI,
				value: 1.8,
				score: 90,
				category: ScoreCategory.GOOD,
				weight: 0.1,
			},
		],
	};
}

describe("formatJsonReport", () => {
	test("returns correct structure", () => {
		const report = formatJsonReport(makeSession(), makeScore());
		expect(report).toHaveProperty("version");
		expect(report).toHaveProperty("timestamp");
		expect(report).toHaveProperty("device");
		expect(report).toHaveProperty("duration");
		expect(report).toHaveProperty("score");
		expect(report.score).toHaveProperty("overall");
		expect(report.score).toHaveProperty("category");
		expect(report.score).toHaveProperty("metrics");
	});

	test("includes all metric scores", () => {
		const report = formatJsonReport(makeSession(), makeScore());
		expect(report.score.metrics).toHaveLength(6);

		const types = report.score.metrics.map((m) => m.type);
		expect(types).toContain("ui_fps");
		expect(types).toContain("js_fps");
		expect(types).toContain("cpu");
		expect(types).toContain("memory");
		expect(types).toContain("frame_drops");
		expect(types).toContain("tti");
	});

	test("version field is 0.0.1", () => {
		const report = formatJsonReport(makeSession(), makeScore());
		expect(report.version).toBe("0.0.1");
	});

	test("timestamp is a valid ISO string", () => {
		const report = formatJsonReport(makeSession(), makeScore());
		const parsed = new Date(report.timestamp);
		expect(parsed.toISOString()).toBe(report.timestamp);
	});

	test("device info matches session", () => {
		const report = formatJsonReport(makeSession(), makeScore());
		expect(report.device.id).toBe("emulator-5554");
		expect(report.device.name).toBe("Pixel 6");
		expect(report.device.platform).toBe("android");
		expect(report.device.type).toBe("emulator");
	});

	test("duration matches session", () => {
		const report = formatJsonReport(makeSession(), makeScore());
		expect(report.duration).toBe(10);
	});

	test("overall score matches", () => {
		const report = formatJsonReport(makeSession(), makeScore());
		expect(report.score.overall).toBe(72);
		expect(report.score.category).toBe("needs_work");
	});

	test("metric values are correct", () => {
		const report = formatJsonReport(makeSession(), makeScore());
		const uiFps = report.score.metrics.find((m) => m.type === "ui_fps");
		expect(uiFps).toBeDefined();
		expect(uiFps?.value).toBe(57.3);
		expect(uiFps?.score).toBe(95);
		expect(uiFps?.category).toBe("good");
	});

	test("includes navigation when present in session", () => {
		const session = makeSession({
			navigationTimeline: {
				screens: [{ screenName: "HomeScreen", visitedAt: 0, ttid: 120 }],
				currentScreen: "HomeScreen",
				totalScreenChanges: 1,
				averageTTID: 120,
				slowestScreen: { screenName: "HomeScreen", visitedAt: 0, ttid: 120 },
			},
		});
		const report = formatJsonReport(session, makeScore());
		expect(report.navigation).toBeDefined();
		expect(report.navigation?.screens).toHaveLength(1);
		expect(report.navigation?.screens[0].screenName).toBe("HomeScreen");
	});

	test("includes network when present in session", () => {
		const session = makeSession({
			networkRequests: [
				{
					id: "req-1",
					url: "/api/user",
					method: "GET",
					startTime: 0,
					duration: 250,
					status: 200,
				},
			],
		});
		const report = formatJsonReport(session, makeScore());
		expect(report.network).toBeDefined();
		expect(report.network).toHaveLength(1);
		expect(report.network?.[0].url).toBe("/api/user");
	});

	test("excludes navigation when not present", () => {
		const report = formatJsonReport(makeSession(), makeScore());
		expect(report.navigation).toBeUndefined();
	});

	test("excludes network when not present", () => {
		const report = formatJsonReport(makeSession(), makeScore());
		expect(report.network).toBeUndefined();
	});

	test("excludes bridge when not present", () => {
		const report = formatJsonReport(makeSession(), makeScore());
		expect(report.bridge).toBeUndefined();
	});

	test("excludes layout when not present", () => {
		const report = formatJsonReport(makeSession(), makeScore());
		expect(report.layout).toBeUndefined();
	});

	test("includes bridge when present", () => {
		const session = makeSession({
			bridgeStats: {
				callsPerSecond: 45,
				totalCalls: 4500,
				topModules: [{ module: "UIManager", count: 120 }],
			},
		});
		const report = formatJsonReport(session, makeScore());
		expect(report.bridge).toBeDefined();
		expect(report.bridge?.callsPerSecond).toBe(45);
	});

	test("includes layout when present", () => {
		const session = makeSession({
			layoutStats: {
				totalLayoutEvents: 20,
				componentsWithExcessiveLayouts: [{ name: "FeedItem", count: 7 }],
				averageLayoutsPerComponent: 3.5,
			},
		});
		const report = formatJsonReport(session, makeScore());
		expect(report.layout).toBeDefined();
		expect(report.layout?.totalLayoutEvents).toBe(20);
	});
});
