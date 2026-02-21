import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { LayoutTracker } from "../layout-tracker";

describe("LayoutTracker", () => {
	let tracker: LayoutTracker;

	beforeEach(() => {
		tracker = new LayoutTracker();
	});

	afterEach(() => {
		tracker.stop();
	});

	test("tracks layout events by component", () => {
		tracker.start();
		tracker.trackLayout("Header", { width: 375, height: 64 });
		tracker.trackLayout("Footer", { width: 375, height: 48 });
		tracker.trackLayout("Header", { width: 375, height: 64 });

		const stats = tracker.getStats();
		expect(stats.totalLayoutEvents).toBe(3);
	});

	test("detects excessive layouts with default threshold (>3)", () => {
		tracker.start();

		// Header: 4 layouts (excessive)
		tracker.trackLayout("Header", { width: 375, height: 64 });
		tracker.trackLayout("Header", { width: 375, height: 64 });
		tracker.trackLayout("Header", { width: 375, height: 64 });
		tracker.trackLayout("Header", { width: 375, height: 64 });

		// Footer: 2 layouts (not excessive)
		tracker.trackLayout("Footer", { width: 375, height: 48 });
		tracker.trackLayout("Footer", { width: 375, height: 48 });

		const excessive = tracker.getExcessiveLayouts();
		expect(excessive).toHaveLength(1);
		expect(excessive[0].name).toBe("Header");
		expect(excessive[0].count).toBe(4);
	});

	test("custom threshold works", () => {
		tracker.start();

		// 2 layouts for each component
		tracker.trackLayout("A", { width: 100, height: 50 });
		tracker.trackLayout("A", { width: 100, height: 50 });
		tracker.trackLayout("B", { width: 200, height: 100 });
		tracker.trackLayout("B", { width: 200, height: 100 });

		// With threshold=1, both are excessive
		const excessive = tracker.getExcessiveLayouts(1);
		expect(excessive).toHaveLength(2);

		// With threshold=3, neither is excessive
		const notExcessive = tracker.getExcessiveLayouts(3);
		expect(notExcessive).toHaveLength(0);
	});

	test("stats aggregation correct", () => {
		tracker.start();

		tracker.trackLayout("A", { width: 100, height: 50 });
		tracker.trackLayout("A", { width: 100, height: 50 });
		tracker.trackLayout("B", { width: 200, height: 100 });
		tracker.trackLayout("C", { width: 150, height: 75 });

		const stats = tracker.getStats();
		expect(stats.totalLayoutEvents).toBe(4);
		// 4 events / 3 unique components = 1.33
		expect(stats.averageLayoutsPerComponent).toBeCloseTo(1.33, 1);
	});

	test("stats with no events returns zero values", () => {
		tracker.start();
		const stats = tracker.getStats();
		expect(stats.totalLayoutEvents).toBe(0);
		expect(stats.averageLayoutsPerComponent).toBe(0);
		expect(stats.componentsWithExcessiveLayouts).toHaveLength(0);
	});

	test("clear resets all data", () => {
		tracker.start();
		tracker.trackLayout("Header", { width: 375, height: 64 });
		tracker.trackLayout("Header", { width: 375, height: 64 });

		expect(tracker.getStats().totalLayoutEvents).toBe(2);
		tracker.clear();
		expect(tracker.getStats().totalLayoutEvents).toBe(0);
		expect(tracker.getExcessiveLayouts()).toHaveLength(0);
	});

	test("does not track when not started", () => {
		tracker.trackLayout("Header", { width: 375, height: 64 });
		expect(tracker.getStats().totalLayoutEvents).toBe(0);
	});

	test("does not track after stop", () => {
		tracker.start();
		tracker.trackLayout("Header", { width: 375, height: 64 });
		tracker.stop();
		tracker.trackLayout("Header", { width: 375, height: 64 });
		expect(tracker.getStats().totalLayoutEvents).toBe(1);
	});

	test("start is idempotent", () => {
		tracker.start();
		tracker.start(); // should not throw
		tracker.trackLayout("A", { width: 100, height: 50 });
		expect(tracker.getStats().totalLayoutEvents).toBe(1);
	});

	test("stop is idempotent", () => {
		tracker.stop(); // should not throw
		tracker.start();
		tracker.stop();
		tracker.stop(); // should not throw
	});

	test("excessive layouts sorted by count descending", () => {
		tracker.start();

		// C: 6 layouts
		for (let i = 0; i < 6; i++) {
			tracker.trackLayout("C", { width: 100, height: 50 });
		}
		// A: 10 layouts
		for (let i = 0; i < 10; i++) {
			tracker.trackLayout("A", { width: 100, height: 50 });
		}
		// B: 4 layouts
		for (let i = 0; i < 4; i++) {
			tracker.trackLayout("B", { width: 100, height: 50 });
		}

		const excessive = tracker.getExcessiveLayouts();
		expect(excessive).toHaveLength(3);
		expect(excessive[0].name).toBe("A");
		expect(excessive[0].count).toBe(10);
		expect(excessive[1].name).toBe("C");
		expect(excessive[1].count).toBe(6);
		expect(excessive[2].name).toBe("B");
		expect(excessive[2].count).toBe(4);
	});

	test("layoutPassCount increments per component", () => {
		tracker.start();
		tracker.trackLayout("Header", { width: 375, height: 64 });
		tracker.trackLayout("Header", { width: 375, height: 64 });
		tracker.trackLayout("Footer", { width: 375, height: 48 });
		tracker.trackLayout("Header", { width: 375, height: 64 });

		// Header should have count 3, Footer should have count 1
		const stats = tracker.getStats();
		expect(stats.totalLayoutEvents).toBe(4);
	});

	test("getStats includes excessive layouts from componentsWithExcessiveLayouts", () => {
		tracker.start();

		for (let i = 0; i < 5; i++) {
			tracker.trackLayout("HeavyComponent", { width: 375, height: 200 });
		}

		const stats = tracker.getStats();
		expect(stats.componentsWithExcessiveLayouts).toHaveLength(1);
		expect(stats.componentsWithExcessiveLayouts[0].name).toBe("HeavyComponent");
		expect(stats.componentsWithExcessiveLayouts[0].count).toBe(5);
	});
});
