import { describe, expect, test } from "bun:test";
import { ProfilerBridge } from "../profiler";

describe("ProfilerBridge", () => {
	test("records renders", () => {
		const bridge = new ProfilerBridge();
		bridge.recordRender({
			name: "App",
			phase: "mount",
			actualDuration: 5.2,
			baseDuration: 8.1,
			startTime: 100,
			commitTime: 105.2,
		});
		expect(bridge.getRenders()).toHaveLength(1);
	});

	test("getRenders returns copies", () => {
		const bridge = new ProfilerBridge();
		bridge.recordRender({
			name: "App",
			phase: "mount",
			actualDuration: 5,
			baseDuration: 8,
			startTime: 100,
			commitTime: 105,
		});
		const renders = bridge.getRenders();
		renders.pop();
		expect(bridge.getRenders()).toHaveLength(1);
	});

	test("getRendersFor filters by component name", () => {
		const bridge = new ProfilerBridge();
		bridge.recordRender({
			name: "App",
			phase: "mount",
			actualDuration: 5,
			baseDuration: 8,
			startTime: 100,
			commitTime: 105,
		});
		bridge.recordRender({
			name: "Header",
			phase: "mount",
			actualDuration: 2,
			baseDuration: 3,
			startTime: 100,
			commitTime: 102,
		});
		bridge.recordRender({
			name: "App",
			phase: "update",
			actualDuration: 1,
			baseDuration: 8,
			startTime: 200,
			commitTime: 201,
		});
		expect(bridge.getRendersFor("App")).toHaveLength(2);
		expect(bridge.getRendersFor("Header")).toHaveLength(1);
		expect(bridge.getRendersFor("Footer")).toHaveLength(0);
	});

	test("getStats aggregates by component", () => {
		const bridge = new ProfilerBridge();
		bridge.recordRender({
			name: "App",
			phase: "mount",
			actualDuration: 10,
			baseDuration: 15,
			startTime: 100,
			commitTime: 110,
		});
		bridge.recordRender({
			name: "App",
			phase: "update",
			actualDuration: 2,
			baseDuration: 15,
			startTime: 200,
			commitTime: 202,
		});
		bridge.recordRender({
			name: "Header",
			phase: "mount",
			actualDuration: 3,
			baseDuration: 4,
			startTime: 100,
			commitTime: 103,
		});

		const stats = bridge.getStats();
		expect(stats).toHaveLength(2);

		const appStats = stats.find((s) => s.name === "App");
		expect(appStats?.renderCount).toBe(2);
		expect(appStats?.mountCount).toBe(1);
		expect(appStats?.updateCount).toBe(1);
		expect(appStats?.avgActualDuration).toBe(6);
		expect(appStats?.maxActualDuration).toBe(10);
		expect(appStats?.totalActualDuration).toBe(12);
	});

	test("getStats sorts by totalActualDuration descending", () => {
		const bridge = new ProfilerBridge();
		bridge.recordRender({
			name: "Fast",
			phase: "mount",
			actualDuration: 1,
			baseDuration: 1,
			startTime: 100,
			commitTime: 101,
		});
		bridge.recordRender({
			name: "Slow",
			phase: "mount",
			actualDuration: 20,
			baseDuration: 20,
			startTime: 100,
			commitTime: 120,
		});

		const stats = bridge.getStats();
		expect(stats[0].name).toBe("Slow");
		expect(stats[1].name).toBe("Fast");
	});

	test("createOnRender returns compatible callback", () => {
		const bridge = new ProfilerBridge();
		const onRender = bridge.createOnRender("MyComponent");
		onRender("MyComponent", "mount", 5.5, 8.2, 100, 105.5);

		const renders = bridge.getRenders();
		expect(renders).toHaveLength(1);
		expect(renders[0].name).toBe("MyComponent");
		expect(renders[0].actualDuration).toBe(5.5);
	});

	test("clear removes all renders", () => {
		const bridge = new ProfilerBridge();
		bridge.recordRender({
			name: "App",
			phase: "mount",
			actualDuration: 5,
			baseDuration: 8,
			startTime: 100,
			commitTime: 105,
		});
		bridge.clear();
		expect(bridge.getRenders()).toHaveLength(0);
		expect(bridge.getStats()).toHaveLength(0);
	});
});
