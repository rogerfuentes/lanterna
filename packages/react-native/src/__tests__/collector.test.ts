import { describe, expect, test } from "bun:test";
import { MetricType } from "@lanterna/core";
import { MetricCollector } from "../collector";

describe("MetricCollector", () => {
	test("starts and stops", () => {
		const collector = new MetricCollector({ intervalMs: 100 });
		expect(collector.isRunning).toBe(false);
		collector.start();
		expect(collector.isRunning).toBe(true);
		collector.stop();
		expect(collector.isRunning).toBe(false);
	});

	test("start is idempotent", () => {
		const collector = new MetricCollector({ intervalMs: 100 });
		collector.start();
		collector.start(); // should not create duplicate intervals
		expect(collector.isRunning).toBe(true);
		collector.stop();
	});

	test("stop is idempotent", () => {
		const collector = new MetricCollector({ intervalMs: 100 });
		collector.stop(); // should not throw
		expect(collector.isRunning).toBe(false);
	});

	test("collect creates a snapshot", () => {
		const collector = new MetricCollector();
		const snapshot = collector.collect();
		expect(snapshot.timestamp).toBeGreaterThan(0);
		expect(snapshot.samples).toHaveLength(0);
		expect(snapshot.fps).toBeNull();
		expect(snapshot.hermes).toBeNull();
	});

	test("feedFrameData produces FPS samples on collect", () => {
		const collector = new MetricCollector({ collectFps: true });
		const timestamps: number[] = [];
		for (let i = 0; i < 61; i++) {
			timestamps.push(i * 16.667);
		}
		collector.feedFrameData(timestamps);
		const snapshot = collector.collect();

		expect(snapshot.fps).not.toBeNull();
		expect(snapshot.fps?.fps).toBeCloseTo(60, 0);

		const uiFps = snapshot.samples.find((s) => s.type === MetricType.UI_FPS);
		expect(uiFps).toBeDefined();
		expect(uiFps?.value).toBeCloseTo(60, 0);
	});

	test("feedHermesProfile produces JS samples on collect", () => {
		const collector = new MetricCollector({ collectHermes: true });
		collector.feedHermesProfile({
			samples: [],
			stackFrames: {},
			durationMs: 1000,
			jsThreadUtilization: 90,
		});
		const snapshot = collector.collect();

		expect(snapshot.hermes).not.toBeNull();
		const jsFps = snapshot.samples.find((s) => s.type === MetricType.JS_FPS);
		expect(jsFps).toBeDefined();
		expect(jsFps?.value).toBeCloseTo(54, 0); // 90% of 60
	});

	test("profiler bridge records component renders", () => {
		const collector = new MetricCollector({ collectReactProfiler: true });
		collector.profiler.recordRender({
			name: "App",
			phase: "mount",
			actualDuration: 5,
			baseDuration: 8,
			startTime: 100,
			commitTime: 105,
		});

		const snapshot = collector.collect();
		expect(snapshot.componentStats).toHaveLength(1);
		expect(snapshot.componentStats[0].name).toBe("App");
	});

	test("custom marks appear in snapshots", () => {
		const collector = new MetricCollector();
		collector.marks.mark("start");
		collector.marks.mark("end");
		collector.marks.measure("flow", "start", "end");

		const snapshot = collector.collect();
		expect(snapshot.customMeasures).toHaveLength(1);
		expect(snapshot.customMeasures[0].name).toBe("flow");
	});

	test("onSnapshot listener receives snapshots", () => {
		const collector = new MetricCollector();
		const snapshots: unknown[] = [];
		collector.onSnapshot((s) => snapshots.push(s));

		collector.collect();
		collector.collect();
		expect(snapshots).toHaveLength(2);
	});

	test("onSnapshot unsubscribe stops notifications", () => {
		const collector = new MetricCollector();
		const snapshots: unknown[] = [];
		const unsub = collector.onSnapshot((s) => snapshots.push(s));

		collector.collect();
		unsub();
		collector.collect();
		expect(snapshots).toHaveLength(1);
	});

	test("allSnapshots returns history", () => {
		const collector = new MetricCollector();
		collector.collect();
		collector.collect();
		collector.collect();
		expect(collector.allSnapshots).toHaveLength(3);
	});

	test("reset clears all data", () => {
		const collector = new MetricCollector({ collectFps: true });
		collector.feedFrameData([0, 16.667, 33.334]);
		collector.profiler.recordRender({
			name: "App",
			phase: "mount",
			actualDuration: 5,
			baseDuration: 8,
			startTime: 100,
			commitTime: 105,
		});
		collector.marks.mark("test");
		collector.collect();

		collector.reset();
		expect(collector.allSnapshots).toHaveLength(0);
		const snapshot = collector.collect();
		expect(snapshot.fps).toBeNull();
		expect(snapshot.hermes).toBeNull();
		expect(snapshot.componentStats).toHaveLength(0);
		expect(snapshot.customMeasures).toHaveLength(0);
	});

	test("config controls which sources are collected", () => {
		const collector = new MetricCollector({
			collectFps: false,
			collectHermes: false,
			collectReactProfiler: false,
		});

		collector.feedFrameData([0, 16.667, 33.334]);
		collector.feedHermesProfile({
			samples: [],
			stackFrames: {},
			durationMs: 1000,
			jsThreadUtilization: 90,
		});
		collector.profiler.recordRender({
			name: "App",
			phase: "mount",
			actualDuration: 5,
			baseDuration: 8,
			startTime: 100,
			commitTime: 105,
		});

		const snapshot = collector.collect();
		expect(snapshot.samples).toHaveLength(0);
		expect(snapshot.componentStats).toHaveLength(0);
	});
});
