import { describe, expect, test } from "bun:test";
import type { MetricScore, ScoreResult } from "@lanternajs/core";
import { compareScores, MetricType, ScoreCategory } from "@lanternajs/core";
import { renderComparison } from "../comparison";

function makeScore(
	overall: number,
	metrics: Partial<Record<MetricType, { value: number; score: number }>>,
): ScoreResult {
	const perMetric: MetricScore[] = Object.entries(metrics).map(([type, m]) => ({
		type: type as MetricType,
		value: m.value,
		score: m.score,
		category:
			m.score >= 75
				? ScoreCategory.GOOD
				: m.score >= 40
					? ScoreCategory.NEEDS_WORK
					: ScoreCategory.POOR,
		weight: 0.2,
	}));
	return {
		overall,
		category:
			overall >= 75
				? ScoreCategory.GOOD
				: overall >= 40
					? ScoreCategory.NEEDS_WORK
					: ScoreCategory.POOR,
		perMetric,
	};
}

describe("renderComparison", () => {
	test("shows overall score delta", () => {
		const baseline = makeScore(80, {
			[MetricType.CPU]: { value: 25, score: 80 },
		});
		const current = makeScore(60, {
			[MetricType.CPU]: { value: 45, score: 50 },
		});
		const comparison = compareScores(baseline, current);
		const output = renderComparison(baseline, current, comparison);

		expect(output).toContain("80");
		expect(output).toContain("60");
		expect(output).toContain("-20");
	});

	test("shows regression warning", () => {
		const baseline = makeScore(80, {
			[MetricType.CPU]: { value: 25, score: 80 },
		});
		const current = makeScore(40, {
			[MetricType.CPU]: { value: 65, score: 0 },
		});
		const comparison = compareScores(baseline, current);
		const output = renderComparison(baseline, current, comparison);

		expect(output).toContain("regression");
	});

	test("shows no regressions message", () => {
		const baseline = makeScore(80, {
			[MetricType.CPU]: { value: 25, score: 80 },
		});
		const current = makeScore(85, {
			[MetricType.CPU]: { value: 20, score: 90 },
		});
		const comparison = compareScores(baseline, current);
		const output = renderComparison(baseline, current, comparison);

		expect(output).toContain("No regressions");
	});

	test("shows per-metric delta values", () => {
		const baseline = makeScore(70, {
			[MetricType.CPU]: { value: 35, score: 70 },
			[MetricType.MEMORY]: { value: 300, score: 75 },
		});
		const current = makeScore(55, {
			[MetricType.CPU]: { value: 50, score: 40 },
			[MetricType.MEMORY]: { value: 280, score: 80 },
		});
		const comparison = compareScores(baseline, current);
		const output = renderComparison(baseline, current, comparison);

		expect(output).toContain("CPU Usage");
		expect(output).toContain("Memory");
	});

	test("includes box drawing characters", () => {
		const baseline = makeScore(80, {
			[MetricType.CPU]: { value: 25, score: 80 },
		});
		const current = makeScore(80, {
			[MetricType.CPU]: { value: 25, score: 80 },
		});
		const comparison = compareScores(baseline, current);
		const output = renderComparison(baseline, current, comparison);

		expect(output).toContain("╭");
		expect(output).toContain("╰");
		expect(output).toContain("├");
	});
});
