import { MetricType, ScoreCategory } from "@lanternajs/core";

export const RESET = "\x1b[0m";
export const BOLD = "\x1b[1m";
export const DIM = "\x1b[2m";

export function colorByCategory(category: ScoreCategory): string {
	switch (category) {
		case ScoreCategory.GOOD:
			return "\x1b[32m";
		case ScoreCategory.NEEDS_WORK:
			return "\x1b[33m";
		case ScoreCategory.POOR:
			return "\x1b[31m";
	}
}

export function formatMetricValue(type: MetricType, value: number): string {
	switch (type) {
		case MetricType.UI_FPS:
		case MetricType.JS_FPS:
			return `${value.toFixed(1)} fps`;
		case MetricType.CPU:
		case MetricType.FRAME_DROPS:
			return `${value.toFixed(1)}%`;
		case MetricType.MEMORY:
			return `${Math.round(value)} MB`;
		case MetricType.TTI:
			return `${value.toFixed(1)}s`;
	}
}

export function metricLabel(type: MetricType): string {
	switch (type) {
		case MetricType.UI_FPS:
			return "UI FPS";
		case MetricType.JS_FPS:
			return "JS FPS";
		case MetricType.CPU:
			return "CPU Usage";
		case MetricType.MEMORY:
			return "Memory";
		case MetricType.FRAME_DROPS:
			return "Frame Drops";
		case MetricType.TTI:
			return "TTI";
	}
}

export function categoryLabel(category: ScoreCategory): string {
	switch (category) {
		case ScoreCategory.GOOD:
			return "Good";
		case ScoreCategory.NEEDS_WORK:
			return "Needs Work";
		case ScoreCategory.POOR:
			return "Poor";
	}
}

export function scoreBar(score: number, width = 20): string {
	const clamped = Math.max(0, Math.min(100, score));
	const filled = Math.round((clamped / 100) * width);
	const empty = width - filled;
	return "█".repeat(filled) + "░".repeat(empty);
}
