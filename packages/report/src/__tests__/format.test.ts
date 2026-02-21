import { describe, expect, test } from "bun:test";
import { MetricType, ScoreCategory } from "@lanterna/core";
import {
	categoryLabel,
	colorByCategory,
	formatMetricValue,
	metricLabel,
	scoreBar,
} from "../format";

describe("formatMetricValue", () => {
	test("formats UI FPS with fps unit", () => {
		expect(formatMetricValue(MetricType.UI_FPS, 57.3)).toBe("57.3 fps");
	});

	test("formats JS FPS with fps unit", () => {
		expect(formatMetricValue(MetricType.JS_FPS, 48.2)).toBe("48.2 fps");
	});

	test("formats CPU as percentage", () => {
		expect(formatMetricValue(MetricType.CPU, 32.1)).toBe("32.1%");
	});

	test("formats memory in MB", () => {
		expect(formatMetricValue(MetricType.MEMORY, 245)).toBe("245 MB");
	});

	test("formats frame drops as percentage", () => {
		expect(formatMetricValue(MetricType.FRAME_DROPS, 8.2)).toBe("8.2%");
	});

	test("formats TTI in seconds", () => {
		expect(formatMetricValue(MetricType.TTI, 1.8)).toBe("1.8s");
	});
});

describe("metricLabel", () => {
	test("returns 'UI FPS' for UI_FPS", () => {
		expect(metricLabel(MetricType.UI_FPS)).toBe("UI FPS");
	});

	test("returns 'JS FPS' for JS_FPS", () => {
		expect(metricLabel(MetricType.JS_FPS)).toBe("JS FPS");
	});

	test("returns 'CPU Usage' for CPU", () => {
		expect(metricLabel(MetricType.CPU)).toBe("CPU Usage");
	});

	test("returns 'Memory' for MEMORY", () => {
		expect(metricLabel(MetricType.MEMORY)).toBe("Memory");
	});

	test("returns 'Frame Drops' for FRAME_DROPS", () => {
		expect(metricLabel(MetricType.FRAME_DROPS)).toBe("Frame Drops");
	});

	test("returns 'TTI' for TTI", () => {
		expect(metricLabel(MetricType.TTI)).toBe("TTI");
	});
});

describe("scoreBar", () => {
	test("produces correct total length with default width", () => {
		const bar = scoreBar(50);
		expect(bar.length).toBe(20);
	});

	test("produces correct total length with custom width", () => {
		const bar = scoreBar(75, 10);
		expect(bar.length).toBe(10);
	});

	test("filled + empty equals total width", () => {
		const bar = scoreBar(60, 20);
		const filled = (bar.match(/█/g) || []).length;
		const empty = (bar.match(/░/g) || []).length;
		expect(filled + empty).toBe(20);
	});

	test("score 0 produces all empty", () => {
		const bar = scoreBar(0, 10);
		expect(bar).toBe("░".repeat(10));
	});

	test("score 100 produces all filled", () => {
		const bar = scoreBar(100, 10);
		expect(bar).toBe("█".repeat(10));
	});

	test("clamps score above 100", () => {
		const bar = scoreBar(150, 10);
		expect(bar).toBe("█".repeat(10));
	});

	test("clamps score below 0", () => {
		const bar = scoreBar(-10, 10);
		expect(bar).toBe("░".repeat(10));
	});
});

describe("colorByCategory", () => {
	test("returns green ANSI code for GOOD", () => {
		expect(colorByCategory(ScoreCategory.GOOD)).toBe("\x1b[32m");
	});

	test("returns yellow ANSI code for NEEDS_WORK", () => {
		expect(colorByCategory(ScoreCategory.NEEDS_WORK)).toBe("\x1b[33m");
	});

	test("returns red ANSI code for POOR", () => {
		expect(colorByCategory(ScoreCategory.POOR)).toBe("\x1b[31m");
	});
});

describe("categoryLabel", () => {
	test("returns 'Good' for GOOD", () => {
		expect(categoryLabel(ScoreCategory.GOOD)).toBe("Good");
	});

	test("returns 'Needs Work' for NEEDS_WORK", () => {
		expect(categoryLabel(ScoreCategory.NEEDS_WORK)).toBe("Needs Work");
	});

	test("returns 'Poor' for POOR", () => {
		expect(categoryLabel(ScoreCategory.POOR)).toBe("Poor");
	});
});
