import { describe, expect, test } from "bun:test";
import { type CommandRunner, type Device, MetricType } from "@lanterna/core";
import { collectAndroidMetrics } from "../collector";
import { parseGfxinfoOutput } from "../parsers/gfxinfo";
import { parseMeminfoOutput } from "../parsers/meminfo";
import { parseTopOutput } from "../parsers/top";
import { findAndroidPid } from "../process";

// ── Fixtures ────────────────────────────────────────────────────────────────────

const TOP_OUTPUT = `Tasks: 1 total,   0 running,   1 sleeping,   0 stopped,   0 zombie
  PID   TID USER         PR  NI VIRT  RES  SHR S[%CPU] %MEM     TIME+ THREAD
12345 12345 u0_a123      20   0 4.2G 180M  95M S  25.0  4.5   0:12.34 main
12345 12350 u0_a123      20   0 4.2G 180M  95M S  15.3  4.5   0:08.21 mqt_js
12345 12351 u0_a123      20   0 4.2G 180M  95M S   8.7  4.5   0:05.10 RenderThread`;

const MEMINFO_OUTPUT = `Applications Memory Usage (in Kilobytes):
Uptime: 123456 Realtime: 654321

** MEMINFO in pid 12345 [com.example.app] **
                   Pss  Private  Private  SwapPss     Rss  Heap  Heap  Heap
                 Total    Dirty    Clean    Dirty   Total  Size Alloc  Free
                ------   ------   ------   ------  ------  ----  ----  ----
  Native Heap    45678    45000      200      100   50000 65536 50000 15536
  Dalvik Heap    12345    12000      100       50   15000 20480 12345  8135
        TOTAL   120000   100000     5000     1000  150000`;

const GFXINFO_OUTPUT = `Applications Graphics Acceleration Info:
com.example.app/com.example.app.MainActivity:

Total frames rendered: 1500
Janky frames: 75 (5.00%)
Number of missed Vsync: 30
Number of High input latency: 10
Number of Slow UI thread: 25
Number of Slow bitmap uploads: 5
Number of Slow issue draw commands: 5`;

const MOCK_DEVICE: Device = {
	id: "emulator-5554",
	name: "Pixel 6 API 33",
	platform: "android",
	type: "emulator",
};

// ── parseTopOutput ──────────────────────────────────────────────────────────────

describe("parseTopOutput", () => {
	test("sums all thread CPU values into one sample", () => {
		const samples = parseTopOutput(TOP_OUTPUT, 1000);

		expect(samples).toHaveLength(1);
		expect(samples[0].type).toBe(MetricType.CPU);
		expect(samples[0].value).toBeCloseTo(49.0, 1); // 25.0 + 15.3 + 8.7
		expect(samples[0].timestamp).toBe(1000);
		expect(samples[0].unit).toBe("%");
	});

	test("returns empty array for empty input", () => {
		expect(parseTopOutput("", 1000)).toEqual([]);
	});

	test("returns empty array for malformed input", () => {
		expect(parseTopOutput("some random text\nwith no data", 1000)).toEqual([]);
	});

	test("returns empty array for null/undefined-like input", () => {
		expect(parseTopOutput(null as unknown as string, 1000)).toEqual([]);
		expect(parseTopOutput(undefined as unknown as string, 1000)).toEqual([]);
	});

	test("handles single thread output", () => {
		const singleThread = `Tasks: 1 total,   0 running,   1 sleeping,   0 stopped,   0 zombie
  PID   TID USER         PR  NI VIRT  RES  SHR S[%CPU] %MEM     TIME+ THREAD
12345 12345 u0_a123      20   0 4.2G 180M  95M S  42.5  4.5   0:12.34 main`;

		const samples = parseTopOutput(singleThread, 2000);
		expect(samples).toHaveLength(1);
		expect(samples[0].value).toBeCloseTo(42.5, 1);
	});
});

// ── parseMeminfoOutput ──────────────────────────────────────────────────────────

describe("parseMeminfoOutput", () => {
	test("extracts TOTAL Pss and converts KB to MB", () => {
		const samples = parseMeminfoOutput(MEMINFO_OUTPUT, 1000);

		expect(samples).toHaveLength(1);
		expect(samples[0].type).toBe(MetricType.MEMORY);
		expect(samples[0].value).toBeCloseTo(120000 / 1024, 2); // ~117.19 MB
		expect(samples[0].timestamp).toBe(1000);
		expect(samples[0].unit).toBe("MB");
	});

	test("returns empty array for empty input", () => {
		expect(parseMeminfoOutput("", 1000)).toEqual([]);
	});

	test("returns empty array for malformed input", () => {
		expect(parseMeminfoOutput("no total line here\njust garbage", 1000)).toEqual([]);
	});

	test("returns empty array for null/undefined-like input", () => {
		expect(parseMeminfoOutput(null as unknown as string, 1000)).toEqual([]);
		expect(parseMeminfoOutput(undefined as unknown as string, 1000)).toEqual([]);
	});

	test("handles TOTAL line with different spacing", () => {
		const output = "  TOTAL     98765   50000   2000   500  100000";
		const samples = parseMeminfoOutput(output, 3000);

		expect(samples).toHaveLength(1);
		expect(samples[0].value).toBeCloseTo(98765 / 1024, 2);
	});
});

