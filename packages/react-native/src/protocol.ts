/**
 * Lanterna WebSocket streaming protocol.
 *
 * Defines the message format for real-time metric streaming between
 * the in-app module (client) and the CLI (server).
 */

/** All supported message types. */
export type MessageType =
	| "handshake"
	| "handshake_ack"
	| "metrics"
	| "control"
	| "disconnect"
	| "error";

/** Base message shape. All messages include type and timestamp. */
export interface BaseMessage {
	type: MessageType;
	timestamp: number;
}

/** Client → Server: initial handshake with app info. */
export interface HandshakeMessage extends BaseMessage {
	type: "handshake";
	appId: string;
	appVersion: string;
	platform: "ios" | "android";
	deviceName: string;
	lanternaVersion: string;
}

/** Server → Client: acknowledge handshake. */
export interface HandshakeAckMessage extends BaseMessage {
	type: "handshake_ack";
	sessionId: string;
	config: {
		intervalMs: number;
		metrics: string[];
	};
}

/** Client → Server: periodic metrics payload. */
export interface MetricsMessage extends BaseMessage {
	type: "metrics";
	sessionId: string;
	metrics: Record<string, number>;
	fps?: {
		ui: number;
		js: number;
		droppedFrames: number;
	};
	memory?: {
		usedMb: number;
	};
}

/** Server → Client: control commands. */
export interface ControlMessage extends BaseMessage {
	type: "control";
	action: "start" | "stop" | "configure";
	config?: {
		intervalMs?: number;
		metrics?: string[];
	};
}

/** Either direction: graceful disconnect. */
export interface DisconnectMessage extends BaseMessage {
	type: "disconnect";
	reason: string;
}

/** Either direction: error notification. */
export interface ErrorMessage extends BaseMessage {
	type: "error";
	code: string;
	message: string;
}

/** Union of all message types. */
export type LanternaMessage =
	| HandshakeMessage
	| HandshakeAckMessage
	| MetricsMessage
	| ControlMessage
	| DisconnectMessage
	| ErrorMessage;

/** Default server port. */
export const DEFAULT_PORT = 8347; // "L-A-N-T" on phone keypad

/** Default metric streaming interval. */
export const DEFAULT_INTERVAL_MS = 1000;

/**
 * Serialize a message to JSON string.
 */
export function serializeMessage(message: LanternaMessage): string {
	return JSON.stringify(message);
}

/**
 * Parse and validate a message from JSON string.
 * Returns null for invalid messages (never throws).
 */
export function parseMessage(data: string): LanternaMessage | null {
	try {
		const parsed = JSON.parse(data) as Record<string, unknown>;
		if (!parsed || typeof parsed !== "object") return null;
		if (typeof parsed.type !== "string") return null;
		if (typeof parsed.timestamp !== "number") return null;

		const validTypes: MessageType[] = [
			"handshake",
			"handshake_ack",
			"metrics",
			"control",
			"disconnect",
			"error",
		];
		if (!validTypes.includes(parsed.type as MessageType)) return null;

		return parsed as unknown as LanternaMessage;
	} catch {
		return null;
	}
}

/**
 * Create a handshake message.
 */
export function createHandshake(
	appId: string,
	platform: "ios" | "android",
	deviceName: string,
	appVersion = "0.0.0",
	lanternaVersion = "0.0.1",
): HandshakeMessage {
	return {
		type: "handshake",
		timestamp: Date.now(),
		appId,
		appVersion,
		platform,
		deviceName,
		lanternaVersion,
	};
}

/**
 * Create a handshake acknowledgment.
 */
export function createHandshakeAck(
	sessionId: string,
	intervalMs = DEFAULT_INTERVAL_MS,
	metrics: string[] = [],
): HandshakeAckMessage {
	return {
		type: "handshake_ack",
		timestamp: Date.now(),
		sessionId,
		config: { intervalMs, metrics },
	};
}

/**
 * Create a metrics message.
 */
export function createMetricsMessage(
	sessionId: string,
	metrics: Record<string, number>,
	fps?: MetricsMessage["fps"],
	memory?: MetricsMessage["memory"],
): MetricsMessage {
	return {
		type: "metrics",
		timestamp: Date.now(),
		sessionId,
		metrics,
		fps,
		memory,
	};
}

/**
 * Create a disconnect message.
 */
export function createDisconnect(reason: string): DisconnectMessage {
	return {
		type: "disconnect",
		timestamp: Date.now(),
		reason,
	};
}
