import type { CommandRunner, DeviceType } from "@lanternajs/core";

/**
 * Find the PID of a running iOS app by bundle identifier.
 *
 * Strategy depends on device type:
 * - Simulator: `xcrun simctl spawn <deviceId> launchctl list`
 * - Physical: `xcrun devicectl device info processes --device <deviceId>`
 * - Fallback: `pgrep -f <bundleId>` (host processes only)
 *
 * Returns null if the process is not found or an error occurs.
 */
export async function findIosPid(
	runner: CommandRunner,
	deviceId: string,
	bundleId: string,
	deviceType: DeviceType = "simulator",
): Promise<number | null> {
	if (deviceType === "physical") {
		const pid = await findViaDevicectl(runner, deviceId, bundleId);
		if (pid !== null) return pid;
		return null;
	}

	// Simulator path: try simctl first, then pgrep as fallback
	const pid = await findViaSimctl(runner, deviceId, bundleId);
	if (pid !== null) return pid;

	return findViaPgrep(runner, bundleId);
}

async function findViaSimctl(
	runner: CommandRunner,
	deviceId: string,
	bundleId: string,
): Promise<number | null> {
	try {
		const result = await runner("xcrun", ["simctl", "spawn", deviceId, "launchctl", "list"]);

		if (result.exitCode !== 0 || !result.stdout) {
			return null;
		}

		// Lines look like: 40853	0	UIKitApplication:com.example.app[70ba][rb-legacy]
		for (const line of result.stdout.split("\n")) {
			if (line.includes(bundleId)) {
				const pid = Number.parseInt(line.trim().split("\t")[0], 10);
				if (!Number.isNaN(pid) && pid > 0) {
					return pid;
				}
			}
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * Find the PID of a process on a physical iOS device via `xcrun devicectl`.
 *
 * Parses JSON output from `xcrun devicectl device info processes` looking
 * for a process whose executable path contains the bundle identifier.
 */
async function findViaDevicectl(
	runner: CommandRunner,
	deviceId: string,
	bundleId: string,
): Promise<number | null> {
	try {
		const result = await runner("xcrun", [
			"devicectl",
			"device",
			"info",
			"processes",
			"--device",
			deviceId,
			"--json-output",
			"-",
		]);

		if (result.exitCode !== 0 || !result.stdout) {
			return null;
		}

		return parseDevicectlProcesses(result.stdout, bundleId);
	} catch {
		return null;
	}
}

/**
 * Parse the JSON output from `xcrun devicectl device info processes`
 * to find a matching process by bundle identifier.
 *
 * The JSON structure has `result.runningProcesses[]` with `processIdentifier` (PID)
 * and `executable` (path that contains the bundle ID for app processes).
 */
export function parseDevicectlProcesses(json: string, bundleId: string): number | null {
	try {
		const parsed = JSON.parse(json);
		const processes = parsed?.result?.runningProcesses;
		if (!Array.isArray(processes)) return null;

		for (const proc of processes) {
			const executable = proc.executable ?? "";
			if (executable.includes(bundleId)) {
				const pid = proc.processIdentifier;
				if (typeof pid === "number" && pid > 0) {
					return pid;
				}
			}
		}

		return null;
	} catch {
		return null;
	}
}

async function findViaPgrep(runner: CommandRunner, bundleId: string): Promise<number | null> {
	try {
		const result = await runner("pgrep", ["-f", bundleId]);

		if (result.exitCode !== 0 || !result.stdout.trim()) {
			return null;
		}

		const firstLine = result.stdout.trim().split("\n")[0];
		const pid = Number.parseInt(firstLine, 10);

		if (Number.isNaN(pid)) {
			return null;
		}

		return pid;
	} catch {
		return null;
	}
}
