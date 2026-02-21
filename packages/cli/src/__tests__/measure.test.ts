import { describe, expect, test } from "bun:test";
import type { CommandRunner } from "@lanterna/core";
import type { MeasureArgs } from "../args";
import { runMeasure } from "../commands/measure";

// Mock runner that simulates a full Android measurement flow
function createMockRunner(): CommandRunner {
	return async (cmd, args) => {
		const key = `${cmd} ${args.join(" ")}`;

		// adb devices -l
		if (key.includes("adb devices")) {
			return {
				stdout:
					"List of devices attached\nemulator-5554          device product:sdk model:Pixel_6 transport_id:1\n",
				stderr: "",
				exitCode: 0,
			};
		}

		// iOS simctl — simulate not available
		if (key.includes("simctl list")) {
			return { stdout: "{}", stderr: "", exitCode: 1 };
		}
		if (key.includes("xctrace list")) {
			return { stdout: "", stderr: "", exitCode: 127 };
		}

		// adb shell pidof
		if (key.includes("pidof")) {
			return { stdout: "12345\n", stderr: "", exitCode: 0 };
		}

		// adb shell top
		if (key.includes("top")) {
			return {
				stdout: [
					"Tasks: 1 total",
					"  PID   TID USER         PR  NI VIRT  RES  SHR S[%CPU] %MEM     TIME+ THREAD",
					"12345 12345 u0_a123      20   0 4.2G 180M  95M S  25.0  4.5   0:12.34 main",
					"12345 12350 u0_a123      20   0 4.2G 180M  95M S  15.0  4.5   0:08.21 mqt_js",
				].join("\n"),
				stderr: "",
				exitCode: 0,
			};
		}

		// dumpsys meminfo
		if (key.includes("meminfo")) {
			return {
				stdout: [
					"Applications Memory Usage (in Kilobytes):",
					"** MEMINFO in pid 12345 [com.example.app] **",
					"                   Pss  Private  Private  SwapPss     Rss  Heap  Heap  Heap",
					"                 Total    Dirty    Clean    Dirty   Total  Size Alloc  Free",
					"                ------   ------   ------   ------  ------  ----  ----  ----",
					"        TOTAL   256000   200000     5000     1000  300000",
				].join("\n"),
				stderr: "",
				exitCode: 0,
			};
		}

		// dumpsys gfxinfo
		if (key.includes("gfxinfo")) {
			return {
				stdout: [
					"Applications Graphics Acceleration Info:",
					"Total frames rendered: 1000",
					"Janky frames: 50 (5.00%)",
				].join("\n"),
				stderr: "",
				exitCode: 0,
			};
		}

		return { stdout: "", stderr: `Unknown command: ${cmd}`, exitCode: 127 };
	};
}

function createNoDeviceRunner(): CommandRunner {
	return async () => ({ stdout: "", stderr: "command not found", exitCode: 127 });
}

describe("runMeasure", () => {
	const baseArgs: MeasureArgs = {
		package: "com.example.app",
		duration: 5,
	};

	test("returns 0 for successful measurement", async () => {
		const exitCode = await runMeasure(baseArgs, createMockRunner());
		expect(exitCode).toBe(0);
	});

	test("returns 1 when no devices found", async () => {
		const exitCode = await runMeasure(baseArgs, createNoDeviceRunner());
		expect(exitCode).toBe(1);
	});

	test("returns 1 for invalid device ID", async () => {
		const args: MeasureArgs = { ...baseArgs, device: "nonexistent" };
		const exitCode = await runMeasure(args, createMockRunner());
		expect(exitCode).toBe(1);
	});

	test("respects --platform filter", async () => {
		const args: MeasureArgs = { ...baseArgs, platform: "ios" };
		// Mock only has android, so iOS filter should fail
		const exitCode = await runMeasure(args, createMockRunner());
		expect(exitCode).toBe(1);
	});

	test("exports JSON when --output specified", async () => {
		const tmpPath = `/tmp/lanterna-test-${Date.now()}.json`;
		const args: MeasureArgs = { ...baseArgs, output: tmpPath };
		const exitCode = await runMeasure(args, createMockRunner());
		expect(exitCode).toBe(0);

		const file = Bun.file(tmpPath);
		expect(await file.exists()).toBe(true);
		const content = JSON.parse(await file.text());
		expect(content.score).toBeDefined();
		expect(content.score.overall).toBeGreaterThanOrEqual(0);
		expect(content.device.platform).toBe("android");

		// Cleanup
		await Bun.write(tmpPath, "");
	});
});
