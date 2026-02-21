import { describe, expect, test } from "bun:test";
import {
	createDisconnect,
	createHandshake,
	createHandshakeAck,
	createMetricsMessage,
	parseMessage,
	serializeMessage,
} from "../protocol";

describe("serializeMessage / parseMessage", () => {
	test("roundtrips handshake message", () => {
		const msg = createHandshake("com.example.app", "android", "Pixel 6");
		const serialized = serializeMessage(msg);
		const parsed = parseMessage(serialized);
		expect(parsed).not.toBeNull();
		expect(parsed?.type).toBe("handshake");
	});

	test("roundtrips handshake_ack message", () => {
		const msg = createHandshakeAck("session-1", 500, ["ui_fps", "cpu"]);
		const serialized = serializeMessage(msg);
		const parsed = parseMessage(serialized);
		expect(parsed).not.toBeNull();
		expect(parsed?.type).toBe("handshake_ack");
	});

	test("roundtrips metrics message", () => {
		const msg = createMetricsMessage(
			"session-1",
			{ ui_fps: 60, cpu: 25 },
			{ ui: 60, js: 58, droppedFrames: 0 },
		);
		const serialized = serializeMessage(msg);
		const parsed = parseMessage(serialized);
		expect(parsed).not.toBeNull();
		expect(parsed?.type).toBe("metrics");
	});

	test("roundtrips disconnect message", () => {
		const msg = createDisconnect("app closed");
		const serialized = serializeMessage(msg);
		const parsed = parseMessage(serialized);
		expect(parsed).not.toBeNull();
		expect(parsed?.type).toBe("disconnect");
	});
});

describe("parseMessage validation", () => {
	test("returns null for invalid JSON", () => {
		expect(parseMessage("not json")).toBeNull();
	});

	test("returns null for non-object", () => {
		expect(parseMessage('"string"')).toBeNull();
	});

	test("returns null for missing type", () => {
		expect(parseMessage('{"timestamp": 123}')).toBeNull();
	});

	test("returns null for missing timestamp", () => {
		expect(parseMessage('{"type": "handshake"}')).toBeNull();
	});

	test("returns null for invalid type", () => {
		expect(parseMessage('{"type": "invalid", "timestamp": 123}')).toBeNull();
	});

	test("accepts all valid message types", () => {
		const types = [
			"handshake",
			"handshake_ack",
			"metrics",
			"control",
			"disconnect",
			"error",
		] as const;
		for (const type of types) {
			const msg = parseMessage(JSON.stringify({ type, timestamp: Date.now() }));
			expect(msg).not.toBeNull();
			expect(msg?.type).toBe(type);
		}
	});
});

describe("createHandshake", () => {
	test("includes all required fields", () => {
		const msg = createHandshake("com.example.app", "ios", "iPhone 15");
		expect(msg.type).toBe("handshake");
		expect(msg.appId).toBe("com.example.app");
		expect(msg.platform).toBe("ios");
		expect(msg.deviceName).toBe("iPhone 15");
		expect(msg.timestamp).toBeGreaterThan(0);
	});

	test("uses defaults for optional fields", () => {
		const msg = createHandshake("app", "android", "device");
		expect(msg.appVersion).toBe("0.0.0");
		expect(msg.lanternaVersion).toBe("0.0.1");
	});
});

describe("createHandshakeAck", () => {
	test("includes session and config", () => {
		const msg = createHandshakeAck("session-42", 2000, ["ui_fps"]);
		expect(msg.sessionId).toBe("session-42");
		expect(msg.config.intervalMs).toBe(2000);
		expect(msg.config.metrics).toEqual(["ui_fps"]);
	});

	test("uses defaults", () => {
		const msg = createHandshakeAck("s1");
		expect(msg.config.intervalMs).toBe(1000);
		expect(msg.config.metrics).toEqual([]);
	});
});

describe("createMetricsMessage", () => {
	test("includes metrics and optional fps/memory", () => {
		const msg = createMetricsMessage(
			"s1",
			{ ui_fps: 58.5, cpu: 30 },
			{ ui: 58.5, js: 55, droppedFrames: 2 },
			{ usedMb: 250 },
		);
		expect(msg.sessionId).toBe("s1");
		expect(msg.metrics.ui_fps).toBe(58.5);
		expect(msg.fps?.ui).toBe(58.5);
		expect(msg.memory?.usedMb).toBe(250);
	});
});
