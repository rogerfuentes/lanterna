import { describe, expect, test } from "bun:test";
import { detectDevices } from "../devices";
import { detectAndroidDevices } from "../devices/android";
import type { CommandRunner } from "../devices/exec";
import { detectIosDevices } from "../devices/ios";

function mockRunner(
	responses: Record<string, { stdout: string; exitCode: number }>,
): CommandRunner {
	return async (cmd, args) => {
		const key = `${cmd} ${args.join(" ")}`;
		for (const [pattern, response] of Object.entries(responses)) {
			if (key.includes(pattern)) {
				return { stdout: response.stdout, stderr: "", exitCode: response.exitCode };
			}
		}
		return { stdout: "", stderr: `Command not found: ${cmd}`, exitCode: 127 };
	};
}

// --- Android fixtures ---

const ADB_OUTPUT_MIXED = `List of devices attached
emulator-5554          device product:sdk_gphone64_arm64 model:sdk_gphone64_arm64 transport_id:1
R5CR10XXXXX            device product:beyond1 model:SM_G973F transport_id:2
`;

const ADB_OUTPUT_UNAUTHORIZED = `List of devices attached
XXXXXXXX               unauthorized usb:1-1
emulator-5554          device product:sdk_gphone64_arm64 model:Pixel_6 transport_id:1
`;

const ADB_OUTPUT_EMPTY = `List of devices attached

`;

// --- iOS fixtures ---

const SIMCTL_JSON_BOOTED = JSON.stringify({
	devices: {
		"com.apple.CoreSimulator.SimRuntime.iOS-17-0": [
			{ name: "iPhone 15", udid: "AAA-BBB-CCC", state: "Booted", isAvailable: true },
			{ name: "iPhone 15 Pro", udid: "DDD-EEE-FFF", state: "Shutdown", isAvailable: true },
		],
		"com.apple.CoreSimulator.SimRuntime.iOS-18-0": [
			{ name: "iPhone 16", udid: "GGG-HHH-III", state: "Booted", isAvailable: true },
			{ name: "iPhone 16 Pro", udid: "JJJ-KKK-LLL", state: "Booted", isAvailable: false },
		],
	},
});

const XCTRACE_DEVICES = `== Devices ==
Roger's iPhone (17.1) (00008110-AAAAAAAAAAAA)
Roger's iPad (16.4) (00008027-BBBBBBBBBBBB)

== Simulators ==
iPhone 15 Simulator (17.0) (AAA-BBB-CCC)
iPhone 16 Simulator (18.0) (GGG-HHH-III)
`;

// --- Android tests ---

describe("detectAndroidDevices", () => {
	test("parses emulator and physical device", async () => {
		const runner = mockRunner({ "adb devices": { stdout: ADB_OUTPUT_MIXED, exitCode: 0 } });
		const devices = await detectAndroidDevices(runner);
		expect(devices).toHaveLength(2);
		expect(devices[0]).toEqual({
			id: "emulator-5554",
			name: "sdk gphone64 arm64",
			platform: "android",
			type: "emulator",
		});
		expect(devices[1]).toEqual({
			id: "R5CR10XXXXX",
			name: "SM G973F",
			platform: "android",
			type: "physical",
		});
	});

	test("skips unauthorized devices", async () => {
		const runner = mockRunner({
			"adb devices": { stdout: ADB_OUTPUT_UNAUTHORIZED, exitCode: 0 },
		});
		const devices = await detectAndroidDevices(runner);
		expect(devices).toHaveLength(1);
		expect(devices[0].name).toBe("Pixel 6");
	});

	test("returns empty on adb failure", async () => {
		const runner = mockRunner({ "adb devices": { stdout: "", exitCode: 127 } });
		const devices = await detectAndroidDevices(runner);
		expect(devices).toEqual([]);
	});

	test("returns empty when no devices", async () => {
		const runner = mockRunner({ "adb devices": { stdout: ADB_OUTPUT_EMPTY, exitCode: 0 } });
		const devices = await detectAndroidDevices(runner);
		expect(devices).toEqual([]);
	});
});

// --- iOS tests ---

