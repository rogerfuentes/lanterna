import { METRIC_THRESHOLDS, METRIC_WEIGHTS, type MetricThreshold } from "./thresholds";
import {
	type MeasurementSession,
	type MetricScore,
	MetricType,
	ScoreCategory,
	type ScoreResult,
} from "./types";

/**
 * Score a single metric value on a 0-100 scale.
 * Uses linear interpolation between thresholds.
 */
export function scoreMetric(type: MetricType, value: number): number {
	const threshold = METRIC_THRESHOLDS[type];
	return interpolateScore(value, threshold);
}

function interpolateScore(value: number, threshold: MetricThreshold): number {
	const { good, poor, higherIsBetter } = threshold;

	if (higherIsBetter) {
		if (value >= good) return 100;
		if (value <= poor) return 0;
		return ((value - poor) / (good - poor)) * 100;
	}

	if (value <= good) return 100;
	if (value >= poor) return 0;
	return ((poor - value) / (poor - good)) * 100;
}

function categorize(score: number): ScoreCategory {
	if (score >= 75) return ScoreCategory.GOOD;
	if (score >= 40) return ScoreCategory.NEEDS_WORK;
	return ScoreCategory.POOR;
}

/**
 * Aggregate samples by metric type, returning the average value for each.
 */
function aggregateSamples(
	samples: MeasurementSession["samples"],
): Partial<Record<MetricType, number>> {
	const sums: Partial<Record<MetricType, { total: number; count: number }>> = {};

	for (const sample of samples) {
		const entry = sums[sample.type] ?? { total: 0, count: 0 };
		entry.total += sample.value;
		entry.count += 1;
		sums[sample.type] = entry;
	}

	const result: Partial<Record<MetricType, number>> = {};
	for (const [type, entry] of Object.entries(sums)) {
		if (entry) {
			result[type as MetricType] = entry.total / entry.count;
		}
	}
	return result;
}

/**
 * Calculate the overall performance score for a measurement session.
 */
export function calculateScore(session: MeasurementSession): ScoreResult {
	const averages = aggregateSamples(session.samples);
	const perMetric: MetricScore[] = [];
	let weightedSum = 0;
	let totalWeight = 0;

	for (const type of Object.values(MetricType)) {
		const avg = averages[type];
		if (avg === undefined) continue;

		const score = scoreMetric(type, avg);
		const weight = METRIC_WEIGHTS[type];

		perMetric.push({
			type,
			value: avg,
			score: Math.round(score),
			category: categorize(score),
			weight,
		});

		weightedSum += score * weight;
		totalWeight += weight;
	}

	const overall = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

	return {
		overall,
		category: categorize(overall),
		perMetric,
	};
}
