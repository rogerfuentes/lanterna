import { describe, expect, test } from "bun:test";
import type { CommandRunner, Device } from "@lanternajs/core";
import { findIosPid } from "../process";
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
	test("returns PID when process is found", async () => {
		const runner = createMockRunner({
			"pgrep -f com.example.app": {
				stdout: "12345\n",
				stderr: "",
				exitCode: 0,
			},
		});

		const pid = await findIosPid(runner, "device-1", "com.example.app");
		expect(pid).toBe(12345);
	});

	test("returns first PID when multiple processes match", async () => {
		const runner = createMockRunner({
			"pgrep -f com.example.app": {
				stdout: "12345\n12346\n12347\n",
				stderr: "",
				exitCode: 0,
			},
		});

		const pid = await findIosPid(runner, "device-1", "com.example.app");
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

		const pid = await findIosPid(runner, "device-1", "com.example.app");
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

		const pid = await findIosPid(runner, "device-1", "com.example.app");
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

		const pid = await findIosPid(runner, "device-1", "com.example.app");
		expect(pid).toBeNull();
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
	const mockDevice: Device = {
		id: "ABCD-1234",
		name: "iPhone 16 Pro",
		platform: "ios",
		type: "simulator",
	};

	test("throws when PID is not found", async () => {
		const runner = createMockRunner({
			"pgrep -f com.example.app": {
				stdout: "",
				stderr: "",
				exitCode: 1,
			},
		});

		const { collectIosMetrics } = await import("../collector");

		await expect(collectIosMetrics(runner, mockDevice, "com.example.app", 5)).rejects.toThrow(
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

		await expect(collectIosMetrics(runner, mockDevice, "com.example.app", 5)).rejects.toThrow(
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

		await expect(collectIosMetrics(runner, mockDevice, "com.example.app", 5)).rejects.toThrow(
			/xctrace export failed/,
		);
	});

	test("invokes commands in correct order with correct arguments", async () => {
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
				// This will fail because Bun.file won't find the temp file,
				// but we can verify the command sequence up to this point
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

		// The collector will fail at Bun.file().text() since the trace file
		// doesn't actually exist, but we can verify the commands it tries to run
		try {
			await collectIosMetrics(runner, mockDevice, "com.example.app", 5);
		} catch {
			// Expected — Bun.file() for the temp XML will fail
		}

		// Verify the sequence of commands
		// Command 0: simctl launchctl list (PID discovery)
		expect(invokedCommands[0]).toContain("launchctl list");
		// Command 1: mkdir for temp trace dir
		expect(invokedCommands[1]).toMatch(/^mkdir -p \/tmp\/lanterna-trace-/);
		// Command 2: xctrace record
		expect(invokedCommands[2]).toMatch(/^xcrun xctrace record/);
		expect(invokedCommands[2]).toContain("--template Time Profiler");
		expect(invokedCommands[2]).toContain("--attach 12345");
		expect(invokedCommands[2]).toContain("--time-limit 5s");
		// Command 3: xctrace export
		expect(invokedCommands[3]).toMatch(/^xcrun xctrace export/);
	});
});
