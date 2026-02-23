import { describe, expect, test } from "bun:test";
import { MetricType } from "@lanternajs/core";
import type { ClientEvent } from "../ws-client";
import { LanternaWsClient } from "../ws-client";

describe("LanternaWsClient", () => {
	test("initial state is disconnected", () => {
		const client = new LanternaWsClient("com.example", "android", "Pixel");
		expect(client.connectionState).toBe("disconnected");
		expect(client.currentSessionId).toBeNull();
	});

	test("createHandshakeMessage returns valid JSON", () => {
		const client = new LanternaWsClient("com.example", "ios", "iPhone");
		const msg = JSON.parse(client.createHandshakeMessage());
		expect(msg.type).toBe("handshake");
		expect(msg.appId).toBe("com.example");
		expect(msg.platform).toBe("ios");
		expect(msg.deviceName).toBe("iPhone");
	});

	test("handleMessage processes handshake_ack", () => {
		const client = new LanternaWsClient("com.example", "android", "Pixel");
		const events: ClientEvent[] = [];
		client.on((e) => events.push(e));

		const ack = JSON.stringify({
			type: "handshake_ack",
			timestamp: Date.now(),
			sessionId: "session-1",
			config: { intervalMs: 500, metrics: [] },
		});

		const handled = client.handleMessage(ack);
		expect(handled).toBe(true);
		expect(client.connectionState).toBe("connected");
		expect(client.currentSessionId).toBe("session-1");
		expect(client.streamingIntervalMs).toBe(500);
	});

	test("handleMessage processes disconnect", () => {
		const client = new LanternaWsClient("com.example", "android", "Pixel");
		client.simulateConnected("session-1");

		const events: ClientEvent[] = [];
		client.on((e) => events.push(e));

		const disconnect = JSON.stringify({
			type: "disconnect",
			timestamp: Date.now(),
			reason: "server shutting down",
		});

		client.handleMessage(disconnect);
		expect(client.connectionState).toBe("disconnected");
		expect(client.currentSessionId).toBeNull();
	});

	test("handleMessage returns false for invalid JSON", () => {
		const client = new LanternaWsClient("com.example", "android", "Pixel");
		expect(client.handleMessage("invalid")).toBe(false);
	});

	test("serializeSnapshot creates valid metrics message", () => {
		const client = new LanternaWsClient("com.example", "android", "Pixel");
		client.simulateConnected("session-1");

		const snapshot = {
			timestamp: Date.now(),
			samples: [
				{ type: MetricType.UI_FPS, value: 59, timestamp: Date.now(), unit: "fps" },
				{ type: MetricType.CPU, value: 25, timestamp: Date.now(), unit: "%" },
			],
			fps: { fps: 59, droppedFrames: 1, totalFrames: 100, dropRate: 1 },
			hermes: null,
			componentStats: [],
			customMeasures: [],
			networkRequests: [],
			bridgeStats: null,
			layoutStats: null,
		};

		const msg = JSON.parse(client.serializeSnapshot(snapshot));
		expect(msg.type).toBe("metrics");
		expect(msg.sessionId).toBe("session-1");
		expect(msg.metrics.ui_fps).toBe(59);
		expect(msg.fps.ui).toBe(59);
	});

	test("simulateConnect changes state to connecting", () => {
		const client = new LanternaWsClient("com.example", "android", "Pixel");
		client.simulateConnect();
		expect(client.connectionState).toBe("connecting");
	});

	test("shouldReconnect respects config", () => {
		const client = new LanternaWsClient("com.example", "android", "Pixel", {
			autoReconnect: true,
			maxReconnectAttempts: 3,
		});
		expect(client.shouldReconnect()).toBe(true);

		client.attemptReconnect();
		client.attemptReconnect();
		client.attemptReconnect();
		expect(client.shouldReconnect()).toBe(false);
	});

	test("shouldReconnect false when autoReconnect disabled", () => {
		const client = new LanternaWsClient("com.example", "android", "Pixel", {
			autoReconnect: false,
		});
		expect(client.shouldReconnect()).toBe(false);
	});

	test("event listener unsubscribe works", () => {
		const client = new LanternaWsClient("com.example", "android", "Pixel");
		const events: ClientEvent[] = [];
		const unsub = client.on((e) => events.push(e));

		client.simulateConnected("s1");
		expect(events.length).toBeGreaterThan(0);

		const prevCount = events.length;
		unsub();
		client.simulateDisconnect("test");
		expect(events.length).toBe(prevCount);
	});

	test("removeAllListeners clears listeners", () => {
		const client = new LanternaWsClient("com.example", "android", "Pixel");
		const events: ClientEvent[] = [];
		client.on((e) => events.push(e));

		client.removeAllListeners();
		client.simulateConnected("s1");
		expect(events).toHaveLength(0);
	});

	test("createDisconnectMessage returns valid JSON", () => {
		const client = new LanternaWsClient("com.example", "android", "Pixel");
		const msg = JSON.parse(client.createDisconnectMessage("user stopped"));
		expect(msg.type).toBe("disconnect");
		expect(msg.reason).toBe("user stopped");
	});
});
