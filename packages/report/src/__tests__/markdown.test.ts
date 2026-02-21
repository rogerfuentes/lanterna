import { describe, expect, test } from "bun:test";
import {
	type ComparisonResult,
	type MeasurementSession,
	MetricType,
	ScoreCategory,
	type ScoreResult,
} from "@lanterna/core";
import { formatMarkdownReport } from "../markdown";

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

function makeComparison(overrides?: Partial<ComparisonResult>): ComparisonResult {
	return {
		overallDelta: -10,
		hasRegression: true,
		regressionCount: 1,
		deltas: [
			{
				type: MetricType.CPU,
				previous: 32,
				current: 45,
				delta: -25,
				percentChange: -31.25,
				previousScore: 80,
				currentScore: 55,
				status: "regressed",
			},
			{
				type: MetricType.MEMORY,
				previous: 200,
				current: 245,
				delta: 3,
				percentChange: 3.75,
				previousScore: 75,
				currentScore: 78,
				status: "unchanged",
			},
		],
		...overrides,
	};
}

describe("formatMarkdownReport", () => {
	test("output contains score", () => {
		const output = formatMarkdownReport(makeScore(72, ScoreCategory.NEEDS_WORK));
		expect(output).toContain("72 / 100");
	});

	test("output contains metric table with all 6 metric types", () => {
		const output = formatMarkdownReport(makeScore(72, ScoreCategory.NEEDS_WORK));
		expect(output).toContain("UI FPS");
		expect(output).toContain("JS FPS");
		expect(output).toContain("CPU Usage");
		expect(output).toContain("Memory");
		expect(output).toContain("Frame Drops");
		expect(output).toContain("TTI");
	});

	test("status emojis match categories", () => {
		const goodScore = makeScore(95, ScoreCategory.GOOD, ScoreCategory.GOOD);
		const goodOutput = formatMarkdownReport(goodScore);
		expect(goodOutput).toContain("\u{1F7E2}");

		const needsWorkScore = makeScore(60, ScoreCategory.NEEDS_WORK, ScoreCategory.NEEDS_WORK);
		const needsWorkOutput = formatMarkdownReport(needsWorkScore);
		expect(needsWorkOutput).toContain("\u{1F7E1}");

		const poorScore = makeScore(20, ScoreCategory.POOR, ScoreCategory.POOR);
		const poorOutput = formatMarkdownReport(poorScore);
		expect(poorOutput).toContain("\u{1F534}");
	});

	test("comparison section appears when comparison is provided", () => {
		const output = formatMarkdownReport(makeScore(72, ScoreCategory.NEEDS_WORK), makeComparison());
		expect(output).toContain("### Comparison (vs baseline)");
		expect(output).toContain("Previous");
		expect(output).toContain("Current");
		expect(output).toContain("Delta");
	});

	test("comparison section is absent when comparison is not provided", () => {
		const output = formatMarkdownReport(makeScore(72, ScoreCategory.NEEDS_WORK));
		expect(output).not.toContain("### Comparison");
		expect(output).not.toContain("Previous");
	});

	test("regression warning appears", () => {
		const output = formatMarkdownReport(
			makeScore(72, ScoreCategory.NEEDS_WORK),
			makeComparison({ hasRegression: true, regressionCount: 1 }),
		);
		expect(output).toContain("1 regression detected");
	});

	test("no regressions message when comparison has no regressions", () => {
		const output = formatMarkdownReport(
			makeScore(85, ScoreCategory.GOOD),
			makeComparison({
				hasRegression: false,
				regressionCount: 0,
				deltas: [
					{
						type: MetricType.CPU,
						previous: 32,
						current: 25,
						delta: 10,
						percentChange: 12.5,
						previousScore: 70,
						currentScore: 80,
						status: "improved",
					},
				],
			}),
		);
		expect(output).toContain("No regressions detected");
		expect(output).not.toContain("regression detected**");
	});

	test("footer contains Lanterna", () => {
		const output = formatMarkdownReport(makeScore(72, ScoreCategory.NEEDS_WORK));
		expect(output).toContain("Lanterna");
	});

	test("output contains formatted metric values", () => {
		const output = formatMarkdownReport(makeScore(72, ScoreCategory.NEEDS_WORK));
		expect(output).toContain("57.3 fps");
		expect(output).toContain("48.2 fps");
		expect(output).toContain("35.1%");
		expect(output).toContain("245 MB");
		expect(output).toContain("8.2%");
		expect(output).toContain("1.8s");
	});

	test("plural regressions message for multiple regressions", () => {
		const output = formatMarkdownReport(
			makeScore(50, ScoreCategory.NEEDS_WORK),
			makeComparison({ hasRegression: true, regressionCount: 3 }),
		);
		expect(output).toContain("3 regressions detected");
	});
});

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

describe("formatMarkdownReport with navigation", () => {
	test("per-screen table appears when navigation data is present", () => {
		const session = makeSession({
			navigationTimeline: {
				screens: [
					{
						screenName: "HomeScreen",
						visitedAt: 0,
						ttid: 120,
						renderDuration: 45,
						timeOnScreen: 8200,
					},
					{
						screenName: "ProfileScreen",
						visitedAt: 8200,
						ttid: 250,
						renderDuration: 80,
						timeOnScreen: 3100,
					},
				],
				currentScreen: "ProfileScreen",
				totalScreenChanges: 2,
				averageTTID: 185,
				slowestScreen: null,
			},
		});
		const output = formatMarkdownReport(
			makeScore(72, ScoreCategory.NEEDS_WORK),
			undefined,
			session,
		);
		expect(output).toContain("### Navigation Timeline");
		expect(output).toContain("HomeScreen");
		expect(output).toContain("ProfileScreen");
		expect(output).toContain("120ms");
		expect(output).toContain("8.2s");
	});

	test("no per-screen table when navigation data is absent", () => {
		const session = makeSession();
		const output = formatMarkdownReport(
			makeScore(72, ScoreCategory.NEEDS_WORK),
			undefined,
			session,
		);
		expect(output).not.toContain("### Navigation Timeline");
	});

	test("no per-screen table when no session is provided", () => {
		const output = formatMarkdownReport(makeScore(72, ScoreCategory.NEEDS_WORK));
		expect(output).not.toContain("### Navigation Timeline");
	});

	test("network summary appears when network data is present", () => {
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
					duration: 4000,
					status: 200,
				},
			],
		});
		const output = formatMarkdownReport(
			makeScore(72, ScoreCategory.NEEDS_WORK),
			undefined,
			session,
		);
		expect(output).toContain("### Network Summary");
		expect(output).toContain("2 requests");
		expect(output).toContain("slow request");
	});

	test("network summary absent when no network data", () => {
		const session = makeSession();
		const output = formatMarkdownReport(
			makeScore(72, ScoreCategory.NEEDS_WORK),
			undefined,
			session,
		);
		expect(output).not.toContain("### Network Summary");
	});
});