// ── parseGfxinfoOutput ──────────────────────────────────────────────────────────

describe("parseGfxinfoOutput", () => {
	test("calculates FPS and frame drop rate", () => {
		const samples = parseGfxinfoOutput(GFXINFO_OUTPUT, 1000);

		expect(samples).toHaveLength(2);

		const fpsSample = samples.find((s) => s.type === MetricType.UI_FPS);
		const dropSample = samples.find((s) => s.type === MetricType.FRAME_DROPS);

		expect(fpsSample).toBeDefined();
		expect(fpsSample?.value).toBeCloseTo(57.0, 1); // 60 * (1 - 5/100) = 57
		expect(fpsSample?.unit).toBe("fps");
		expect(fpsSample?.timestamp).toBe(1000);

		expect(dropSample).toBeDefined();
		expect(dropSample?.value).toBe(5.0);
		expect(dropSample?.unit).toBe("%");
	});

	test("returns empty array for empty input", () => {
		expect(parseGfxinfoOutput("", 1000)).toEqual([]);
	});

	test("returns empty array for malformed input", () => {
		expect(parseGfxinfoOutput("no gfx data here", 1000)).toEqual([]);
	});

	test("returns empty array for null/undefined-like input", () => {
		expect(parseGfxinfoOutput(null as unknown as string, 1000)).toEqual([]);
		expect(parseGfxinfoOutput(undefined as unknown as string, 1000)).toEqual([]);
	});

	test("returns empty array when only total frames present but no janky", () => {
		const partial = "Total frames rendered: 1000\n";
		expect(parseGfxinfoOutput(partial, 1000)).toEqual([]);
	});

	test("handles 0% janky frames", () => {
		const output = `Total frames rendered: 500
Janky frames: 0 (0.00%)`;
		const samples = parseGfxinfoOutput(output, 1000);

		expect(samples).toHaveLength(2);
		const fpsSample = samples.find((s) => s.type === MetricType.UI_FPS);
		expect(fpsSample?.value).toBeCloseTo(60.0, 1);
	});
});

// ── findAndroidPid ──────────────────────────────────────────────────────────────

describe("findAndroidPid", () => {
	test("returns PID when process is found", async () => {
		const runner: CommandRunner = async () => ({
			stdout: "12345\n",
			stderr: "",
			exitCode: 0,
		});

		const pid = await findAndroidPid(runner, "emulator-5554", "com.example.app");
		expect(pid).toBe(12345);
	});

	test("returns null when process is not found", async () => {
		const runner: CommandRunner = async () => ({
			stdout: "",
			stderr: "",
			exitCode: 1,
		});

		const pid = await findAndroidPid(runner, "emulator-5554", "com.example.app");
		expect(pid).toBeNull();
	});

	test("returns null on empty stdout", async () => {
		const runner: CommandRunner = async () => ({
			stdout: "   \n",
			stderr: "",
			exitCode: 0,
		});

		const pid = await findAndroidPid(runner, "emulator-5554", "com.example.app");
		expect(pid).toBeNull();
	});

	test("returns null when runner throws", async () => {
		const runner: CommandRunner = async () => {
			throw new Error("adb not found");
		};

		const pid = await findAndroidPid(runner, "emulator-5554", "com.example.app");
		expect(pid).toBeNull();
	});

	test("passes correct arguments to runner", async () => {
		let capturedCmd = "";
		let capturedArgs: string[] = [];

		const runner: CommandRunner = async (cmd, args) => {
			capturedCmd = cmd;
			capturedArgs = args;
			return { stdout: "99999\n", stderr: "", exitCode: 0 };
		};

		await findAndroidPid(runner, "device-123", "com.test.pkg");
		expect(capturedCmd).toBe("adb");
		expect(capturedArgs).toEqual(["-s", "device-123", "shell", "pidof", "com.test.pkg"]);
	});
});

// ── collectAndroidMetrics ───────────────────────────────────────────────────────

