import type { ConnectedApp } from "./ws-server";

/**
 * Render a live terminal dashboard showing connected apps and their metrics.
 *
 * Returns a string that can be printed to the terminal.
 * Uses ANSI escape codes for formatting.
 */
export function renderDashboard(
	apps: ConnectedApp[],
	serverPort: number,
	isRunning: boolean,
): string {
	const lines: string[] = [];

	lines.push("╭─────────────────────────────────────────────╮");
	lines.push(`│  \x1b[1mlanterna monitor\x1b[0m                            │`);
	lines.push(
		`│  Port: ${serverPort}  Status: ${isRunning ? "\x1b[32m● running\x1b[0m" : "\x1b[31m○ stopped\x1b[0m"}            │`,
	);
	lines.push("├─────────────────────────────────────────────┤");

	if (apps.length === 0) {
		lines.push("│  Waiting for apps to connect...             │");
		lines.push("│                                             │");
		lines.push("│  Add @lanternajs/react-native to your app      │");
		lines.push("│  and it will auto-connect.                  │");
	} else {
		for (const app of apps) {
			lines.push(`│  \x1b[1m${padRight(app.appId, 40)}\x1b[0m   │`);
			lines.push(`│  ${padRight(`${app.deviceName} (${app.platform})`, 40)}   │`);

			if (app.currentScreen) {
				lines.push(`│  ${padRight(`\x1b[36m${app.currentScreen}\x1b[0m`, 40)}   │`);
			}

			const metricLines = formatMetrics(app);
			for (const ml of metricLines) {
				lines.push(`│  ${padRight(ml, 40)}   │`);
			}
			lines.push("│                                             │");
		}
	}

	lines.push("│  Press Ctrl+C to stop                       │");
	lines.push("╰─────────────────────────────────────────────╯");

	return lines.join("\n");
}

function formatMetrics(app: ConnectedApp): string[] {
	const lines: string[] = [];
	const m = app.latestMetrics;

	if (app.fps) {
		const uiColor = app.fps.ui >= 55 ? "\x1b[32m" : app.fps.ui >= 40 ? "\x1b[33m" : "\x1b[31m";
		lines.push(
			`${uiColor}UI FPS: ${app.fps.ui.toFixed(1)}\x1b[0m  Drops: ${app.fps.droppedFrames}`,
		);
	}

	if (m.ui_fps !== undefined && !app.fps) {
		const color = m.ui_fps >= 55 ? "\x1b[32m" : m.ui_fps >= 40 ? "\x1b[33m" : "\x1b[31m";
		lines.push(`${color}UI FPS: ${m.ui_fps.toFixed(1)}\x1b[0m`);
	}

	if (m.js_fps !== undefined) {
		const color = m.js_fps >= 55 ? "\x1b[32m" : m.js_fps >= 40 ? "\x1b[33m" : "\x1b[31m";
		lines.push(`${color}JS FPS: ${m.js_fps.toFixed(1)}\x1b[0m`);
	}

	if (m.cpu !== undefined) {
		const color = m.cpu <= 30 ? "\x1b[32m" : m.cpu <= 60 ? "\x1b[33m" : "\x1b[31m";
		lines.push(`${color}CPU: ${m.cpu.toFixed(1)}%\x1b[0m`);
	}

	if (app.memory) {
		const color =
			app.memory.usedMb <= 300 ? "\x1b[32m" : app.memory.usedMb <= 500 ? "\x1b[33m" : "\x1b[31m";
		lines.push(`${color}Memory: ${app.memory.usedMb} MB\x1b[0m`);
	} else if (m.memory !== undefined) {
		const color = m.memory <= 300 ? "\x1b[32m" : m.memory <= 500 ? "\x1b[33m" : "\x1b[31m";
		lines.push(`${color}Memory: ${m.memory.toFixed(0)} MB\x1b[0m`);
	}

	if (lines.length === 0) {
		lines.push("Awaiting metrics...");
	}

	return lines;
}

function padRight(str: string, len: number): string {
	// Strip ANSI escape codes for length calculation
	// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape codes are intentional
	const stripped = str.replace(/\x1b\[[0-9;]*m/g, "");
	const padding = Math.max(0, len - stripped.length);
	return str + " ".repeat(padding);
}
