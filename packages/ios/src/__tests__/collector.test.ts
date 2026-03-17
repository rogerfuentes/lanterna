import { describe, expect, test } from "bun:test";
import type { CommandRunner, Device } from "@lanternajs/core";
import { findIosPid, parseDevicectlProcesses } from "../process";
import { getXcodeVersion } from "../xcode-version";

function createMockRunner(
	responses: Record<string, { stdout: string; stderr: string; exitCode: number }>,
): CommandRunner {
	return async (cmd: string, args: string[]) => {
		const key = `${cmd} ${args.join(" ")}`;

		// Check for exact match first
		if (responses[key]) {
			return responses[key];
		}

		// Check for prefix match (for commands with dynamic args)
		for (const [pattern, response] of Object.entries(responses)) {
			if (key.startsWith(pattern)) {
				return response;
			}
		}

		return { stdout: "", stderr: `Unknown command: ${key}`, exitCode: 1 };
	};
}

describe("findIosPid", () => {
	describe("simulator", () => {
		test("returns PID via simctl launchctl", async () => {
			const runner = createMockRunner({
				"xcrun simctl spawn device-1 launchctl list": {
					stdout: "12345\t0\tUIKitApplication:com.example.app[70ba][rb-legacy]\n",
					stderr: "",
					exitCode: 0,
				},
			});

			const pid = await findIosPid(runner, "device-1", "com.example.app", "simulator");
			expect(pid).toBe(12345);
		});

		test("falls back to pgrep when simctl fails", async () => {
			const runner = createMockRunner({
				"xcrun simctl spawn device-1 launchctl list": {
					stdout: "",
					stderr: "error",
					exitCode: 1,
				},
				"pgrep -f com.example.app": {
					stdout: "12345\n",
					stderr: "",
					exitCode: 0,
				},
			});

			const pid = await findIosPid(runner, "device-1", "com.example.app", "simulator");
			expect(pid).toBe(12345);
		});

		test("returns first PID when multiple processes match via pgrep", async () => {
			const runner = createMockRunner({
				"pgrep -f com.example.app": {
					stdout: "12345\n12346\n12347\n",
					stderr: "",
					exitCode: 0,
				},
			});

			const pid = await findIosPid(runner, "device-1", "com.example.app", "simulator");
			expect(pid).toBe(12345);
		});

		test("returns null when process is not found", async () => {
			const runner = createMockRunner({
				"pgrep -f com.example.app": {
					stdout: "",
					stderr: "",
					exitCode: 1,
				},
			});

			const pid = await findIosPid(runner, "device-1", "com.example.app", "simulator");
			expect(pid).toBeNull();
		});

		test("returns null on empty stdout", async () => {
			const runner = createMockRunner({
				"pgrep -f com.example.app": {
					stdout: "   \n",
					stderr: "",
					exitCode: 0,
				},
			});

			const pid = await findIosPid(runner, "device-1", "com.example.app", "simulator");
			expect(pid).toBeNull();
		});

		test("returns null on non-numeric output", async () => {
			const runner = createMockRunner({
				"pgrep -f com.example.app": {
					stdout: "not-a-pid\n",
					stderr: "",
					exitCode: 0,
				},
			});

			const pid = await findIosPid(runner, "device-1", "com.example.app", "simulator");
			expect(pid).toBeNull();
		});
	});

	describe("physical device", () => {
		const devicectlJson = JSON.stringify({
			result: {
				runningProcesses: [
					{
						processIdentifier: 456,
						executable:
							"/private/var/containers/Bundle/Application/ABC/com.example.app.app/com.example.app",
						memoryUse: 262144000,
					},
					{
						processIdentifier: 1,
						executable: "/usr/sbin/launchd",
						memoryUse: 1048576,
					},
				],
			},
		});

		test("returns PID via devicectl", async () => {
			const runner = createMockRunner({
				"xcrun devicectl device info processes --device device-1 --json-output -": {
					stdout: devicectlJson,
					stderr: "",
					exitCode: 0,
				},
			});

			const pid = await findIosPid(runner, "device-1", "com.example.app", "physical");
			expect(pid).toBe(456);
		});

		test("returns null when devicectl fails", async () => {
			const runner = createMockRunner({
				"xcrun devicectl device info processes --device device-1 --json-output -": {
					stdout: "",
					stderr: "device not found",
					exitCode: 1,
				},
			});

			const pid = await findIosPid(runner, "device-1", "com.example.app", "physical");
			expect(pid).toBeNull();
		});

		test("returns null when app not in process list", async () => {
			const json = JSON.stringify({
				result: {
					runningProcesses: [
						{ processIdentifier: 1, executable: "/usr/sbin/launchd", memoryUse: 1048576 },
					],
				},
			});

			const runner = createMockRunner({
				"xcrun devicectl device info processes --device device-1 --json-output -": {
					stdout: json,
					stderr: "",
					exitCode: 0,
				},
			});

			const pid = await findIosPid(runner, "device-1", "com.example.app", "physical");
			expect(pid).toBeNull();
		});

		test("does not fall back to pgrep for physical devices", async () => {
			const commands: string[] = [];
			const runner: CommandRunner = async (cmd, args) => {
				const key = `${cmd} ${args.join(" ")}`;
				commands.push(key);
				return { stdout: "", stderr: "", exitCode: 1 };
			};

			await findIosPid(runner, "device-1", "com.example.app", "physical");
			expect(commands.some((c) => c.includes("pgrep"))).toBe(false);
		});
	});
});

