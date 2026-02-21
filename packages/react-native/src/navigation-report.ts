/**
 * Terminal report formatter for navigation timeline data.
 * Produces a human-readable table of screen transitions with TTID coloring.
 */

import type { NavigationTimeline } from "./navigation";

/** ANSI color codes for terminal output. */
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

/** TTID thresholds in milliseconds. */
const TTID_GOOD = 200;
const TTID_WARN = 500;

/**
 * Colorize a TTID value based on performance thresholds.
 * Green: <200ms, Yellow: 200-500ms, Red: >500ms
 */
function colorizeTtid(ttid: number): string {
	const label = `${ttid}ms`;
	if (ttid < TTID_GOOD) return `${GREEN}${label}${RESET}`;
	if (ttid < TTID_WARN) return `${YELLOW}${label}${RESET}`;
	return `${RED}${label}${RESET}`;
}

/** Format milliseconds to a human-friendly string. */
function formatDuration(ms: number): string {
	if (ms >= 1000) {
		return `${(ms / 1000).toFixed(1)}s`;
	}
	return `${Math.round(ms)}ms`;
}

/** Pad a string to a minimum width (right-padded). */
function padRight(str: string, width: number): string {
	if (str.length >= width) return str;
	return str + " ".repeat(width - str.length);
}

/**
 * Format navigation timeline data for terminal display.
 * Produces a table with screen names, TTID, render duration, and time on screen.
 */
export function formatNavigationReport(timeline: NavigationTimeline): string {
	if (timeline.screens.length === 0) {
		return `${DIM}No navigation data recorded.${RESET}`;
	}

	const avgTtid = timeline.averageTTID !== null ? `${Math.round(timeline.averageTTID)}ms` : "N/A";

	const lines: string[] = [];

	lines.push(
		`${BOLD}Navigation Timeline${RESET} (${timeline.totalScreenChanges} screen${timeline.totalScreenChanges === 1 ? "" : "s"}, avg TTID: ${avgTtid})`,
	);
	lines.push("");

	// Column headers
	const colScreen = 20;
	const colTtid = 8;
	const colRender = 9;
	const colTime = 16;

	lines.push(
		`  ${padRight("Screen", colScreen)}${padRight("TTID", colTtid)}${padRight("Render", colRender)}${padRight("Time on Screen", colTime)}`,
	);
	lines.push(`  ${"─".repeat(colScreen + colTtid + colRender + colTime)}`);

	for (const screen of timeline.screens) {
		const isSlowest = timeline.slowestScreen !== null && screen === timeline.slowestScreen;

		const name = padRight(
			screen.screenName.length > colScreen - 1
				? `${screen.screenName.slice(0, colScreen - 2)}…`
				: screen.screenName,
			colScreen,
		);

		const ttid = screen.ttid !== undefined ? colorizeTtid(screen.ttid) : `${DIM}---${RESET}`;
		const ttidPad = screen.ttid !== undefined ? `${screen.ttid}ms`.length : 3;

		const render =
			screen.renderDuration !== undefined
				? formatDuration(screen.renderDuration)
				: `${DIM}---${RESET}`;
		const renderPad =
			screen.renderDuration !== undefined ? formatDuration(screen.renderDuration).length : 3;

		const timeOnScreen =
			screen.timeOnScreen !== undefined
				? formatDuration(screen.timeOnScreen)
				: screen.leftAt === undefined
					? `${DIM}(active)${RESET}`
					: `${DIM}---${RESET}`;

		const slowMarker = isSlowest ? `${RED}  ← slowest${RESET}` : "";

		lines.push(
			`  ${name}${ttid}${" ".repeat(Math.max(1, colTtid - ttidPad))}${render}${" ".repeat(Math.max(1, colRender - renderPad))}${timeOnScreen}${slowMarker}`,
		);
	}

	return lines.join("\n");
}
