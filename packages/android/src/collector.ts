import type { CommandRunner, Device, MeasurementSession, MetricSample } from "@lanternajs/core";
import { parseGfxinfoOutput } from "./parsers/gfxinfo";
import { parseMeminfoOutput } from "./parsers/meminfo";
import { parseTopOutput } from "./parsers/top";
import { findAndroidPid } from "./process";

const PID_POLL_INTERVAL_MS = 500;
const PID_MAX_ATTEMPTS = 10;

/**
 * Poll for a PID with retries. Gives the app up to 5 seconds to appear
 * in the process list after launch.
 */
async function waitForPid(findPid: () => Promise<number | null>): Promise<number | null> {
	for (let attempt = 0; attempt < PID_MAX_ATTEMPTS; attempt++) {
		const pid = await findPid();
		if (pid !== null) return pid;
		if (attempt < PID_MAX_ATTEMPTS - 1) {
			await new Promise((resolve) => setTimeout(resolve, PID_POLL_INTERVAL_MS));
		}
	}
	return null;
}

/**
 * Collect Android performance metrics for a given device and package.
 *
 * Runs adb commands to gather CPU (via top), memory (via dumpsys meminfo),
 * and frame metrics (via dumpsys gfxinfo), then merges all samples into
 * a single MeasurementSession.
 */
export async function collectAndroidMetrics(
	runner: CommandRunner,
	device: Device,
	packageName: string,
	duration: number,
): Promise<MeasurementSession> {
	const pid = await waitForPid(() => findAndroidPid(runner, device.id, packageName));
	if (pid === null) {
		throw new Error(
			`Process not found: "${packageName}" is not running on device "${device.name}" (${device.id}). ` +
				"Make sure the app is launched before profiling.",
		);
	}

	const startedAt = Date.now();
	const samples: MetricSample[] = [];

	// Run all data collection in parallel
	const [topResult, meminfoResult, gfxinfoResult] = await Promise.all([
		runner("adb", [
			"-s",
			device.id,
			"shell",
			"top",
			"-H",
			"-d",
			"1",
			"-n",
			String(duration),
			"-p",
			String(pid),
		]),
		runner("adb", ["-s", device.id, "shell", "dumpsys", "meminfo", packageName]),
		runner("adb", ["-s", device.id, "shell", "dumpsys", "gfxinfo", packageName]),
	]);

	// Parse top output — may contain multiple snapshots separated by blank lines
	if (topResult.exitCode === 0 && topResult.stdout) {
		const snapshots = topResult.stdout.split(/\n\n+/);
		for (let i = 0; i < snapshots.length; i++) {
			const snapshotTimestamp = startedAt + i * 1000;
			const parsed = parseTopOutput(snapshots[i], snapshotTimestamp);
			samples.push(...parsed);
		}
	}

	// Parse meminfo
	if (meminfoResult.exitCode === 0 && meminfoResult.stdout) {
		const parsed = parseMeminfoOutput(meminfoResult.stdout, startedAt);
		samples.push(...parsed);
	}

	// Parse gfxinfo
	if (gfxinfoResult.exitCode === 0 && gfxinfoResult.stdout) {
		const parsed = parseGfxinfoOutput(gfxinfoResult.stdout, startedAt);
		samples.push(...parsed);
	}

	return {
		device,
		platform: "android",
		samples,
		duration,
		startedAt,
	};
}
