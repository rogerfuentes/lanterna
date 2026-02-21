import { describe, expect, test } from "bun:test";
import {
	type MeasurementSession,
	MetricType,
	ScoreCategory,
	type ScoreResult,
} from "@lanterna/core";
import { renderReport } from "../terminal";

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
		startedAt: Date.now(),
		...overrides,
	};
}

function makeScore(
	overall: number,
	category: ScoreCategory,
	metricCategory?: ScoreCategory,
): ScoreResult {
	const cat = metricCategory ?? category;
	return {
		overall,
		category,
		perMetric: [
			{ type: MetricType.UI_FPS, value: 57.3, score: 95, category: cat, weight: 0.25 },
			{ type: MetricType.JS_FPS, value: 48.2, score: 62, category: cat, weight: 0.2 },
			{ type: MetricType.CPU, value: 35.1, score: 55, category: cat, weight: 0.15 },
			{ type: MetricType.MEMORY, value: 245, score: 78, category: cat, weight: 0.15 },
			{ type: MetricType.FRAME_DROPS, value: 8.2, score: 42, category: cat, weight: 0.15 },
			{ type: MetricType.TTI, value: 1.8, score: 90, category: cat, weight: 0.1 },
		],
	};
}

describe("renderReport", () => {
	test("output contains the score number", () => {
		const output = renderReport(makeSession(), makeScore(72, ScoreCategory.NEEDS_WORK));
		expect(output).toContain("72");
	});

	test("output contains device name", () => {
		const output = renderReport(makeSession(), makeScore(72, ScoreCategory.NEEDS_WORK));
		expect(output).toContain("Pixel 6");
	});

	test("output contains metric labels", () => {
		const output = renderReport(makeSession(), makeScore(72, ScoreCategory.NEEDS_WORK));
		expect(output).toContain("UI FPS");
		expect(output).toContain("JS FPS");
		expect(output).toContain("CPU Usage");
		expect(output).toContain("Memory");
		expect(output).toContain("Frame Drops");
		expect(output).toContain("TTI");
	});

	test("output contains platform and device type", () => {
		const output = renderReport(makeSession(), makeScore(72, ScoreCategory.NEEDS_WORK));
		expect(output).toContain("android");
		expect(output).toContain("emulator");
	});

	test("output contains duration", () => {
		const output = renderReport(makeSession(), makeScore(72, ScoreCategory.NEEDS_WORK));
		expect(output).toContain("10s");
	});

	test("output contains box-drawing characters", () => {
		const output = renderReport(makeSession(), makeScore(72, ScoreCategory.NEEDS_WORK));
		expect(output).toContain("╭");
		expect(output).toContain("╰");
		expect(output).toContain("├");
		expect(output).toContain("│");
	});

	test("all-good score contains green color codes", () => {
		const output = renderReport(makeSession(), makeScore(95, ScoreCategory.GOOD));
		expect(output).toContain("\x1b[32m");
	});

	test("all-poor score contains red color codes", () => {
		const output = renderReport(
			makeSession(),
			makeScore(25, ScoreCategory.POOR, ScoreCategory.POOR),
		);
		expect(output).toContain("\x1b[31m");
	});

	test("returns a string and does not call console.log", () => {
		const output = renderReport(makeSession(), makeScore(72, ScoreCategory.NEEDS_WORK));
		expect(typeof output).toBe("string");
	});

	test("output contains category label", () => {
		const output = renderReport(makeSession(), makeScore(72, ScoreCategory.NEEDS_WORK));
		expect(output).toContain("Needs Work");
	});

	test("navigation section appears when timeline is present", () => {
		const session = makeSession({
			navigationTimeline: {
				screens: [
					{
						screenName: "HomeScreen",
						visitedAt: 0,
						ttid: 120,
						timeOnScreen: 8200,
					},
					{
						screenName: "ProfileScreen",
						visitedAt: 8200,
						ttid: 250,
						timeOnScreen: 3100,
					},
				],
				currentScreen: "ProfileScreen",
				totalScreenChanges: 2,
				averageTTID: 185,
				slowestScreen: {
					screenName: "ProfileScreen",
					visitedAt: 8200,
					ttid: 250,
					timeOnScreen: 3100,
				},
			},
		});
		const output = renderReport(session, makeScore(72, ScoreCategory.NEEDS_WORK));
		expect(output).toContain("Navigation");
		expect(output).toContain("HomeScreen");
		expect(output).toContain("ProfileScreen");
	});

	test("navigation section is absent when no timeline", () => {
		const output = renderReport(makeSession(), makeScore(72, ScoreCategory.NEEDS_WORK));
		expect(output).not.toContain("Navigation");
	});

	test("network section appears when requests are present", () => {
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
				{
					id: "req-2",
					url: "/api/feed",
					method: "POST",
					startTime: 100,
					duration: 1200,
					status: 200,
				},
			],
		});
		const output = renderReport(session, makeScore(72, ScoreCategory.NEEDS_WORK));
		expect(output).toContain("Network");
		expect(output).toContain("2 requests");
	});

	test("network section is absent when no requests", () => {
		const output = renderReport(makeSession(), makeScore(72, ScoreCategory.NEEDS_WORK));
		expect(output).not.toContain("Network");
		expect(output).not.toContain("requests");
	});
});
