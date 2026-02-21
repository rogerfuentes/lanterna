import type { CommandRunner } from "@lanterna/core";

/**
 * Find the PID of a running iOS app by bundle identifier.
 *
 * Strategy (tried in order):
 * 1. `xcrun simctl spawn <deviceId> launchctl list` — works for simulator apps
 * 2. `pgrep -f <bundleId>` — fallback for physical devices
 *
 * Returns null if the process is not found or an error occurs.
 */
export async function findIosPid(
	runner: CommandRunner,
	deviceId: string,
	bundleId: string,
): Promise<number | null> {
	// Try simctl launchctl first (most reliable for simulators)
	const pid = await findViaSimctl(runner, deviceId, bundleId);
	if (pid !== null) return pid;

	// Fallback to pgrep
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
