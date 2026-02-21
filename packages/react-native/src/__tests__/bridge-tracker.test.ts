import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { BridgeTracker } from "../bridge-tracker";

describe("BridgeTracker", () => {
	let tracker: BridgeTracker;

	beforeEach(() => {
		tracker = new BridgeTracker();
	});

	afterEach(() => {
		tracker.stop();
	});

	test("tracks call counts per module", () => {
		tracker.start();

		tracker.recordCall({ module: "UIManager", method: "createView", timestamp: 1000 });
		tracker.recordCall({ module: "UIManager", method: "updateView", timestamp: 1001 });
		tracker.recordCall({ module: "Networking", method: "sendRequest", timestamp: 1002 });
		tracker.recordCall({ module: "UIManager", method: "setChildren", timestamp: 1003 });

		const stats = tracker.getStats();
		expect(stats.totalCalls).toBe(4);

		const uiManager = stats.topModules.find((m) => m.module === "UIManager");
		expect(uiManager?.count).toBe(3);

		const networking = stats.topModules.find((m) => m.module === "Networking");
		expect(networking?.count).toBe(1);
	});

	test("calculates calls per second", () => {
		tracker.start();

		const now = Date.now();
		// Record 10 calls
		for (let i = 0; i < 10; i++) {
			tracker.recordCall({ module: "Module", method: "method", timestamp: now + i });
		}

		const stats = tracker.getStats();
		// callsPerSecond should be > 0 (exact value depends on timing)
		expect(stats.totalCalls).toBe(10);
		expect(stats.callsPerSecond).toBeGreaterThanOrEqual(0);
	});

	test("returns top modules sorted by count", () => {
		tracker.start();

		// Module A: 5 calls
		for (let i = 0; i < 5; i++) {
			tracker.recordCall({ module: "ModuleA", method: "m", timestamp: Date.now() });
		}
		// Module B: 3 calls
		for (let i = 0; i < 3; i++) {
			tracker.recordCall({ module: "ModuleB", method: "m", timestamp: Date.now() });
		}
		// Module C: 8 calls
		for (let i = 0; i < 8; i++) {
			tracker.recordCall({ module: "ModuleC", method: "m", timestamp: Date.now() });
		}

		const stats = tracker.getStats();
		expect(stats.topModules[0].module).toBe("ModuleC");
		expect(stats.topModules[0].count).toBe(8);
		expect(stats.topModules[1].module).toBe("ModuleA");
		expect(stats.topModules[1].count).toBe(5);
		expect(stats.topModules[2].module).toBe("ModuleB");
		expect(stats.topModules[2].count).toBe(3);
	});

	test("tracks slowest calls", () => {
		tracker.start();

		tracker.recordCall({
			module: "UIManager",
			method: "createView",
			timestamp: 1000,
			duration: 5,
		});
		tracker.recordCall({
			module: "Networking",
			method: "fetch",
			timestamp: 1010,
			duration: 150,
		});
		tracker.recordCall({
			module: "UIManager",
			method: "measure",
			timestamp: 1020,
			duration: 25,
		});
		tracker.recordCall({
			module: "Storage",
			method: "read",
			timestamp: 1030,
			duration: 80,
		});

		const stats = tracker.getStats();
		expect(stats.slowestCalls).toHaveLength(4);
		expect(stats.slowestCalls[0].module).toBe("Networking");
		expect(stats.slowestCalls[0].duration).toBe(150);
		expect(stats.slowestCalls[1].module).toBe("Storage");
		expect(stats.slowestCalls[1].duration).toBe(80);
	});

	test("start/stop lifecycle", () => {
		// Should not record before start
		tracker.recordCall({ module: "M", method: "m", timestamp: Date.now() });
		expect(tracker.getStats().totalCalls).toBe(0);

		tracker.start();
		tracker.recordCall({ module: "M", method: "m", timestamp: Date.now() });
		expect(tracker.getStats().totalCalls).toBe(1);

		tracker.stop();
		tracker.recordCall({ module: "M", method: "m", timestamp: Date.now() });
		expect(tracker.getStats().totalCalls).toBe(1);
	});

	test("start is idempotent", () => {
		tracker.start();
		tracker.start(); // should not throw or double-install
		tracker.recordCall({ module: "M", method: "m", timestamp: Date.now() });
		expect(tracker.getStats().totalCalls).toBe(1);
	});

	test("stop is idempotent", () => {
		tracker.stop(); // should not throw
		tracker.start();
		tracker.stop();
		tracker.stop(); // should not throw
	});

	test("clear resets all data", () => {
		tracker.start();
		tracker.recordCall({ module: "M", method: "m", timestamp: Date.now() });
		tracker.recordCall({ module: "M", method: "m", timestamp: Date.now() });

		expect(tracker.getStats().totalCalls).toBe(2);
		tracker.clear();
		expect(tracker.getStats().totalCalls).toBe(0);
		expect(tracker.getRecentCalls()).toHaveLength(0);
	});

	test("getRecentCalls returns limited results", () => {
		tracker.start();

		for (let i = 0; i < 10; i++) {
			tracker.recordCall({ module: "M", method: `m${i}`, timestamp: Date.now() + i });
		}

		const recent5 = tracker.getRecentCalls(5);
		expect(recent5).toHaveLength(5);
		// Should be the last 5 calls
		expect(recent5[0].method).toBe("m5");
		expect(recent5[4].method).toBe("m9");

		const all = tracker.getRecentCalls(100);
		expect(all).toHaveLength(10);
	});

	test("getRecentCalls defaults to 50", () => {
		tracker.start();

		for (let i = 0; i < 60; i++) {
			tracker.recordCall({ module: "M", method: `m${i}`, timestamp: Date.now() + i });
		}

		const recent = tracker.getRecentCalls();
		expect(recent).toHaveLength(50);
	});

	test("topModules limited to 10", () => {
		tracker.start();

		for (let i = 0; i < 15; i++) {
			tracker.recordCall({ module: `Module${i}`, method: "m", timestamp: Date.now() });
		}

		const stats = tracker.getStats();
		expect(stats.topModules.length).toBeLessThanOrEqual(10);
	});

	test("slowestCalls limited to 10", () => {
		tracker.start();

		for (let i = 0; i < 15; i++) {
			tracker.recordCall({
				module: "M",
				method: `m${i}`,
				timestamp: Date.now(),
				duration: i * 10,
			});
		}

		const stats = tracker.getStats();
		expect(stats.slowestCalls.length).toBeLessThanOrEqual(10);
	});

	test("stats with no calls returns zero values", () => {
		tracker.start();
		const stats = tracker.getStats();
		expect(stats.totalCalls).toBe(0);
		expect(stats.callsPerSecond).toBe(0);
		expect(stats.topModules).toHaveLength(0);
		expect(stats.slowestCalls).toHaveLength(0);
	});
});
