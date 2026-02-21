import { describe, expect, test } from "bun:test";
import type { MeasureArgs, TestArgs } from "../args";
import { parseArgs } from "../args";

describe("parseArgs — measure", () => {
	test("parses basic measure command", () => {
		const result = parseArgs(["measure", "com.example.app"]);
		expect(result).not.toBeNull();
		expect(result?.command).toBe("measure");
		const args = result?.args as MeasureArgs;
		expect(args.package).toBe("com.example.app");
		expect(args.duration).toBe(10);
	});

	test("parses --duration flag", () => {
		const result = parseArgs(["measure", "com.example.app", "--duration", "15"]);
		expect((result?.args as MeasureArgs).duration).toBe(15);
	});

	test("parses --duration with s suffix", () => {
		const result = parseArgs(["measure", "com.example.app", "--duration", "30s"]);
		expect((result?.args as MeasureArgs).duration).toBe(30);
	});

	test("parses --platform flag", () => {
		const result = parseArgs(["measure", "com.example.app", "--platform", "ios"]);
		expect((result?.args as MeasureArgs).platform).toBe("ios");
	});

	test("parses --device flag", () => {
		const result = parseArgs(["measure", "com.example.app", "--device", "emulator-5554"]);
		expect((result?.args as MeasureArgs).device).toBe("emulator-5554");
	});

	test("parses --output flag", () => {
		const result = parseArgs(["measure", "com.example.app", "--output", "report.json"]);
		expect((result?.args as MeasureArgs).output).toBe("report.json");
	});

	test("parses short flags", () => {
		const result = parseArgs([
			"measure",
			"com.example.app",
			"-d",
			"5",
			"-p",
			"android",
			"-o",
			"out.json",
		]);
		const args = result?.args as MeasureArgs;
		expect(args.duration).toBe(5);
		expect(args.platform).toBe("android");
		expect(args.output).toBe("out.json");
	});

	test("parses all flags combined", () => {
		const result = parseArgs([
			"measure",
			"com.example.app",
			"--duration",
			"20s",
			"--platform",
			"android",
			"--device",
			"R5CR10XXXXX",
			"--output",
			"report.json",
		]);
		expect(result?.args).toEqual({
			package: "com.example.app",
			duration: 20,
			platform: "android",
			device: "R5CR10XXXXX",
			output: "report.json",
		});
	});

	test("returns null for --help", () => {
		const result = parseArgs(["--help"]);
		expect(result).toBeNull();
	});

	test("returns null for empty args", () => {
		const result = parseArgs([]);
		expect(result).toBeNull();
	});

	test("returns null for unknown command", () => {
		const result = parseArgs(["unknown"]);
		expect(result).toBeNull();
	});

	test("throws for missing package", () => {
		expect(() => parseArgs(["measure"])).toThrow("Package name is required");
	});

	test("throws for invalid duration", () => {
		expect(() => parseArgs(["measure", "com.example.app", "--duration", "abc"])).toThrow(
			"Invalid duration",
		);
	});

	test("throws for invalid platform", () => {
		expect(() => parseArgs(["measure", "com.example.app", "--platform", "windows"])).toThrow(
			"Invalid platform",
		);
	});

	test("throws for unknown option", () => {
		expect(() => parseArgs(["measure", "com.example.app", "--unknown"])).toThrow("Unknown option");
	});
});

describe("parseArgs — test", () => {
	test("parses basic test command with --maestro", () => {
		const result = parseArgs(["test", "--maestro", "flow.yaml"]);
		expect(result).not.toBeNull();
		expect(result?.command).toBe("test");
		const args = result?.args as TestArgs;
		expect(args.maestro).toBe("flow.yaml");
		expect(args.duration).toBe(10);
		expect(args.package).toBe("");
	});

	test("parses test command with all flags", () => {
		const result = parseArgs([
			"test",
			"--maestro",
			"login-flow.yaml",
			"--duration",
			"30",
			"--platform",
			"android",
			"--device",
			"emulator-5554",
			"--output",
			"report.json",
		]);
		expect(result).not.toBeNull();
		const args = result?.args as TestArgs;
		expect(args.maestro).toBe("login-flow.yaml");
		expect(args.duration).toBe(30);
		expect(args.platform).toBe("android");
		expect(args.device).toBe("emulator-5554");
		expect(args.output).toBe("report.json");
	});

	test("parses test command with short flags", () => {
		const result = parseArgs(["test", "-m", "flow.yaml", "-d", "5", "-p", "ios"]);
		expect(result).not.toBeNull();
		const args = result?.args as TestArgs;
		expect(args.maestro).toBe("flow.yaml");
		expect(args.duration).toBe(5);
		expect(args.platform).toBe("ios");
	});

	test("throws when --maestro is missing for test command", () => {
		expect(() => parseArgs(["test"])).toThrow("--maestro flag is required");
	});

	test("allows package as positional argument", () => {
		const result = parseArgs(["test", "com.example.app", "--maestro", "flow.yaml"]);
		expect(result).not.toBeNull();
		const args = result?.args as TestArgs;
		expect(args.package).toBe("com.example.app");
		expect(args.maestro).toBe("flow.yaml");
	});

	test("does not require package for test command", () => {
		const result = parseArgs(["test", "--maestro", "flow.yaml"]);
		expect(result).not.toBeNull();
		const args = result?.args as TestArgs;
		expect(args.package).toBe("");
	});
});
