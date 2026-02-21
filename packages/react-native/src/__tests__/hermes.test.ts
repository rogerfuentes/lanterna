import { describe, expect, test } from "bun:test";
import { MetricType } from "@lanterna/core";
import { hermesToSamples, parseHermesProfile, parseHermesProfileData } from "../hermes";

describe("parseHermesProfile", () => {
	test("returns empty profile for invalid JSON", () => {
		const result = parseHermesProfile("not json");
		expect(result.samples).toHaveLength(0);
		expect(result.durationMs).toBe(0);
		expect(result.jsThreadUtilization).toBe(0);
	});

	test("returns empty profile for empty object", () => {
		const result = parseHermesProfile("{}");
		expect(result.samples).toHaveLength(0);
		expect(result.durationMs).toBe(0);
	});

	test("parses samples array format", () => {
		const data = {
			samples: [
				{ ts: 1000, sf: 1 },
				{ ts: 2000, sf: 2 },
				{ ts: 3000, sf: 1 },
			],
			stackFrames: {
				"1": { name: "render", category: "JavaScript", line: 10, column: 5, funcId: 1 },
				"2": { name: "update", category: "JavaScript", line: 20, column: 3, funcId: 2 },
			},
		};
		const result = parseHermesProfile(JSON.stringify(data));
		expect(result.samples).toHaveLength(3);
		expect(result.durationMs).toBe(2); // 2000us = 2ms
		expect(result.stackFrames["1"].name).toBe("render");
	});

	test("extracts samples from traceEvents format", () => {
		const data = {
			traceEvents: [
				{ ph: "P", ts: 1000, sf: 1 },
				{ ph: "P", ts: 2000, sf: 2 },
				{ ph: "X", ts: 1500, name: "other" }, // non-sample event
			],
		};
		const result = parseHermesProfile(JSON.stringify(data));
		expect(result.samples).toHaveLength(2);
		expect(result.durationMs).toBe(1);
	});

	test("sorts samples by timestamp", () => {
		const data = {
			samples: [
				{ ts: 3000, sf: 1 },
				{ ts: 1000, sf: 2 },
				{ ts: 2000, sf: 1 },
			],
		};
		const result = parseHermesProfile(JSON.stringify(data));
		expect(result.samples[0].ts).toBe(1000);
		expect(result.samples[2].ts).toBe(3000);
	});

	test("returns zero duration for single sample", () => {
		const data = { samples: [{ ts: 1000, sf: 1 }] };
		const result = parseHermesProfile(JSON.stringify(data));
		expect(result.durationMs).toBe(0);
		expect(result.jsThreadUtilization).toBe(0);
	});
});

describe("parseHermesProfileData", () => {
	test("handles null input", () => {
		const result = parseHermesProfileData(null as never);
		expect(result.samples).toHaveLength(0);
	});

	test("calculates js thread utilization", () => {
		// 100 samples over 100ms (1 sample per ms = ~100% utilization)
		const samples = [];
		for (let i = 0; i < 100; i++) {
			samples.push({ ts: i * 1000, sf: 1 }); // 1000us = 1ms apart
		}
		const result = parseHermesProfileData({ samples });
		expect(result.jsThreadUtilization).toBeGreaterThan(90);
	});
});

describe("hermesToSamples", () => {
	test("generates JS_FPS and CPU samples", () => {
		const profile = {
			samples: [],
			stackFrames: {},
			durationMs: 1000,
			jsThreadUtilization: 80,
		};
		const samples = hermesToSamples(profile, 5000);
		expect(samples).toHaveLength(2);

		const jsFps = samples.find((s) => s.type === MetricType.JS_FPS);
		expect(jsFps).toBeDefined();
		expect(jsFps?.value).toBeCloseTo(48, 0); // 80% of 60fps

		const cpu = samples.find((s) => s.type === MetricType.CPU);
		expect(cpu).toBeDefined();
		expect(cpu?.value).toBe(80);
	});

	test("returns empty for zero-duration profile", () => {
		const profile = {
			samples: [],
			stackFrames: {},
			durationMs: 0,
			jsThreadUtilization: 0,
		};
		const samples = hermesToSamples(profile, 5000);
		expect(samples).toHaveLength(0);
	});

	test("caps JS FPS at 60", () => {
		const profile = {
			samples: [],
			stackFrames: {},
			durationMs: 1000,
			jsThreadUtilization: 100,
		};
		const samples = hermesToSamples(profile, 5000);
		const jsFps = samples.find((s) => s.type === MetricType.JS_FPS);
		expect(jsFps?.value).toBeLessThanOrEqual(60);
	});
});
