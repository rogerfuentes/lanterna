import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { CommandRunner } from "@lanternajs/core";
import type { TestArgs } from "../args";
import { runTest } from "../commands/test";

const SAMPLE_YAML = `
appId: "com.example.app"
---
- launchApp
- tapOn: "Login"
- assertVisible: "Welcome"
`.trim();

// Reuses the same mock runner pattern from measure.test.ts,
// extended with maestro support
function createMockRunner(options?: {
	maestroExitCode?: number;
	maestroOutput?: string;
}): CommandRunner {
	const { maestroExitCode = 0, maestroOutput = "All tests passed" } = options ?? {};

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

		// maestro test
		if (cmd === "maestro") {
			return { stdout: maestroOutput, stderr: "", exitCode: maestroExitCode };
		}

		return { stdout: "", stderr: `Unknown command: ${cmd}`, exitCode: 127 };
	};
}

function makeTestArgs(overrides?: Partial<TestArgs>): TestArgs {
	return {
		package: "",
		duration: 5,
		maestro: "/tmp/lanterna-test-flow.yaml",
		...overrides,
	};
}

// Capture console output
let consoleOutput: string[];
let consoleErrors: string[];
const originalLog = console.log;
const originalError = console.error;

beforeEach(() => {
	consoleOutput = [];
	consoleErrors = [];
	console.log = (...args: unknown[]) => {
		consoleOutput.push(args.map(String).join(" "));
	};
	console.error = (...args: unknown[]) => {
		consoleErrors.push(args.map(String).join(" "));
	};
});

afterEach(() => {
	console.log = originalLog;
	console.error = originalError;
});

describe("runTest", () => {
	test("renders a report on success", async () => {
		const tempPath = `/tmp/lanterna-test-flow-${Date.now()}.yaml`;
		await Bun.write(tempPath, SAMPLE_YAML);

		const args = makeTestArgs({ maestro: tempPath });
		const exitCode = await runTest(args, createMockRunner());

		expect(exitCode).toBe(0);
		const allOutput = consoleOutput.join("\n");
		expect(allOutput).toContain("lanterna");
		expect(allOutput).toContain("Score");
	});

	test("returns exit code 1 when maestro fails", async () => {
		const tempPath = `/tmp/lanterna-test-flow-fail-${Date.now()}.yaml`;
		await Bun.write(tempPath, SAMPLE_YAML);

		const args = makeTestArgs({ maestro: tempPath });
		const exitCode = await runTest(
			args,
			createMockRunner({ maestroExitCode: 1, maestroOutput: "Step 2 failed" }),
		);

		expect(exitCode).toBe(1);
		const errorOutput = consoleErrors.join("\n");
		expect(errorOutput).toContain("FAILED");
	});

	test("returns exit code 1 when flow file not found", async () => {
		const args = makeTestArgs({ maestro: "/tmp/nonexistent-flow-12345.yaml" });
		const exitCode = await runTest(args, createMockRunner());

		expect(exitCode).toBe(1);
	});

	test("uses appId from flow as package name when no --package provided", async () => {
		const tempPath = `/tmp/lanterna-test-flow-appid-${Date.now()}.yaml`;
		await Bun.write(tempPath, SAMPLE_YAML);

		// package is empty — should fall back to appId "com.example.app"
		const args = makeTestArgs({ maestro: tempPath, package: "" });
		const exitCode = await runTest(args, createMockRunner());

		// Should succeed because appId is used as package name
		expect(exitCode).toBe(0);
	});

	test("returns exit code 1 when no appId and no package", async () => {
		const tempPath = `/tmp/lanterna-test-flow-noappid-${Date.now()}.yaml`;
		await Bun.write(tempPath, "---\n- launchApp\n");

		const args = makeTestArgs({ maestro: tempPath, package: "" });
		const exitCode = await runTest(args, createMockRunner());

		expect(exitCode).toBe(1);
	});

	test("exports JSON when --output is specified", async () => {
		const tempFlowPath = `/tmp/lanterna-test-flow-json-${Date.now()}.yaml`;
		const tempOutputPath = `/tmp/lanterna-test-output-${Date.now()}.json`;
		await Bun.write(tempFlowPath, SAMPLE_YAML);

		const args = makeTestArgs({ maestro: tempFlowPath, output: tempOutputPath });
		const exitCode = await runTest(args, createMockRunner());

		expect(exitCode).toBe(0);

		const outputFile = Bun.file(tempOutputPath);
		expect(await outputFile.exists()).toBe(true);

		const content = JSON.parse(await outputFile.text());
		expect(content).toHaveProperty("device");
		expect(content).toHaveProperty("score");
		expect(content.score.overall).toBeGreaterThanOrEqual(0);
		expect(content.device.platform).toBe("android");
	});

	test("shows maestro pass status on success", async () => {
		const tempPath = `/tmp/lanterna-test-flow-pass-${Date.now()}.yaml`;
		await Bun.write(tempPath, SAMPLE_YAML);

		const args = makeTestArgs({ maestro: tempPath });
		await runTest(args, createMockRunner());

		const allOutput = consoleOutput.join("\n");
		expect(allOutput).toContain("Maestro: PASSED");
	});
});
