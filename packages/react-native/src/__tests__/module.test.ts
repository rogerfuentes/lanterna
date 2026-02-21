import { describe, expect, test } from "bun:test";
import { createMockNativeModule, LanternaModule } from "../module";
import type { MetricsEventPayload, SessionEventPayload } from "../types";

describe("LanternaModule", () => {
	test("isAvailable returns false when no native module", () => {
		const mod = new LanternaModule(null);
		expect(mod.isAvailable).toBe(false);
	});

	test("isAvailable returns true with native module", () => {
		const mock = createMockNativeModule();
		const mod = new LanternaModule(mock);
		expect(mod.isAvailable).toBe(true);
	});

	test("startProfiling returns null when no native module", async () => {
		const mod = new LanternaModule(null);
		const result = await mod.startProfiling();
		expect(result).toBeNull();
	});

	test("startProfiling returns session with mock module", async () => {
		const mock = createMockNativeModule();
		const mod = new LanternaModule(mock);
		const session = await mod.startProfiling();
		expect(session).not.toBeNull();
		expect(session?.id).toBe("mock-session-1");
		expect(session?.active).toBe(true);
		expect(session?.stoppedAt).toBeNull();
	});

	test("startProfiling merges partial config with defaults", async () => {
		const mock = createMockNativeModule();
		const mod = new LanternaModule(mock);
		const session = await mod.startProfiling({ intervalMs: 1000 });
		expect(session?.config.intervalMs).toBe(1000);
		expect(session?.config.hermesProfiling).toBe(false);
		expect(session?.config.reactProfiling).toBe(false);
	});

	test("stopProfiling returns null when no active session", async () => {
		const mock = createMockNativeModule();
		const mod = new LanternaModule(mock);
		const result = await mod.stopProfiling();
		expect(result).toBeNull();
	});

	test("stopProfiling returns completed session", async () => {
		const mock = createMockNativeModule();
		const mod = new LanternaModule(mock);
		await mod.startProfiling();
		const session = await mod.stopProfiling();
		expect(session).not.toBeNull();
		expect(session?.active).toBe(false);
		expect(session?.stoppedAt).not.toBeNull();
	});

	test("session is null after stopProfiling", async () => {
		const mock = createMockNativeModule();
		const mod = new LanternaModule(mock);
		await mod.startProfiling();
		await mod.stopProfiling();
		expect(mod.session).toBeNull();
	});

	test("getMetrics returns null when no active session", async () => {
		const mock = createMockNativeModule();
		const mod = new LanternaModule(mock);
		const result = await mod.getMetrics();
		expect(result).toBeNull();
	});

	test("getMetrics returns metrics during active session", async () => {
		const mock = createMockNativeModule();
		const mod = new LanternaModule(mock);
		await mod.startProfiling();
		const metrics = await mod.getMetrics();
		expect(metrics).not.toBeNull();
		expect(metrics?.metrics.ui_fps).toBe(60);
		expect(metrics?.metrics.cpu).toBe(25);
	});

	test("isProfilingActive returns false when no native module", async () => {
		const mod = new LanternaModule(null);
		const result = await mod.isProfilingActive();
		expect(result).toBe(false);
	});

	test("isProfilingActive tracks session state", async () => {
		const mock = createMockNativeModule();
		const mod = new LanternaModule(mock);
		expect(await mod.isProfilingActive()).toBe(false);
		await mod.startProfiling();
		expect(await mod.isProfilingActive()).toBe(true);
		await mod.stopProfiling();
		expect(await mod.isProfilingActive()).toBe(false);
	});

	test("session counter increments across sessions", async () => {
		const mock = createMockNativeModule();
		const mod = new LanternaModule(mock);

		const s1 = await mod.startProfiling();
		expect(s1?.id).toBe("mock-session-1");
		await mod.stopProfiling();

		const s2 = await mod.startProfiling();
		expect(s2?.id).toBe("mock-session-2");
		await mod.stopProfiling();
	});
});

describe("LanternaModule events", () => {
	test("emits sessionStart on startProfiling", async () => {
		const mock = createMockNativeModule();
		const mod = new LanternaModule(mock);
		const events: SessionEventPayload[] = [];
		mod.on("sessionStart", (e) => events.push(e));

		await mod.startProfiling();
		expect(events).toHaveLength(1);
		expect(events[0].sessionId).toBe("mock-session-1");
	});

	test("emits sessionStop on stopProfiling", async () => {
		const mock = createMockNativeModule();
		const mod = new LanternaModule(mock);
		const events: SessionEventPayload[] = [];
		mod.on("sessionStop", (e) => events.push(e));

		await mod.startProfiling();
		await mod.stopProfiling();
		expect(events).toHaveLength(1);
	});

	test("emits metrics on getMetrics", async () => {
		const mock = createMockNativeModule();
		const mod = new LanternaModule(mock);
		const events: MetricsEventPayload[] = [];
		mod.on("metrics", (e) => events.push(e));

		await mod.startProfiling();
		await mod.getMetrics();
		expect(events).toHaveLength(1);
		expect(events[0].metrics.ui_fps).toBe(60);
	});

	test("unsubscribe stops events", async () => {
		const mock = createMockNativeModule();
		const mod = new LanternaModule(mock);
		const events: SessionEventPayload[] = [];
		const unsub = mod.on("sessionStart", (e) => events.push(e));

		await mod.startProfiling();
		expect(events).toHaveLength(1);

		unsub();
		await mod.stopProfiling();
		await mod.startProfiling();
		expect(events).toHaveLength(1); // no new event after unsub
	});

	test("removeAllListeners clears all events", async () => {
		const mock = createMockNativeModule();
		const mod = new LanternaModule(mock);
		const starts: SessionEventPayload[] = [];
		const stops: SessionEventPayload[] = [];
		mod.on("sessionStart", (e) => starts.push(e));
		mod.on("sessionStop", (e) => stops.push(e));

		mod.removeAllListeners();

		await mod.startProfiling();
		await mod.stopProfiling();
		expect(starts).toHaveLength(0);
		expect(stops).toHaveLength(0);
	});
});

describe("createMockNativeModule", () => {
	test("allows overriding methods", async () => {
		const mock = createMockNativeModule({
			async getMetrics() {
				return JSON.stringify({
					sessionId: "custom",
					timestamp: 0,
					metrics: { ui_fps: 30 },
				});
			},
		});

		const result = JSON.parse(await mock.getMetrics("any"));
		expect(result.metrics.ui_fps).toBe(30);
	});

	test("tracks active state correctly", async () => {
		const mock = createMockNativeModule();
		expect(await mock.isProfilingActive()).toBe(false);
		await mock.startProfiling("{}");
		expect(await mock.isProfilingActive()).toBe(true);
		await mock.stopProfiling("any");
		expect(await mock.isProfilingActive()).toBe(false);
	});

	test("getActiveSessionId returns current session", async () => {
		const mock = createMockNativeModule();
		expect(await mock.getActiveSessionId()).toBeNull();
		await mock.startProfiling("{}");
		expect(await mock.getActiveSessionId()).toBe("mock-session-1");
		await mock.stopProfiling("mock-session-1");
		expect(await mock.getActiveSessionId()).toBeNull();
	});
});
