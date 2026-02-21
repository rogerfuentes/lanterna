import type { MetricScore, MetricType, ScoreResult } from "./types";

export type DeltaStatus = "improved" | "regressed" | "unchanged";

export interface MetricDelta {
	type: MetricType;
	previous: number;
	current: number;
	delta: number;
	percentChange: number;
	previousScore: number;
	currentScore: number;
	status: DeltaStatus;
}

export interface ComparisonResult {
	overallDelta: number;
	deltas: MetricDelta[];
	hasRegression: boolean;
	regressionCount: number;
}

const DEFAULT_THRESHOLD = 10;

function computeDelta(baseline: MetricScore, current: MetricScore, threshold: number): MetricDelta {
	const delta = current.score - baseline.score;
	const percentChange = baseline.score === 0 ? 0 : (delta / baseline.score) * 100;

	let status: DeltaStatus = "unchanged";
	if (delta < -threshold) {
		status = "regressed";
	} else if (delta > threshold) {
		status = "improved";
	}

	return {
		type: baseline.type,
		previous: baseline.value,
		current: current.value,
		delta,
		percentChange,
		previousScore: baseline.score,
		currentScore: current.score,
		status,
	};
}

/**
 * Compare two score results and detect regressions.
 * Threshold is the minimum score-point drop to count as a regression (default: 10).
 */
export function compareScores(
	baseline: ScoreResult,
	current: ScoreResult,
	threshold = DEFAULT_THRESHOLD,
): ComparisonResult {
	const baselineMap = new Map<MetricType, MetricScore>();
	for (const m of baseline.perMetric) {
		baselineMap.set(m.type, m);
	}

	const deltas: MetricDelta[] = [];

	for (const currentMetric of current.perMetric) {
		const baselineMetric = baselineMap.get(currentMetric.type);
		if (!baselineMetric) continue;
		deltas.push(computeDelta(baselineMetric, currentMetric, threshold));
	}

	const regressionCount = deltas.filter((d) => d.status === "regressed").length;

	return {
		overallDelta: current.overall - baseline.overall,
		deltas,
		hasRegression: regressionCount > 0,
		regressionCount,
	};
}
