import { describe, expect, test } from "bun:test";
import { PerformanceMarks } from "../marks";

describe("PerformanceMarks", () => {
	test("mark creates a mark with timestamp", () => {
		const marks = new PerformanceMarks();
		const mark = marks.mark("start");
		expect(mark.name).toBe("start");
		expect(mark.timestamp).toBeGreaterThan(0);
	});

	test("mark stores metadata", () => {
		const marks = new PerformanceMarks();
		const mark = marks.mark("login", { userId: "123" });
		expect(mark.metadata?.userId).toBe("123");
	});

	test("getMark retrieves by name", () => {
		const marks = new PerformanceMarks();
		marks.mark("test");
		expect(marks.getMark("test")).not.toBeNull();
		expect(marks.getMark("nonexistent")).toBeNull();
	});

	test("mark overwrites existing mark with same name", () => {
		const marks = new PerformanceMarks();
		const first = marks.mark("point");
		const second = marks.mark("point");
		expect(second.timestamp).toBeGreaterThanOrEqual(first.timestamp);
		expect(marks.getMarks()).toHaveLength(1);
	});

	test("getMarks returns all marks", () => {
		const marks = new PerformanceMarks();
		marks.mark("a");
		marks.mark("b");
		marks.mark("c");
		expect(marks.getMarks()).toHaveLength(3);
	});

	test("measure creates span between two marks", () => {
		const marks = new PerformanceMarks();
		marks.mark("start");
		marks.mark("end");
		const measure = marks.measure("login-flow", "start", "end");
		expect(measure).not.toBeNull();
		expect(measure?.name).toBe("login-flow");
		expect(measure?.startMark).toBe("start");
		expect(measure?.endMark).toBe("end");
		expect(measure?.duration).toBeGreaterThanOrEqual(0);
	});

	test("measure returns null for missing start mark", () => {
		const marks = new PerformanceMarks();
		marks.mark("end");
		expect(marks.measure("test", "missing", "end")).toBeNull();
	});

	test("measure returns null for missing end mark", () => {
		const marks = new PerformanceMarks();
		marks.mark("start");
		expect(marks.measure("test", "start", "missing")).toBeNull();
	});

	test("getMeasures returns all measurements", () => {
		const marks = new PerformanceMarks();
		marks.mark("a");
		marks.mark("b");
		marks.mark("c");
		marks.measure("ab", "a", "b");
		marks.measure("bc", "b", "c");
		expect(marks.getMeasures()).toHaveLength(2);
	});

	test("getMeasuresByName filters by name", () => {
		const marks = new PerformanceMarks();
		marks.mark("s");
		marks.mark("e");
		marks.measure("render", "s", "e");
		marks.measure("render", "s", "e");
		marks.measure("network", "s", "e");
		expect(marks.getMeasuresByName("render")).toHaveLength(2);
		expect(marks.getMeasuresByName("network")).toHaveLength(1);
	});

	test("clear removes all marks and measures", () => {
		const marks = new PerformanceMarks();
		marks.mark("a");
		marks.mark("b");
		marks.measure("ab", "a", "b");
		marks.clear();
		expect(marks.getMarks()).toHaveLength(0);
		expect(marks.getMeasures()).toHaveLength(0);
	});
});