describe("parseDevicectlProcesses", () => {
	test("finds process by bundle id in executable path", () => {
		const json = JSON.stringify({
			result: {
				runningProcesses: [
					{
						processIdentifier: 456,
						executable: "/var/containers/Bundle/Application/.../com.example.app",
						memoryUse: 100000,
					},
				],
			},
		});

		expect(parseDevicectlProcesses(json, "com.example.app")).toBe(456);
	});

	test("returns null for empty process list", () => {
		const json = JSON.stringify({ result: { runningProcesses: [] } });
		expect(parseDevicectlProcesses(json, "com.example.app")).toBeNull();
	});

	test("returns null for malformed JSON", () => {
		expect(parseDevicectlProcesses("not json", "com.example.app")).toBeNull();
	});

	test("returns null when result structure is missing", () => {
		expect(parseDevicectlProcesses("{}", "com.example.app")).toBeNull();
	});
});

describe("getXcodeVersion", () => {
	test("returns version when Xcode is installed", async () => {
		const runner = createMockRunner({
			"xcodebuild -version": {
				stdout: "Xcode 16.2\nBuild version 16C5032a\n",
				stderr: "",
				exitCode: 0,
			},
		});

		const version = await getXcodeVersion(runner);
		expect(version).toBe("16.2");
	});

	test("returns version for older Xcode format", async () => {
		const runner = createMockRunner({
			"xcodebuild -version": {
				stdout: "Xcode 14.3.1\nBuild version 14E300c\n",
				stderr: "",
				exitCode: 0,
			},
		});

		const version = await getXcodeVersion(runner);
		expect(version).toBe("14.3.1");
	});

	test("returns null when Xcode is not installed", async () => {
		const runner = createMockRunner({
			"xcodebuild -version": {
				stdout: "",
				stderr: "xcode-select: error: tool 'xcodebuild' requires Xcode",
				exitCode: 1,
			},
		});

		const version = await getXcodeVersion(runner);
		expect(version).toBeNull();
	});

	test("returns null for unexpected output format", async () => {
		const runner = createMockRunner({
			"xcodebuild -version": {
				stdout: "Something unexpected\n",
				stderr: "",
				exitCode: 0,
			},
		});

		const version = await getXcodeVersion(runner);
		expect(version).toBeNull();
	});
});

