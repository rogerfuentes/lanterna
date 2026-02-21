import { describe, expect, test } from "bun:test";
import { type MeasurementSession, MetricType } from "@lanterna/core";
import { formatSpeedScopeProfile } from "../speedscope";

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

describe("formatSpeedScopeProfile", () => {
	test("returns valid SpeedScope structure", () => {
		const file = formatSpeedScopeProfile(makeSession());
		expect(file).toHaveProperty("$schema");
		expect(file).toHaveProperty("shared");
		expect(file).toHaveProperty("profiles");
		expect(file).toHaveProperty("name");
		expect(file).toHaveProperty("activeProfileIndex");
		expect(file).toHaveProperty("exporter");
	});

	test("$schema is correct SpeedScope URL", () => {
		const file = formatSpeedScopeProfile(makeSession());
		expect(file.$schema).toBe(
			"https://www.speedscope.app/file/speedscope/0.0.1/speedscope.schema.json",
		);
	});

	test("creates one profile per metric type", () => {
		const file = formatSpeedScopeProfile(makeSession());
		// Mock session has 4 metric types: UI_FPS, JS_FPS, CPU, MEMORY
		expect(file.profiles).toHaveLength(4);
	});

	test("profile names match metric labels", () => {
		const file = formatSpeedScopeProfile(makeSession());
		const names = file.profiles.map((p) => p.name);
		expect(names).toContain("UI FPS");
		expect(names).toContain("JS FPS");
		expect(names).toContain("CPU Usage");
		expect(names).toContain("Memory");
	});

	test("frames contain metric readings", () => {
		const file = formatSpeedScopeProfile(makeSession());
		const frameNames = file.shared.frames.map((f) => f.name);
		expect(frameNames).toContain("UI FPS: 58.5");
		expect(frameNames).toContain("UI FPS: 55.2");
		expect(frameNames).toContain("JS FPS: 57.1");
	});

	test("events have valid O/C pairs", () => {
		const file = formatSpeedScopeProfile(makeSession());
		for (const profile of file.profiles) {
			// Each profile should have even number of events (O + C pairs)
			expect(profile.events.length % 2).toBe(0);

			for (let i = 0; i < profile.events.length; i += 2) {
				expect(profile.events[i].type).toBe("O");
				expect(profile.events[i + 1].type).toBe("C");
			}
		}
	});

	test("close events come after open events", () => {
		const file = formatSpeedScopeProfile(makeSession());
		for (const profile of file.profiles) {
			for (let i = 0; i < profile.events.length; i += 2) {
				const open = profile.events[i];
				const close = profile.events[i + 1];
				expect(close.at).toBeGreaterThanOrEqual(open.at);
			}
		}
	});

	test("exporter is lanterna@0.0.1", () => {
		const file = formatSpeedScopeProfile(makeSession());
		expect(file.exporter).toBe("lanterna@0.0.1");
	});

	test("name includes device name", () => {
		const file = formatSpeedScopeProfile(makeSession());
		expect(file.name).toBe("Lanterna - Pixel 7");
	});

	test("activeProfileIndex is 0", () => {
		const file = formatSpeedScopeProfile(makeSession());
		expect(file.activeProfileIndex).toBe(0);
	});

	test("profiles have correct unit", () => {
		const file = formatSpeedScopeProfile(makeSession());
		for (const profile of file.profiles) {
			expect(profile.unit).toBe("milliseconds");
			expect(profile.type).toBe("evented");
		}
	});

	test("handles empty samples", () => {
		const session = makeSession({ samples: [] });
		const file = formatSpeedScopeProfile(session);
		expect(file.profiles).toHaveLength(0);
		expect(file.shared.frames).toHaveLength(0);
	});

	test("handles single metric type", () => {
		const session = makeSession({
			samples: [
				{
					type: MetricType.CPU,
					value: 25.3,
					timestamp: 0,
					unit: "%",
				},
				{
					type: MetricType.CPU,
					value: 30.1,
					timestamp: 1000,
					unit: "%",
				},
			],
		});
		const file = formatSpeedScopeProfile(session);
		expect(file.profiles).toHaveLength(1);
		expect(file.profiles[0].name).toBe("CPU Usage");
	});

	test("frame indices reference correct frames", () => {
		const file = formatSpeedScopeProfile(makeSession());
		for (const profile of file.profiles) {
			for (const event of profile.events) {
				expect(event.frame).toBeGreaterThanOrEqual(0);
				expect(event.frame).toBeLessThan(file.shared.frames.length);
			}
		}
	});
});
