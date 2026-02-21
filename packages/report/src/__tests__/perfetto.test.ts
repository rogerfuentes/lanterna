import { describe, expect, test } from "bun:test";
import { type MeasurementSession, MetricType } from "@lanterna/core";
import { formatPerfettoTrace } from "../perfetto";

function makeSession(overrides?: Partial<MeasurementSession>): MeasurementSession {
	return {
		device: {
			id: "test-1",
			name: "Pixel 7",
			platform: "android",
			type: "physical",
		},
		platform: "android",
		duration: 10,
		startedAt: Date.now(),
		samples: [
			{ type: MetricType.UI_FPS, value: 58.5, timestamp: 0, unit: "fps" },
			{
				type: MetricType.UI_FPS,
				value: 55.2,
				timestamp: 1000,
				unit: "fps",
			},
			{ type: MetricType.JS_FPS, value: 57.1, timestamp: 0, unit: "fps" },
			{
				type: MetricType.JS_FPS,
				value: 54.8,
				timestamp: 1000,
				unit: "fps",
			},
			{ type: MetricType.CPU, value: 25.3, timestamp: 0, unit: "%" },
			{ type: MetricType.CPU, value: 30.1, timestamp: 1000, unit: "%" },
			{ type: MetricType.MEMORY, value: 245, timestamp: 0, unit: "MB" },
			{
				type: MetricType.MEMORY,
				value: 260,
				timestamp: 1000,
				unit: "MB",
			},
		],
		...overrides,
	};
}

describe("formatPerfettoTrace", () => {
	test("returns valid structure with traceEvents array", () => {
		const trace = formatPerfettoTrace(makeSession());
		expect(trace).toHaveProperty("traceEvents");
		expect(trace).toHaveProperty("displayTimeUnit");
		expect(trace).toHaveProperty("metadata");
		expect(Array.isArray(trace.traceEvents)).toBe(true);
		expect(trace.displayTimeUnit).toBe("ms");
	});

	test("converts all samples to trace events", () => {
		const session = makeSession();
		const trace = formatPerfettoTrace(session);
		expect(trace.traceEvents).toHaveLength(session.samples.length);
	});

	test("timestamps are in microseconds", () => {
		const trace = formatPerfettoTrace(makeSession());
		const firstEvent = trace.traceEvents[0];
		// First sample timestamp is 0ms => 0us
		expect(firstEvent.ts).toBe(0);

		const secondEvent = trace.traceEvents[1];
		// Second sample timestamp is 1000ms => 1_000_000us
		expect(secondEvent.ts).toBe(1_000_000);
	});

	test("UI FPS events use tid 1", () => {
		const trace = formatPerfettoTrace(makeSession());
		const uiFpsEvents = trace.traceEvents.filter((e) => e.name === "UI FPS");
		expect(uiFpsEvents.length).toBeGreaterThan(0);
		for (const event of uiFpsEvents) {
			expect(event.tid).toBe(1);
		}
	});

	test("JS FPS events use tid 2", () => {
		const trace = formatPerfettoTrace(makeSession());
		const jsFpsEvents = trace.traceEvents.filter((e) => e.name === "JS FPS");
		expect(jsFpsEvents.length).toBeGreaterThan(0);
		for (const event of jsFpsEvents) {
			expect(event.tid).toBe(2);
		}
	});

	test("CPU and Memory events use tid 3", () => {
		const trace = formatPerfettoTrace(makeSession());
		const cpuEvents = trace.traceEvents.filter((e) => e.name === "CPU Usage");
		const memEvents = trace.traceEvents.filter((e) => e.name === "Memory");
		for (const event of [...cpuEvents, ...memEvents]) {
			expect(event.tid).toBe(3);
		}
	});

	test("TTI events use tid 4", () => {
		const session = makeSession({
			samples: [{ type: MetricType.TTI, value: 1.8, timestamp: 0, unit: "s" }],
		});
		const trace = formatPerfettoTrace(session);
		expect(trace.traceEvents[0].tid).toBe(4);
	});

	test("metadata includes device info", () => {
		const trace = formatPerfettoTrace(makeSession());
		expect(trace.metadata.source).toBe("lanterna");
		expect(trace.metadata.device).toBe("Pixel 7");
		expect(trace.metadata.platform).toBe("android");
	});

	test("counter events have phase C", () => {
		const trace = formatPerfettoTrace(makeSession());
		const counterEvents = trace.traceEvents.filter((e) => e.name !== "Frame Drops");
		for (const event of counterEvents) {
			expect(event.ph).toBe("C");
		}
	});

	test("frame drop events have phase i", () => {
		const session = makeSession({
			samples: [
				{
					type: MetricType.FRAME_DROPS,
					value: 5.2,
					timestamp: 500,
					unit: "%",
				},
			],
		});
		const trace = formatPerfettoTrace(session);
		expect(trace.traceEvents[0].ph).toBe("i");
	});

	test("all events use pid 1", () => {
		const trace = formatPerfettoTrace(makeSession());
		for (const event of trace.traceEvents) {
			expect(event.pid).toBe(1);
		}
	});

	test("events include value in args", () => {
		const trace = formatPerfettoTrace(makeSession());
		const firstEvent = trace.traceEvents[0];
		expect(firstEvent.args).toBeDefined();
		expect(firstEvent.args?.value).toBe(58.5);
		expect(firstEvent.args?.unit).toBe("fps");
	});

	test("handles empty samples", () => {
		const session = makeSession({ samples: [] });
		const trace = formatPerfettoTrace(session);
		expect(trace.traceEvents).toHaveLength(0);
	});
});