describe("collectIosMetrics", () => {
	const simulatorDevice: Device = {
		id: "ABCD-1234",
		name: "iPhone 16 Pro",
		platform: "ios",
		type: "simulator",
	};

	const physicalDevice: Device = {
		id: "00008110-XXXXXXXXXXXX",
		name: "Roger's iPhone",
		platform: "ios",
		type: "physical",
	};

	test("throws when PID is not found (simulator)", async () => {
		const runner = createMockRunner({
			"pgrep -f com.example.app": {
				stdout: "",
				stderr: "",
				exitCode: 1,
			},
		});

		const { collectIosMetrics } = await import("../collector");

		await expect(collectIosMetrics(runner, simulatorDevice, "com.example.app", 5)).rejects.toThrow(
			/Could not find running process/,
		);
	});

	test("throws when PID is not found (physical)", async () => {
		const runner = createMockRunner({
			"xcrun devicectl device info processes": {
				stdout: JSON.stringify({ result: { runningProcesses: [] } }),
				stderr: "",
				exitCode: 0,
			},
		});

		const { collectIosMetrics } = await import("../collector");

		await expect(collectIosMetrics(runner, physicalDevice, "com.example.app", 5)).rejects.toThrow(
			/Could not find running process/,
		);
	});

	test("throws when xctrace record fails", async () => {
		const runner = createMockRunner({
			"pgrep -f com.example.app": {
				stdout: "12345\n",
				stderr: "",
				exitCode: 0,
			},
			"mkdir -p": {
				stdout: "",
				stderr: "",
				exitCode: 0,
			},
			"xcrun xctrace record": {
				stdout: "",
				stderr: "Recording failed: device not found",
				exitCode: 1,
			},
			"rm -rf": {
				stdout: "",
				stderr: "",
				exitCode: 0,
			},
		});

		const { collectIosMetrics } = await import("../collector");

		await expect(collectIosMetrics(runner, simulatorDevice, "com.example.app", 5)).rejects.toThrow(
			/xctrace record failed/,
		);
	});

	test("throws when xctrace export fails", async () => {
		const runner = createMockRunner({
			"pgrep -f com.example.app": {
				stdout: "12345\n",
				stderr: "",
				exitCode: 0,
			},
			"mkdir -p": {
				stdout: "",
				stderr: "",
				exitCode: 0,
			},
			"xcrun xctrace record": {
				stdout: "",
				stderr: "",
				exitCode: 0,
			},
			"xcrun xctrace export": {
				stdout: "",
				stderr: "Export failed: invalid trace file",
				exitCode: 1,
			},
			"rm -rf": {
				stdout: "",
				stderr: "",
				exitCode: 0,
			},
		});

		const { collectIosMetrics } = await import("../collector");

		await expect(collectIosMetrics(runner, simulatorDevice, "com.example.app", 5)).rejects.toThrow(
			/xctrace export failed/,
		);
	});

	test("simulator: invokes commands in correct order with correct arguments", async () => {
		const invokedCommands: string[] = [];

		const runner: CommandRunner = async (cmd: string, args: string[]) => {
			const key = `${cmd} ${args.join(" ")}`;
			invokedCommands.push(key);

			if (cmd === "xcrun" && args.includes("launchctl")) {
				return {
					stdout: "12345\t0\tUIKitApplication:com.example.app[xx]\n",
					stderr: "",
					exitCode: 0,
				};
			}
			if (cmd === "pgrep") {
				return { stdout: "12345\n", stderr: "", exitCode: 0 };
			}
			if (cmd === "mkdir") {
				return { stdout: "", stderr: "", exitCode: 0 };
			}
			if (cmd === "xcrun" && args[1] === "record") {
				return { stdout: "", stderr: "", exitCode: 0 };
			}
			if (cmd === "xcrun" && args[1] === "export") {
				return { stdout: "", stderr: "", exitCode: 0 };
			}
			if (cmd === "top") {
				return { stdout: "PID    RSIZE\n12345  250M+\n", stderr: "", exitCode: 0 };
			}
			if (cmd === "rm") {
				return { stdout: "", stderr: "", exitCode: 0 };
			}
			return { stdout: "", stderr: "", exitCode: 1 };
		};

		const { collectIosMetrics } = await import("../collector");

		try {
			await collectIosMetrics(runner, simulatorDevice, "com.example.app", 5);
		} catch {
			// Expected — Bun.file() for the temp XML will fail
		}

		// Verify the sequence of commands
		expect(invokedCommands[0]).toContain("launchctl list");
		expect(invokedCommands[1]).toMatch(/^mkdir -p \/tmp\/lanterna-trace-/);
		expect(invokedCommands[2]).toMatch(/^xcrun xctrace record/);
		expect(invokedCommands[2]).toContain("--template Time Profiler");
		expect(invokedCommands[2]).toContain("--attach 12345");
		expect(invokedCommands[2]).toContain("--time-limit 5s");
		expect(invokedCommands[3]).toMatch(/^xcrun xctrace export/);
	});

	test("physical device: uses devicectl for PID and memory", async () => {
		const invokedCommands: string[] = [];

		const devicectlJson = JSON.stringify({
			result: {
				runningProcesses: [
					{
						processIdentifier: 789,
						executable: "/var/containers/Bundle/Application/.../com.example.app",
						memoryUse: 262144000,
					},
				],
			},
		});

		const runner: CommandRunner = async (cmd: string, args: string[]) => {
			const key = `${cmd} ${args.join(" ")}`;
			invokedCommands.push(key);

			if (cmd === "xcrun" && args[0] === "devicectl") {
				return { stdout: devicectlJson, stderr: "", exitCode: 0 };
			}
			if (cmd === "mkdir") {
				return { stdout: "", stderr: "", exitCode: 0 };
			}
			if (cmd === "xcrun" && args[1] === "record") {
				return { stdout: "", stderr: "", exitCode: 0 };
			}
			if (cmd === "xcrun" && args[1] === "export") {
				return { stdout: "", stderr: "", exitCode: 0 };
			}
			if (cmd === "rm") {
				return { stdout: "", stderr: "", exitCode: 0 };
			}
			return { stdout: "", stderr: "", exitCode: 1 };
		};

		const { collectIosMetrics } = await import("../collector");

		try {
			await collectIosMetrics(runner, physicalDevice, "com.example.app", 5);
		} catch {
			// Expected — Bun.file() for the temp XML will fail
		}

		// Should use devicectl for PID discovery, NOT pgrep or simctl
		expect(invokedCommands[0]).toContain("devicectl device info processes");
		expect(invokedCommands.some((c) => c.includes("pgrep"))).toBe(false);
		expect(invokedCommands.some((c) => c.includes("simctl"))).toBe(false);

		// xctrace record should use the on-device PID
		const recordCmd = invokedCommands.find((c) => c.includes("xctrace record"));
		expect(recordCmd).toContain("--attach 789");
	});
});
