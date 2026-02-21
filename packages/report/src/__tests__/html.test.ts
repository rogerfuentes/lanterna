import { describe, expect, test } from "bun:test";
import {
	type ComparisonResult,
	type MeasurementSession,
	type MetricSample,
	MetricType,
	ScoreCategory,
	type ScoreResult,
} from "@lanterna/core";
import { renderHtmlReport } from "../html";

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

function makeScore(overall = 72, category: ScoreCategory = ScoreCategory.NEEDS_WORK): ScoreResult {
	return {
		overall,
		category,
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

function makeSamples(): MetricSample[] {
	const types = [
		MetricType.UI_FPS,
		MetricType.JS_FPS,
		MetricType.CPU,
		MetricType.MEMORY,
		MetricType.FRAME_DROPS,
		MetricType.TTI,
	];
	const samples: MetricSample[] = [];
	for (const type of types) {
		for (let i = 0; i < 5; i++) {
			samples.push({
				type,
				value: 50 + i * 5,
				timestamp: 1700000000000 + i * 2000,
				unit: "fps",
			});
		}
	}
	return samples;
}

function makeComparison(): ComparisonResult {
	return {
		overallDelta: -8,
		deltas: [
			{
				type: MetricType.UI_FPS,
				previous: 59.0,
				current: 57.3,
				delta: -5,
				percentChange: -5.3,
				previousScore: 100,
				currentScore: 95,
				status: "unchanged",
			},
			{
				type: MetricType.JS_FPS,
				previous: 55.0,
				current: 48.2,
				delta: -18,
				percentChange: -22.5,
				previousScore: 80,
				currentScore: 62,
				status: "regressed",
			},
			{
				type: MetricType.CPU,
				previous: 30.0,
				current: 35.1,
				delta: -10,
				percentChange: -15.4,
				previousScore: 65,
				currentScore: 55,
				status: "unchanged",
			},
			{
				type: MetricType.MEMORY,
				previous: 200,
				current: 245,
				delta: 3,
				percentChange: 4.0,
				previousScore: 75,
				currentScore: 78,
				status: "unchanged",
			},
			{
				type: MetricType.FRAME_DROPS,
				previous: 5.0,
				current: 8.2,
				delta: -15,
				percentChange: -26.3,
				previousScore: 57,
				currentScore: 42,
				status: "regressed",
			},
			{
				type: MetricType.TTI,
				previous: 1.5,
				current: 1.8,
				delta: 5,
				percentChange: 5.6,
				previousScore: 85,
				currentScore: 90,
				status: "unchanged",
			},
		],
		hasRegression: true,
		regressionCount: 2,
	};
}

describe("renderHtmlReport", () => {
	test("returns a string starting with <!DOCTYPE html>", () => {
		const html = renderHtmlReport(makeSession(), makeScore());
		expect(html.trimStart().startsWith("<!DOCTYPE html>")).toBe(true);
	});

	test("contains the overall score", () => {
		const html = renderHtmlReport(makeSession(), makeScore(72));
		expect(html).toContain("72");
	});

	test("all 6 metric types are represented", () => {
		const html = renderHtmlReport(makeSession(), makeScore());
		expect(html).toContain("UI FPS");
		expect(html).toContain("JS FPS");
		expect(html).toContain("CPU Usage");
		expect(html).toContain("Memory");
		expect(html).toContain("Frame Drops");
		expect(html).toContain("TTI");
	});

	test("device info is included", () => {
		const html = renderHtmlReport(makeSession(), makeScore());
		expect(html).toContain("Pixel 6");
		expect(html).toContain("android");
		expect(html).toContain("emulator");
	});

	test("contains duration", () => {
		const html = renderHtmlReport(makeSession(), makeScore());
		expect(html).toContain("10s");
	});

	test("no external URLs or CDN references", () => {
		const html = renderHtmlReport(makeSession(), makeScore());
		expect(html).not.toMatch(/https?:\/\//);
	});

	test("SVG gauge is rendered with correct score", () => {
		const html = renderHtmlReport(makeSession(), makeScore(85));
		expect(html).toContain("<svg viewBox");
		expect(html).toContain("85");
	});

	test("contains inlined CSS", () => {
		const html = renderHtmlReport(makeSession(), makeScore());
		expect(html).toContain("<style>");
		expect(html).toContain("--good: #0cce6b");
		expect(html).toContain("--needs-work: #ffa400");
		expect(html).toContain("--poor: #ff4e42");
	});

	test("contains inlined JavaScript", () => {
		const html = renderHtmlReport(makeSession(), makeScore());
		expect(html).toContain("<script>");
		expect(html).toContain("addEventListener");
	});

	test("contains category label", () => {
		const html = renderHtmlReport(makeSession(), makeScore());
		expect(html).toContain("Needs Work");
	});

	test("contains metric values", () => {
		const html = renderHtmlReport(makeSession(), makeScore());
		expect(html).toContain("57.3 fps");
		expect(html).toContain("245 MB");
		expect(html).toContain("1.8s");
	});

	test("score bars are rendered for each metric", () => {
		const html = renderHtmlReport(makeSession(), makeScore());
		expect(html).toContain("score-bar-fill");
		expect(html).toContain("width:95%");
		expect(html).toContain("width:42%");
	});

	test("generates valid HTML structure", () => {
		const html = renderHtmlReport(makeSession(), makeScore());
		expect(html).toContain("<html");
		expect(html).toContain("</html>");
		expect(html).toContain("<head>");
		expect(html).toContain("</head>");
		expect(html).toContain("<body>");
		expect(html).toContain("</body>");
	});

	test("contains report title", () => {
		const html = renderHtmlReport(makeSession(), makeScore());
		expect(html).toContain("Lanterna Performance Report");
	});

	test("contains generation timestamp", () => {
		const html = renderHtmlReport(makeSession(), makeScore());
		expect(html).toContain("Generated");
		expect(html).toContain("2023-11-14");
	});

	test("supports dark mode via prefers-color-scheme", () => {
		const html = renderHtmlReport(makeSession(), makeScore());
		expect(html).toContain("prefers-color-scheme: dark");
	});

	test("renders sparkline SVG when samples are provided", () => {
		const session = makeSession({ samples: makeSamples() });
		const html = renderHtmlReport(session, makeScore());
		expect(html).toContain("polyline");
		expect(html).toContain("samples collected");
	});

	test("shows no sample data message when no samples", () => {
		const html = renderHtmlReport(makeSession(), makeScore());
		expect(html).toContain("No sample data");
	});
});

describe("renderHtmlReport with comparison", () => {
	test("renders comparison section when provided", () => {
		const html = renderHtmlReport(makeSession(), makeScore(), makeComparison());
		expect(html).toContain("Comparison");
		expect(html).toContain("comparison-section");
	});

	test("shows regression banner when regressions exist", () => {
		const html = renderHtmlReport(makeSession(), makeScore(), makeComparison());
		expect(html).toContain("2 regressions detected");
		expect(html).toContain("has-regression");
	});

	test("shows no regression banner when none exist", () => {
		const comparison: ComparisonResult = {
			overallDelta: 5,
			deltas: [],
			hasRegression: false,
			regressionCount: 0,
		};
		const html = renderHtmlReport(makeSession(), makeScore(), comparison);
		expect(html).toContain("No regressions detected");
		expect(html).toContain("no-regression");
	});

	test("renders delta values for each metric", () => {
		const html = renderHtmlReport(makeSession(), makeScore(), makeComparison());
		expect(html).toContain("59.0 fps");
		expect(html).toContain("57.3 fps");
		expect(html).toContain("&rarr;");
	});

	test("does not render comparison when not provided", () => {
		const html = renderHtmlReport(makeSession(), makeScore());
		expect(html).not.toContain('class="comparison-section"');
		expect(html).not.toContain('class="delta-card"');
		expect(html).not.toContain("regressions detected");
	});
});

describe("renderHtmlReport score categories", () => {
	test("good score uses green color variable", () => {
		const html = renderHtmlReport(makeSession(), makeScore(90, ScoreCategory.GOOD));
		expect(html).toContain("var(--good)");
	});

	test("poor score uses red color variable", () => {
		const html = renderHtmlReport(makeSession(), makeScore(25, ScoreCategory.POOR));
		expect(html).toContain("var(--poor)");
	});
});
