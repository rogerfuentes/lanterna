import { describe, expect, test } from "bun:test";
import { compareScores } from "../comparison";
import type { MetricScore, ScoreResult } from "../types";
import { MetricType, ScoreCategory } from "../types";

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

describe("compareScores", () => {
	test("detects regression when score drops beyond threshold", () => {
		const baseline = makeScore(80, {
			[MetricType.CPU]: { value: 25, score: 80 },
			[MetricType.MEMORY]: { value: 250, score: 75 },
		});
		const current = makeScore(55, {
			[MetricType.CPU]: { value: 50, score: 40 },
			[MetricType.MEMORY]: { value: 250, score: 75 },
		});

		const result = compareScores(baseline, current);
		expect(result.hasRegression).toBe(true);
		expect(result.regressionCount).toBe(1);
		expect(result.overallDelta).toBe(-25);

		const cpuDelta = result.deltas.find((d) => d.type === MetricType.CPU);
		expect(cpuDelta?.status).toBe("regressed");
		expect(cpuDelta?.delta).toBe(-40);
	});

	test("detects improvement when score increases beyond threshold", () => {
		const baseline = makeScore(60, {
			[MetricType.UI_FPS]: { value: 50, score: 50 },
		});
		const current = makeScore(85, {
			[MetricType.UI_FPS]: { value: 60, score: 100 },
		});

		const result = compareScores(baseline, current);
		expect(result.hasRegression).toBe(false);
		const fpsDelta = result.deltas.find((d) => d.type === MetricType.UI_FPS);
		expect(fpsDelta?.status).toBe("improved");
		expect(fpsDelta?.delta).toBe(50);
	});

	test("marks unchanged when delta within threshold", () => {
		const baseline = makeScore(80, {
			[MetricType.CPU]: { value: 30, score: 80 },
		});
		const current = makeScore(78, {
			[MetricType.CPU]: { value: 32, score: 75 },
		});

		const result = compareScores(baseline, current);
		expect(result.hasRegression).toBe(false);
		expect(result.deltas[0].status).toBe("unchanged");
	});

	test("respects custom threshold", () => {
		const baseline = makeScore(80, {
			[MetricType.CPU]: { value: 30, score: 80 },
		});
		const current = makeScore(73, {
			[MetricType.CPU]: { value: 38, score: 73 },
		});

		// Default threshold (10) → unchanged
		expect(compareScores(baseline, current).deltas[0].status).toBe("unchanged");
		// Strict threshold (5) → regressed
		expect(compareScores(baseline, current, 5).deltas[0].status).toBe("regressed");
	});

	test("handles empty metrics", () => {
		const baseline = makeScore(0, {});
		const current = makeScore(0, {});
		const result = compareScores(baseline, current);
		expect(result.deltas).toHaveLength(0);
		expect(result.hasRegression).toBe(false);
	});

	test("skips metrics only in one side", () => {
		const baseline = makeScore(80, {
			[MetricType.CPU]: { value: 30, score: 80 },
		});
		const current = makeScore(90, {
			[MetricType.MEMORY]: { value: 200, score: 90 },
		});

		const result = compareScores(baseline, current);
		expect(result.deltas).toHaveLength(0);
	});

	test("counts multiple regressions", () => {
		const baseline = makeScore(80, {
			[MetricType.CPU]: { value: 25, score: 80 },
			[MetricType.MEMORY]: { value: 200, score: 85 },
			[MetricType.UI_FPS]: { value: 58, score: 90 },
		});
		const current = makeScore(40, {
			[MetricType.CPU]: { value: 70, score: 0 },
			[MetricType.MEMORY]: { value: 550, score: 0 },
			[MetricType.UI_FPS]: { value: 58, score: 90 },
		});

		const result = compareScores(baseline, current);
		expect(result.regressionCount).toBe(2);
		expect(result.hasRegression).toBe(true);
	});
});
