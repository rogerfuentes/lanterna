import { describe, expect, test } from "bun:test";
import { MetricType } from "@lanterna/core";
import { calculateFps, fpsToSamples } from "../fps";

describe("calculateFps", () => {
	test("returns zeros for empty timestamps", () => {
		const result = calculateFps({ timestamps: [], targetIntervalMs: 16.667 });
		expect(result.fps).toBe(0);
		expect(result.droppedFrames).toBe(0);
		expect(result.totalFrames).toBe(0);
	});

	test("returns zeros for single timestamp", () => {
		const result = calculateFps({ timestamps: [100], targetIntervalMs: 16.667 });
		expect(result.fps).toBe(0);
		expect(result.totalFrames).toBe(0);
	});

	test("calculates 60fps from perfect 16.67ms intervals", () => {
		const timestamps: number[] = [];
		for (let i = 0; i < 61; i++) {
			timestamps.push(i * 16.667);
		}
		const result = calculateFps({ timestamps, targetIntervalMs: 16.667 });
		expect(result.fps).toBeCloseTo(60, 0);
		expect(result.droppedFrames).toBe(0);
		expect(result.dropRate).toBe(0);
	});

	test("calculates 30fps from 33.33ms intervals", () => {
		const timestamps: number[] = [];
		for (let i = 0; i < 31; i++) {
			timestamps.push(i * 33.333);
		}
		const result = calculateFps({ timestamps, targetIntervalMs: 16.667 });
		expect(result.fps).toBeCloseTo(30, 0);
	});

	test("detects dropped frames when interval exceeds 2x target", () => {
		// 10 good frames at 16.67ms, then one 50ms gap, then 10 more good frames
		const timestamps: number[] = [];
		for (let i = 0; i < 10; i++) {
			timestamps.push(i * 16.667);
		}
		timestamps.push(9 * 16.667 + 50); // dropped frame
		for (let i = 1; i <= 10; i++) {
			timestamps.push(9 * 16.667 + 50 + i * 16.667);
		}
		const result = calculateFps({ timestamps, targetIntervalMs: 16.667 });
		expect(result.droppedFrames).toBe(1);
		expect(result.dropRate).toBeGreaterThan(0);
	});

	test("handles unsorted timestamps", () => {
		const timestamps = [50, 0, 100, 150, 200];
		const result = calculateFps({ timestamps, targetIntervalMs: 16.667 });
		expect(result.fps).toBeGreaterThan(0);
		expect(result.totalFrames).toBe(4);
	});

	test("handles identical timestamps", () => {
		const result = calculateFps({ timestamps: [100, 100, 100], targetIntervalMs: 16.667 });
		expect(result.fps).toBe(0);
	});
});

describe("fpsToSamples", () => {
	test("creates UI_FPS and FRAME_DROPS samples", () => {
		const result = { fps: 58.5, droppedFrames: 2, totalFrames: 100, dropRate: 2.0 };
		const samples = fpsToSamples(result, 1000);
		expect(samples).toHaveLength(2);
		expect(samples[0].type).toBe(MetricType.UI_FPS);
		expect(samples[0].value).toBe(58.5);
		expect(samples[1].type).toBe(MetricType.FRAME_DROPS);
		expect(samples[1].value).toBe(2.0);
	});

	test("returns empty for zero fps", () => {
		const result = { fps: 0, droppedFrames: 0, totalFrames: 0, dropRate: 0 };
		const samples = fpsToSamples(result, 1000);
		expect(samples).toHaveLength(0);
	});

	test("includes timestamp in samples", () => {
		const result = { fps: 60, droppedFrames: 0, totalFrames: 100, dropRate: 0 };
		const samples = fpsToSamples(result, 42000);
		for (const sample of samples) {
			expect(sample.timestamp).toBe(42000);
		}
	});
});