describe("collectAndroidMetrics", () => {
	test("collects and merges all metric samples", async () => {
		const runner: CommandRunner = async (_cmd, args) => {
			const fullCommand = args.join(" ");

			if (fullCommand.includes("pidof")) {
				return { stdout: "12345\n", stderr: "", exitCode: 0 };
			}
			if (fullCommand.includes("top")) {
				return { stdout: TOP_OUTPUT, stderr: "", exitCode: 0 };
			}
			if (fullCommand.includes("meminfo")) {
				return { stdout: MEMINFO_OUTPUT, stderr: "", exitCode: 0 };
			}
			if (fullCommand.includes("gfxinfo")) {
				return { stdout: GFXINFO_OUTPUT, stderr: "", exitCode: 0 };
			}

			return { stdout: "", stderr: "", exitCode: 1 };
		};

		const session = await collectAndroidMetrics(runner, MOCK_DEVICE, "com.example.app", 5);

		expect(session.device).toBe(MOCK_DEVICE);
		expect(session.platform).toBe("android");
		expect(session.duration).toBe(5);
		expect(typeof session.startedAt).toBe("number");

		// Should have: 1 CPU sample (from top), 1 MEMORY (from meminfo), 1 UI_FPS + 1 FRAME_DROPS (from gfxinfo)
		const cpuSamples = session.samples.filter((s) => s.type === MetricType.CPU);
		const memorySamples = session.samples.filter((s) => s.type === MetricType.MEMORY);
		const fpsSamples = session.samples.filter((s) => s.type === MetricType.UI_FPS);
		const dropSamples = session.samples.filter((s) => s.type === MetricType.FRAME_DROPS);

		expect(cpuSamples.length).toBeGreaterThanOrEqual(1);
		expect(memorySamples).toHaveLength(1);
		expect(fpsSamples).toHaveLength(1);
		expect(dropSamples).toHaveLength(1);
	});

	test("throws when PID is not found", async () => {
		const runner: CommandRunner = async () => ({
			stdout: "",
			stderr: "",
			exitCode: 1,
		});

		expect(collectAndroidMetrics(runner, MOCK_DEVICE, "com.nonexistent.app", 5)).rejects.toThrow(
			/Process not found/,
		);
	});

	test("returns session with empty samples when commands fail", async () => {
		const runner: CommandRunner = async (_cmd, args) => {
			const fullCommand = args.join(" ");

			if (fullCommand.includes("pidof")) {
				return { stdout: "12345\n", stderr: "", exitCode: 0 };
			}

			// All other commands fail
			return { stdout: "", stderr: "error", exitCode: 1 };
		};

		const session = await collectAndroidMetrics(runner, MOCK_DEVICE, "com.example.app", 5);
		expect(session.samples).toEqual([]);
		expect(session.platform).toBe("android");
	});

	test("passes correct adb arguments for each command", async () => {
		const capturedCalls: { cmd: string; args: string[] }[] = [];

		const runner: CommandRunner = async (cmd, args) => {
			capturedCalls.push({ cmd, args: [...args] });
			const fullCommand = args.join(" ");

			if (fullCommand.includes("pidof")) {
				return { stdout: "12345\n", stderr: "", exitCode: 0 };
			}
			return { stdout: "", stderr: "", exitCode: 1 };
		};

		await collectAndroidMetrics(runner, MOCK_DEVICE, "com.example.app", 10);

		// First call is pidof
		const pidCall = capturedCalls[0];
		expect(pidCall.cmd).toBe("adb");
		expect(pidCall.args).toContain("-s");
		expect(pidCall.args).toContain("emulator-5554");

		// Should have top, meminfo, gfxinfo calls
		const topCall = capturedCalls.find((c) => c.args.includes("top"));
		expect(topCall).toBeDefined();
		expect(topCall?.args).toContain("-p");
		expect(topCall?.args).toContain("12345");
		expect(topCall?.args).toContain("-n");
		expect(topCall?.args).toContain("10");

		const meminfoCall = capturedCalls.find((c) => c.args.includes("meminfo"));
		expect(meminfoCall).toBeDefined();
		expect(meminfoCall?.args).toContain("com.example.app");

		const gfxinfoCall = capturedCalls.find((c) => c.args.includes("gfxinfo"));
		expect(gfxinfoCall).toBeDefined();
		expect(gfxinfoCall?.args).toContain("com.example.app");
	});

	test("includes descriptive error message when process not found", async () => {
		const runner: CommandRunner = async () => ({
			stdout: "",
			stderr: "",
			exitCode: 1,
		});

		try {
			await collectAndroidMetrics(runner, MOCK_DEVICE, "com.example.app", 5);
			expect(true).toBe(false); // Should not reach here
		} catch (err) {
			const msg = (err as Error).message;
			expect(msg).toContain("com.example.app");
			expect(msg).toContain("Pixel 6 API 33");
			expect(msg).toContain("emulator-5554");
		}
	});
});
