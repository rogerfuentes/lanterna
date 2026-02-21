import { describe, expect, test } from "bun:test";
import { calculateScore, scoreMetric } from "../scoring";
import { METRIC_WEIGHTS } from "../thresholds";
import type { Device, MeasurementSession, MetricSample } from "../types";
import { MetricType, ScoreCategory } from "../types";

const device: Device = {
	id: "test-device",
	name: "Test Device",
	platform: "android",
	type: "emulator",
};

function makeSample(type: MetricType, value: number): MetricSample {
	return { type, value, timestamp: Date.now(), unit: "" };
}

function makeSession(samples: MetricSample[]): MeasurementSession {
	return { device, platform: "android", samples, duration: 10, startedAt: Date.now() };
}

describe("scoreMetric", () => {
	test("FPS at good threshold returns 100", () => {
		expect(scoreMetric(MetricType.UI_FPS, 57)).toBe(100);
		expect(scoreMetric(MetricType.UI_FPS, 60)).toBe(100);
	});

	test("FPS at poor threshold returns 0", () => {
		expect(scoreMetric(MetricType.UI_FPS, 45)).toBe(0);
		expect(scoreMetric(MetricType.UI_FPS, 30)).toBe(0);
	});

	test("FPS between thresholds interpolates", () => {
		const score = scoreMetric(MetricType.UI_FPS, 51);
		expect(score).toBe(50);
	});

	test("CPU at good threshold returns 100", () => {
		expect(scoreMetric(MetricType.CPU, 30)).toBe(100);
		expect(scoreMetric(MetricType.CPU, 10)).toBe(100);
	});

	test("CPU at poor threshold returns 0", () => {
		expect(scoreMetric(MetricType.CPU, 60)).toBe(0);
		expect(scoreMetric(MetricType.CPU, 80)).toBe(0);
	});

	test("CPU between thresholds interpolates", () => {
		const score = scoreMetric(MetricType.CPU, 45);
		expect(score).toBe(50);
	});

	test("memory at boundaries", () => {
		expect(scoreMetric(MetricType.MEMORY, 200)).toBe(100);
		expect(scoreMetric(MetricType.MEMORY, 600)).toBe(0);
		expect(scoreMetric(MetricType.MEMORY, 400)).toBe(50);
	});

	test("TTI at boundaries", () => {
		expect(scoreMetric(MetricType.TTI, 1)).toBe(100);
		expect(scoreMetric(MetricType.TTI, 5)).toBe(0);
		expect(scoreMetric(MetricType.TTI, 3)).toBe(50);
	});

	test("frame drops at boundaries", () => {
		expect(scoreMetric(MetricType.FRAME_DROPS, 2)).toBe(100);
		expect(scoreMetric(MetricType.FRAME_DROPS, 20)).toBe(0);
		expect(scoreMetric(MetricType.FRAME_DROPS, 10)).toBe(50);
	});
});

describe("calculateScore", () => {
	test("all-good session scores high", () => {
		const session = makeSession([
			makeSample(MetricType.UI_FPS, 60),
			makeSample(MetricType.JS_FPS, 60),
			makeSample(MetricType.CPU, 10),
			makeSample(MetricType.MEMORY, 150),
			makeSample(MetricType.FRAME_DROPS, 1),
			makeSample(MetricType.TTI, 1),
		]);
		const result = calculateScore(session);
		expect(result.overall).toBe(100);
		expect(result.category).toBe(ScoreCategory.GOOD);
	});

	test("all-poor session scores low", () => {
		const session = makeSession([
			makeSample(MetricType.UI_FPS, 30),
			makeSample(MetricType.JS_FPS, 30),
			makeSample(MetricType.CPU, 80),
			makeSample(MetricType.MEMORY, 600),
			makeSample(MetricType.FRAME_DROPS, 20),
			makeSample(MetricType.TTI, 5),
		]);
		const result = calculateScore(session);
		expect(result.overall).toBe(0);
		expect(result.category).toBe(ScoreCategory.POOR);
	});

	test("mixed session produces weighted score", () => {
		const session = makeSession([
			makeSample(MetricType.UI_FPS, 60), // 100
			makeSample(MetricType.JS_FPS, 60), // 100
			makeSample(MetricType.CPU, 80), // 0
			makeSample(MetricType.MEMORY, 600), // 0
			makeSample(MetricType.FRAME_DROPS, 20), // 0
			makeSample(MetricType.TTI, 5), // 0
		]);
		const result = calculateScore(session);
		// UI_FPS (25% * 100) + JS_FPS (20% * 100) = 45
		const expected = Math.round((0.25 * 100 + 0.2 * 100) / 1);
		expect(result.overall).toBe(expected);
		expect(result.category).toBe(ScoreCategory.NEEDS_WORK);
	});

	test("empty session returns zero", () => {
		const session = makeSession([]);
		const result = calculateScore(session);
		expect(result.overall).toBe(0);
		expect(result.perMetric).toHaveLength(0);
	});

	test("single metric only uses that weight", () => {
		const session = makeSession([makeSample(MetricType.UI_FPS, 60)]);
		const result = calculateScore(session);
		// 100 * 0.25 / 0.25 = 100
		expect(result.overall).toBe(100);
		expect(result.perMetric).toHaveLength(1);
	});

	test("averages multiple samples of same type", () => {
		const session = makeSession([
			makeSample(MetricType.UI_FPS, 60),
			makeSample(MetricType.UI_FPS, 45),
		]);
		const result = calculateScore(session);
		// avg = 52.5, score = (52.5 - 45) / (57 - 45) * 100 = 62.5
		expect(result.perMetric[0].value).toBe(52.5);
		expect(result.perMetric[0].score).toBe(63);
	});

	test("weights sum to 1", () => {
		const sum = Object.values(METRIC_WEIGHTS).reduce((a, b) => a + b, 0);
		expect(sum).toBeCloseTo(1);
	});

	test("per-metric results include correct categories", () => {
		const session = makeSession([
			makeSample(MetricType.UI_FPS, 60), // good
			makeSample(MetricType.CPU, 45), // needs_work (score=50)
			makeSample(MetricType.MEMORY, 600), // poor
		]);
		const result = calculateScore(session);
		const fps = result.perMetric.find((m) => m.type === MetricType.UI_FPS);
		const cpu = result.perMetric.find((m) => m.type === MetricType.CPU);
		const mem = result.perMetric.find((m) => m.type === MetricType.MEMORY);
		expect(fps?.category).toBe(ScoreCategory.GOOD);
		expect(cpu?.category).toBe(ScoreCategory.NEEDS_WORK);
		expect(mem?.category).toBe(ScoreCategory.POOR);
	});
});
