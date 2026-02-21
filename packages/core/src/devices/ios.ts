import type { Device } from "../types";
import type { CommandRunner } from "./exec";

interface SimctlDevice {
	name: string;
	udid: string;
	state: string;
	isAvailable: boolean;
}

interface SimctlOutput {
	devices: Record<string, SimctlDevice[]>;
}

function parseSimulators(stdout: string): Device[] {
	let parsed: SimctlOutput;
	try {
		parsed = JSON.parse(stdout);
	} catch {
		return [];
	}

	const devices: Device[] = [];

	for (const runtimeDevices of Object.values(parsed.devices)) {
		for (const sim of runtimeDevices) {
			if (sim.state === "Booted" && sim.isAvailable) {
				devices.push({
					id: sim.udid,
					name: sim.name,
					platform: "ios",
					type: "simulator",
				});
			}
		}
	}

	return devices;
}

// Matches lines like: Roger's iPhone (17.1) (00008110-XXXXXXXXXXXX)
// Captures: name = "Roger's iPhone", id = "00008110-XXXXXXXXXXXX"
const PHYSICAL_DEVICE_RE = /^(.+?)\s+\(\d[\d.]*\)\s+\(([^)]+)\)\s*$/;

function parsePhysicalDevices(stdout: string): Device[] {
	const lines = stdout.split("\n");
	const devices: Device[] = [];
	let inDevicesSection = false;

	for (const line of lines) {
		const trimmed = line.trim();

		if (trimmed === "== Devices ==") {
			inDevicesSection = true;
			continue;
		}

		if (trimmed.startsWith("== ") && trimmed !== "== Devices ==") {
			inDevicesSection = false;
			continue;
		}

		if (!inDevicesSection || !trimmed) {
			continue;
		}

		const match = trimmed.match(PHYSICAL_DEVICE_RE);
		if (match) {
			devices.push({
				id: match[2],
				name: match[1].trim(),
				platform: "ios",
				type: "physical",
			});
		}
	}

	return devices;
}

function isCommandFailure(exitCode: number): boolean {
	return exitCode !== 0;
}

export async function detectIosDevices(runner: CommandRunner): Promise<Device[]> {
	const [simctlResult, xctraceResult] = await Promise.all([
		runner("xcrun", ["simctl", "list", "devices", "--json"]),
		runner("xcrun", ["xctrace", "list", "devices"]),
	]);

	const simulators = isCommandFailure(simctlResult.exitCode)
		? []
		: parseSimulators(simctlResult.stdout);
	const physical = isCommandFailure(xctraceResult.exitCode)
		? []
		: parsePhysicalDevices(xctraceResult.stdout);

	// Merge and deduplicate by id, preferring the first occurrence
	const seen = new Set<string>();
	const devices: Device[] = [];

	for (const device of [...simulators, ...physical]) {
		if (!seen.has(device.id)) {
			seen.add(device.id);
			devices.push(device);
		}
	}

	return devices;
}
