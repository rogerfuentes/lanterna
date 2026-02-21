import type { Device } from "../types";
import { detectAndroidDevices } from "./android";
import { type CommandRunner, defaultRunner } from "./exec";
import { detectIosDevices } from "./ios";

export { detectAndroidDevices } from "./android";
export { type CommandRunner, defaultRunner } from "./exec";
export { detectIosDevices } from "./ios";

/**
 * Detect all connected devices across both platforms.
 * Runs iOS and Android detection in parallel.
 * Never throws — returns empty array if no tools are available.
 */
export async function detectDevices(runner: CommandRunner = defaultRunner): Promise<Device[]> {
	const [androidResult, iosResult] = await Promise.allSettled([
		detectAndroidDevices(runner),
		detectIosDevices(runner),
	]);

	const android = androidResult.status === "fulfilled" ? androidResult.value : [];
	const ios = iosResult.status === "fulfilled" ? iosResult.value : [];

	// Physical devices first, then simulators/emulators
	return [...ios, ...android].sort((a, b) => {
		if (a.type === "physical" && b.type !== "physical") return -1;
		if (a.type !== "physical" && b.type === "physical") return 1;
		return 0;
	});
}