describe("detectIosDevices", () => {
	test("parses booted simulators from simctl", async () => {
		const runner = mockRunner({
			"simctl list": { stdout: SIMCTL_JSON_BOOTED, exitCode: 0 },
			"xctrace list": { stdout: "", exitCode: 127 },
		});
		const devices = await detectIosDevices(runner);
		expect(devices).toHaveLength(2);
		expect(devices[0]).toEqual({
			id: "AAA-BBB-CCC",
			name: "iPhone 15",
			platform: "ios",
			type: "simulator",
		});
		expect(devices[1]).toEqual({
			id: "GGG-HHH-III",
			name: "iPhone 16",
			platform: "ios",
			type: "simulator",
		});
	});

	test("parses physical devices from xctrace", async () => {
		const runner = mockRunner({
			"simctl list": { stdout: "{}", exitCode: 127 },
			"xctrace list": { stdout: XCTRACE_DEVICES, exitCode: 0 },
		});
		const devices = await detectIosDevices(runner);
		expect(devices).toHaveLength(2);
		expect(devices[0]).toEqual({
			id: "00008110-AAAAAAAAAAAA",
			name: "Roger's iPhone",
			platform: "ios",
			type: "physical",
		});
		expect(devices[1]).toEqual({
			id: "00008027-BBBBBBBBBBBB",
			name: "Roger's iPad",
			platform: "ios",
			type: "physical",
		});
	});

	test("merges and deduplicates simulators + physical", async () => {
		const runner = mockRunner({
			"simctl list": { stdout: SIMCTL_JSON_BOOTED, exitCode: 0 },
			"xctrace list": { stdout: XCTRACE_DEVICES, exitCode: 0 },
		});
		const devices = await detectIosDevices(runner);
		// 2 booted sims + 2 physical = 4 (no overlap in IDs)
		expect(devices).toHaveLength(4);
	});

	test("returns empty when both commands fail", async () => {
		const runner = mockRunner({});
		const devices = await detectIosDevices(runner);
		expect(devices).toEqual([]);
	});
});

// --- Orchestrator tests ---

describe("detectDevices", () => {
	test("merges iOS and Android devices", async () => {
		const runner = mockRunner({
			"adb devices": { stdout: ADB_OUTPUT_MIXED, exitCode: 0 },
			"simctl list": { stdout: SIMCTL_JSON_BOOTED, exitCode: 0 },
			"xctrace list": { stdout: XCTRACE_DEVICES, exitCode: 0 },
		});
		const devices = await detectDevices(runner);
		// 2 android + 2 booted sims + 2 physical = 6
		expect(devices).toHaveLength(6);
	});

	test("physical devices sorted first", async () => {
		const runner = mockRunner({
			"adb devices": { stdout: ADB_OUTPUT_MIXED, exitCode: 0 },
			"simctl list": { stdout: SIMCTL_JSON_BOOTED, exitCode: 0 },
			"xctrace list": { stdout: XCTRACE_DEVICES, exitCode: 0 },
		});
		const devices = await detectDevices(runner);
		const physicalCount = devices.filter((d) => d.type === "physical").length;
		// First N should all be physical
		for (let i = 0; i < physicalCount; i++) {
			expect(devices[i].type).toBe("physical");
		}
	});

	test("works with only Android available", async () => {
		const runner = mockRunner({
			"adb devices": { stdout: ADB_OUTPUT_MIXED, exitCode: 0 },
		});
		const devices = await detectDevices(runner);
		expect(devices).toHaveLength(2);
		expect(devices.every((d) => d.platform === "android")).toBe(true);
	});

	test("works with only iOS available", async () => {
		const runner = mockRunner({
			"simctl list": { stdout: SIMCTL_JSON_BOOTED, exitCode: 0 },
			"xctrace list": { stdout: XCTRACE_DEVICES, exitCode: 0 },
		});
		const devices = await detectDevices(runner);
		expect(devices.every((d) => d.platform === "ios")).toBe(true);
	});

	test("returns empty when nothing available", async () => {
		const runner = mockRunner({});
		const devices = await detectDevices(runner);
		expect(devices).toEqual([]);
	});
});
