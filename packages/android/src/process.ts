import type { CommandRunner } from "@lanternajs/core";

/**
 * Find the PID of a running Android app by package name.
 * Returns null if the process is not found or on error.
 */
export async function findAndroidPid(
	runner: CommandRunner,
	deviceId: string,
	packageName: string,
): Promise<number | null> {
	try {
		const result = await runner("adb", ["-s", deviceId, "shell", "pidof", packageName]);

		if (result.exitCode !== 0 || !result.stdout.trim()) {
			return null;
		}

		const pid = Number.parseInt(result.stdout.trim(), 10);
		if (Number.isNaN(pid)) {
			return null;
		}

		return pid;
	} catch {
		return null;
	}
}
