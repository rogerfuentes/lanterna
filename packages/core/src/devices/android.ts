import type { Device } from "../types";
import type { CommandRunner } from "./exec";

const SKIP_STATUSES = ["offline", "unauthorized", "no permissions"];

function parseDeviceLine(line: string): Device | null {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith("List of devices")) {
		return null;
	}

	// Each line looks like: <id>  <status> <key:value pairs...>
	// Split on whitespace to get the device id and status
	const parts = trimmed.split(/\s+/);
	if (parts.length < 2) {
		return null;
	}

	const id = parts[0];
	const status = parts[1];

	if (SKIP_STATUSES.some((s) => trimmed.includes(s))) {
		return null;
	}

	if (status !== "device") {
		return null;
	}

	const isEmulator = id.startsWith("emulator");
	const modelMatch = trimmed.match(/model:(\S+)/);
	const name = modelMatch ? modelMatch[1].replace(/_/g, " ") : id;

	return {
		id,
		name,
		platform: "android",
		type: isEmulator ? "emulator" : "physical",
	};
}

export async function detectAndroidDevices(runner: CommandRunner): Promise<Device[]> {
	const result = await runner("adb", ["devices", "-l"]);

	if (result.exitCode !== 0) {
		return [];
	}

	const lines = result.stdout.split("\n");
	const devices: Device[] = [];

	for (const line of lines) {
		const device = parseDeviceLine(line);
		if (device) {
			devices.push(device);
		}
	}

	return devices;
}
