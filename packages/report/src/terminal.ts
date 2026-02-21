import type { MeasurementSession, ScoreResult } from "@lanterna/core";
import {
	BOLD,
	categoryLabel,
	colorByCategory,
	DIM,
	formatMetricValue,
	metricLabel,
	RESET,
	scoreBar,
} from "./format";

const BOX_WIDTH = 41;
const METRIC_BAR_WIDTH = 4;

// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape codes require control characters
const ANSI_REGEX = /\x1b\[[0-9;]*m/g;

function stripAnsi(str: string): string {
	return str.replace(ANSI_REGEX, "");
}

function pad(text: string, width: number): string {
	const visibleLength = stripAnsi(text).length;
	const padding = Math.max(0, width - visibleLength);
	return text + " ".repeat(padding);
}

function boxLine(content: string, innerWidth: number): string {
	return `│  ${pad(content, innerWidth - 4)}  │`;
}

function emptyLine(innerWidth: number): string {
	return `│${" ".repeat(innerWidth)}│`;
}

export function renderReport(session: MeasurementSession, score: ScoreResult): string {
	const innerWidth = BOX_WIDTH - 2;
	const lines: string[] = [];

	// Top border
	lines.push(`╭${"─".repeat(innerWidth)}╮`);

	// Title
	lines.push(boxLine(`${BOLD}lanterna${RESET} v0.0.1`, innerWidth));

	// Empty line
	lines.push(emptyLine(innerWidth));

	// Overall score
	const scoreColor = colorByCategory(score.category);
	const catLabel = categoryLabel(score.category);
	lines.push(
		boxLine(
			`Score: ${BOLD}${scoreColor}${score.overall}${RESET} / 100  ${scoreColor}${catLabel}${RESET}`,
			innerWidth,
		),
	);

	// Score bar
	const bar = scoreBar(score.overall);
	lines.push(boxLine(`${scoreColor}${bar}${RESET}  ${score.overall}%`, innerWidth));

	// Empty line
	lines.push(emptyLine(innerWidth));

	// Device info
	lines.push(
		boxLine(
			`Device: ${session.device.name} (${session.platform}, ${session.device.type})`,
			innerWidth,
		),
	);

	// Duration
	lines.push(boxLine(`Duration: ${session.duration}s`, innerWidth));

	// Separator
	lines.push(`├${"─".repeat(innerWidth)}┤`);

	// Metric rows
	for (const metric of score.perMetric) {
		const label = pad(metricLabel(metric.type), 15);
		const value = pad(formatMetricValue(metric.type, metric.value), 12);
		const mBar = scoreBar(metric.score, METRIC_BAR_WIDTH);
		const color = colorByCategory(metric.category);
		const metricLine = `${color}${label}${value}${mBar} ${metric.score.toString().padStart(2)}${RESET}`;
		lines.push(boxLine(metricLine, innerWidth));
	}

	// Navigation section
	if (session.navigationTimeline) {
		const nav = session.navigationTimeline;
		const avgTtid = nav.averageTTID !== null ? `${Math.round(nav.averageTTID)}ms` : "N/A";
		lines.push(`├${"─".repeat(innerWidth)}┤`);
		lines.push(
			boxLine(
				`${BOLD}Navigation${RESET} (${nav.screens.length} screens, avg ${avgTtid})`,
				innerWidth,
			),
		);

		for (const screen of nav.screens) {
			const ttid = screen.ttid !== undefined ? `${Math.round(screen.ttid)}ms` : "N/A";
			const time =
				screen.timeOnScreen !== undefined ? `${(screen.timeOnScreen / 1000).toFixed(1)}s` : "N/A";
			const slow = screen.ttid !== undefined && screen.ttid > 500 ? `  ${DIM}<-${RESET}` : "";
			const name = pad(screen.screenName, 20);
			lines.push(boxLine(`${name}${pad(ttid, 8)}${pad(time, 6)}${slow}`, innerWidth));
		}
	}

	// Network section
	if (session.networkRequests && session.networkRequests.length > 0) {
		const requests = session.networkRequests;
		lines.push(`├${"─".repeat(innerWidth)}┤`);
		lines.push(boxLine(`${BOLD}Network${RESET} (${requests.length} requests)`, innerWidth));

		const sorted = [...requests]
			.filter((r) => r.duration !== undefined)
			.sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0))
			.slice(0, 5);

		for (const req of sorted) {
			const method = req.method.toUpperCase();
			const urlPath = req.url.length > 15 ? req.url.slice(0, 15) : req.url;
			const dur = req.duration !== undefined ? `${Math.round(req.duration)}ms` : "N/A";
			const status = req.status !== undefined ? `${req.status}` : "???";
			const slow = req.duration !== undefined && req.duration > 3000 ? `  ${DIM}<-${RESET}` : "";
			const label = pad(`${method} ${urlPath}`, 22);
			lines.push(boxLine(`${label}${pad(dur, 8)}${pad(status, 4)}${slow}`, innerWidth));
		}
	}

	// Bridge section
	if (session.bridgeStats) {
		const bridge = session.bridgeStats;
		lines.push(`├${"─".repeat(innerWidth)}┤`);
		lines.push(
			boxLine(`${BOLD}Bridge:${RESET} ${bridge.callsPerSecond.toFixed(0)} calls/sec`, innerWidth),
		);

		if (bridge.topModules.length > 0) {
			const top = bridge.topModules
				.slice(0, 3)
				.map((m) => `${m.module} (${m.count})`)
				.join(", ");
			lines.push(boxLine(`Top: ${top}`, innerWidth));
		}
	}

	// Layout section
	if (session.layoutStats && session.layoutStats.componentsWithExcessiveLayouts.length > 0) {
		const excessive = session.layoutStats.componentsWithExcessiveLayouts;
		lines.push(`├${"─".repeat(innerWidth)}┤`);
		lines.push(boxLine(`${BOLD}Excessive layouts${RESET}`, innerWidth));

		const summary = excessive
			.slice(0, 4)
			.map((c) => `${c.name}: ${c.count} passes`)
			.join(", ");
		lines.push(boxLine(summary, innerWidth));
	}

	// Bottom border
	lines.push(`╰${"─".repeat(innerWidth)}╯`);

	return lines.join("\n");
}
