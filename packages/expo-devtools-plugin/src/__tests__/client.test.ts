import { afterEach, describe, expect, test } from "bun:test";
import { DevToolsClient } from "../client";
import type { DevToolsMessage, DevToolsMetrics } from "../types";

function makeMetrics(overrides?: Partial<DevToolsMetrics>): DevToolsMetrics {
	return {
		timestamp: Date.now(),
		fps: { ui: 60, js: 58, droppedFrames: 2 },
		cpu: 25,
		memory: 180,
		currentScreen: "HomeScreen",
		score: 85,
		category: "good",
		...overrides,
	};
}

describe("DevToolsClient", () => {
	let client: DevToolsClient;

	afterEach(() => {
		client?.stop();
	});

	test("updateMetrics stores latest metrics", () => {
		client = new DevToolsClient();
		const metrics = makeMetrics();
		client.updateMetrics(metrics);
		expect(client.latestMetrics).toEqual(metrics);
	});

	test("start begins sending at interval", async () => {
		client = new DevToolsClient();
		const messages: DevToolsMessage[] = [];
		client.updateMetrics(makeMetrics());
		client.start(50, (msg) => messages.push(msg));

		await new Promise((r) => setTimeout(r, 130));
		client.stop();

		expect(messages.length).toBeGreaterThanOrEqual(2);
	});

	test("stop clears interval", async () => {
		client = new DevToolsClient();
		const messages: DevToolsMessage[] = [];
		client.start(50, (msg) => messages.push(msg));

		await new Promise((r) => setTimeout(r, 70));
		client.stop();
		const countAfterStop = messages.length;

		await new Promise((r) => setTimeout(r, 100));
		expect(messages.length).toBe(countAfterStop);
	});

	test("start is idempotent", () => {
		client = new DevToolsClient();
		client.start(100);
		client.start(100); // should not create duplicate intervals
		expect(client.isRunning).toBe(true);
	});

	test("stop is idempotent", () => {
		client = new DevToolsClient();
		client.stop(); // should not throw
		client.stop();
		expect(client.isRunning).toBe(false);
	});

	test("onMessage listener receives sent messages", async () => {
		client = new DevToolsClient();
		const received: DevToolsMessage[] = [];
		client.onMessage((msg) => received.push(msg));
		client.updateMetrics(makeMetrics());
		client.start(50);

		await new Promise((r) => setTimeout(r, 70));
		client.stop();

		expect(received.length).toBeGreaterThanOrEqual(1);
		expect(received[0].type).toBe("metrics");
	});

	test("unsubscribe stops listener notifications", async () => {
		client = new DevToolsClient();
		const received: DevToolsMessage[] = [];
		const unsub = client.onMessage((msg) => received.push(msg));
		client.updateMetrics(makeMetrics());
		client.start(50);

		await new Promise((r) => setTimeout(r, 70));
		unsub();
		const countAfterUnsub = received.length;

		await new Promise((r) => setTimeout(r, 100));
		client.stop();

		expect(received.length).toBe(countAfterUnsub);
	});

	test("handleCommand processes start command", () => {
		client = new DevToolsClient();
		expect(client.isRunning).toBe(false);
		client.handleCommand("start");
		expect(client.isRunning).toBe(true);
	});

	test("handleCommand processes stop command", () => {
		client = new DevToolsClient();
		client.start(100);
		expect(client.isRunning).toBe(true);
		client.handleCommand("stop");
		expect(client.isRunning).toBe(false);
	});

	test("messages include correct type and timestamp", async () => {
		client = new DevToolsClient();
		const messages: DevToolsMessage[] = [];
		client.updateMetrics(makeMetrics());
		client.start(50, (msg) => messages.push(msg));

		await new Promise((r) => setTimeout(r, 70));
		client.stop();

		expect(messages[0].type).toBe("metrics");
		expect(messages[0].timestamp).toBeGreaterThan(0);
		expect(typeof messages[0].timestamp).toBe("number");
	});

	test("latestMetrics returns current state", () => {
		client = new DevToolsClient();
		expect(client.latestMetrics.timestamp).toBe(0);

		const metrics = makeMetrics({ cpu: 42 });
		client.updateMetrics(metrics);
		expect(client.latestMetrics.cpu).toBe(42);
	});

	test("isRunning reflects state", () => {
		client = new DevToolsClient();
		expect(client.isRunning).toBe(false);
		client.start(100);
		expect(client.isRunning).toBe(true);
		client.stop();
		expect(client.isRunning).toBe(false);
	});
});
