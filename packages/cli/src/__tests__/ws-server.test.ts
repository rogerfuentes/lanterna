import { describe, expect, test } from "bun:test";
import type { ServerEvent } from "../ws-server";
import { LanternaServer, parseServerMessage } from "../ws-server";

describe("LanternaServer", () => {
	test("starts and stops", () => {
		const server = new LanternaServer();
		expect(server.isRunning).toBe(false);
		server.start();
		expect(server.isRunning).toBe(true);
		server.stop();
		expect(server.isRunning).toBe(false);
	});

	test("uses default port", () => {
		const server = new LanternaServer();
		expect(server.serverPort).toBe(8347);
	});

	test("accepts custom port", () => {
		const server = new LanternaServer(9000);
		expect(server.serverPort).toBe(9000);
	});

	test("emits serverStarted on start", () => {
		const server = new LanternaServer();
		const events: ServerEvent[] = [];
		server.on((e) => events.push(e));
		server.start();
		expect(events).toHaveLength(1);
		expect(events[0].type).toBe("serverStarted");
	});

	test("emits serverStopped on stop", () => {
		const server = new LanternaServer();
		server.start();
		const events: ServerEvent[] = [];
		server.on((e) => events.push(e));
		server.stop();
		expect(events).toHaveLength(1);
		expect(events[0].type).toBe("serverStopped");
	});

	test("handleMessage processes handshake and returns ack", () => {
		const server = new LanternaServer();
		server.start();

		const handshake = JSON.stringify({
			type: "handshake",
			timestamp: Date.now(),
			appId: "com.example.app",
			platform: "android",
			deviceName: "Pixel 6",
			lanternaVersion: "0.0.1",
		});

		const response = server.handleMessage(handshake);
		expect(response).not.toBeNull();

		const ack = JSON.parse(response as string);
		expect(ack.type).toBe("handshake_ack");
		expect(ack.sessionId).toBeDefined();
		expect(server.connectedApps).toHaveLength(1);
		expect(server.connectedApps[0].appId).toBe("com.example.app");
	});

	test("handleMessage processes metrics", () => {
		const server = new LanternaServer();
		server.start();

		// First handshake
		const handshake = JSON.stringify({
			type: "handshake",
			timestamp: Date.now(),
			appId: "com.example.app",
			platform: "ios",
			deviceName: "iPhone 15",
		});
		const ackStr = server.handleMessage(handshake) as string;
		const ack = JSON.parse(ackStr);
		const sessionId = ack.sessionId;

		// Then metrics
		const events: ServerEvent[] = [];
		server.on((e) => events.push(e));

		const metrics = JSON.stringify({
			type: "metrics",
			timestamp: Date.now(),
			sessionId,
			metrics: { ui_fps: 58.5, cpu: 25 },
			fps: { ui: 58.5, js: 55, droppedFrames: 1 },
		});

		const response = server.handleMessage(metrics);
		expect(response).toBeNull(); // metrics don't need response

		const app = server.getApp(sessionId);
		expect(app).not.toBeNull();
		expect(app?.latestMetrics.ui_fps).toBe(58.5);
		expect(app?.fps?.ui).toBe(58.5);

		expect(events.some((e) => e.type === "metricsReceived")).toBe(true);
	});

	test("handleMessage processes disconnect", () => {
		const server = new LanternaServer();
		server.start();

		// Handshake first
		const ackStr = server.handleMessage(
			JSON.stringify({
				type: "handshake",
				timestamp: Date.now(),
				appId: "com.example",
				platform: "android",
				deviceName: "Pixel",
			}),
		) as string;
		const sessionId = JSON.parse(ackStr).sessionId;

		expect(server.connectedApps).toHaveLength(1);

		// Disconnect
		server.handleMessage(
			JSON.stringify({
				type: "disconnect",
				timestamp: Date.now(),
				sessionId,
				reason: "app closed",
			}),
		);

		expect(server.connectedApps).toHaveLength(0);
	});

	test("handleMessage returns null for invalid messages", () => {
		const server = new LanternaServer();
		server.start();
		expect(server.handleMessage("invalid")).toBeNull();
	});

	test("stop clears connected apps", () => {
		const server = new LanternaServer();
		server.start();

		server.handleMessage(
			JSON.stringify({
				type: "handshake",
				timestamp: Date.now(),
				appId: "test",
				platform: "android",
				deviceName: "device",
			}),
		);

		expect(server.connectedApps).toHaveLength(1);
		server.stop();
		expect(server.connectedApps).toHaveLength(0);
	});

	test("getApp returns null for unknown session", () => {
		const server = new LanternaServer();
		expect(server.getApp("nonexistent")).toBeNull();
	});

	test("removeAllListeners clears listeners", () => {
		const server = new LanternaServer();
		const events: ServerEvent[] = [];
		server.on((e) => events.push(e));
		server.removeAllListeners();
		server.start();
		expect(events).toHaveLength(0);
	});
});

describe("parseServerMessage", () => {
	test("parses valid message", () => {
		const msg = parseServerMessage(JSON.stringify({ type: "handshake", timestamp: 123 }));
		expect(msg).not.toBeNull();
		expect(msg?.type).toBe("handshake");
	});

	test("returns null for invalid JSON", () => {
		expect(parseServerMessage("not json")).toBeNull();
	});

	test("returns null for missing type", () => {
		expect(parseServerMessage('{"timestamp": 123}')).toBeNull();
	});

	test("returns null for missing timestamp", () => {
		expect(parseServerMessage('{"type": "handshake"}')).toBeNull();
	});
});
