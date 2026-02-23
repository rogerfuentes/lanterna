import type { ComparisonResult, MetricDelta, ScoreResult } from "@lanternajs/core";
import { BOLD, colorByCategory, DIM, formatMetricValue, metricLabel, RESET } from "./format";

function deltaArrow(delta: MetricDelta): string {
	if (delta.status === "improved") return "\x1b[32m▲\x1b[0m";
	if (delta.status === "regressed") return "\x1b[31m▼\x1b[0m";
	return "\x1b[90m─\x1b[0m";
}

function deltaColor(delta: MetricDelta): string {
	if (delta.status === "improved") return "\x1b[32m";
	if (delta.status === "regressed") return "\x1b[31m";
	return "\x1b[90m";
}

function formatDelta(delta: number): string {
	const sign = delta > 0 ? "+" : "";
	return `${sign}${delta}`;
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape codes are intentional
const ANSI_RE = /\x1b\[[0-9;]*m/g;

function padRight(str: string, len: number): string {
	const stripped = str.replace(ANSI_RE, "");
	return str + " ".repeat(Math.max(0, len - stripped.length));
}

/**
 * Render a comparison between baseline and current score results.
 */
export function renderComparison(
	baseline: ScoreResult,
	current: ScoreResult,
	comparison: ComparisonResult,
): string {
	const lines: string[] = [];
	const w = 50;
	const hr = "─".repeat(w - 2);

	lines.push(`╭${hr}╮`);
	lines.push(`│  ${BOLD}Comparison Report${RESET}${" ".repeat(w - 22)}│`);
	lines.push(`│${" ".repeat(w - 2)}│`);

	// Overall score delta
	const overallSign = comparison.overallDelta > 0 ? "+" : "";
	const overallColor =
		comparison.overallDelta > 0
			? "\x1b[32m"
			: comparison.overallDelta < 0
				? "\x1b[31m"
				: "\x1b[90m";
	const scoreLine = `  Score: ${baseline.overall} → ${BOLD}${colorByCategory(current.category)}${current.overall}${RESET}  (${overallColor}${overallSign}${comparison.overallDelta}${RESET})`;
	lines.push(`│${padRight(scoreLine, w - 2)}│`);
	lines.push(`│${" ".repeat(w - 2)}│`);

	if (comparison.hasRegression) {
		const regLine = `  ${"\x1b[31m"}⚠ ${comparison.regressionCount} regression${comparison.regressionCount > 1 ? "s" : ""} detected${RESET}`;
		lines.push(`│${padRight(regLine, w - 2)}│`);
	} else {
		const okLine = `  ${"\x1b[32m"}✓ No regressions${RESET}`;
		lines.push(`│${padRight(okLine, w - 2)}│`);
	}

	lines.push(`├${hr}┤`);

	// Per-metric deltas
	for (const delta of comparison.deltas) {
		const label = metricLabel(delta.type).padEnd(14);
		const prev = formatMetricValue(delta.type, delta.previous);
		const curr = formatMetricValue(delta.type, delta.current);
		const arrow = deltaArrow(delta);
		const color = deltaColor(delta);
		const scoreDelta = `${color}${formatDelta(delta.delta)}${RESET}`;

		const metricLine = `  ${label} ${DIM}${prev}${RESET} → ${curr}  ${arrow} ${scoreDelta}`;
		lines.push(`│${padRight(metricLine, w - 2)}│`);
	}

	lines.push(`╰${hr}╯`);

	return lines.join("\n");
}
