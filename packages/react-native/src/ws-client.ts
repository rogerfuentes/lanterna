import type { MetricSnapshot } from "./collector";
import {
	createDisconnect,
	createHandshake,
	createMetricsMessage,
	DEFAULT_INTERVAL_MS,
	DEFAULT_PORT,
	type HandshakeAckMessage,
	type LanternaMessage,
	parseMessage,
	serializeMessage,
} from "./protocol";

/** WebSocket client configuration. */
export interface WsClientConfig {
	/** Server host (default: "localhost"). */
	host: string;
	/** Server port (default: 8347). */
	port: number;
	/** Auto-reconnect on disconnect (default: true). */
	autoReconnect: boolean;
	/** Reconnect delay in ms (default: 3000). */
	reconnectDelayMs: number;
	/** Maximum reconnect attempts (default: 10). */
	maxReconnectAttempts: number;
}

/** Client connection state. */
export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";

/** Listener for client events. */
export type ClientEventListener = (event: ClientEvent) => void;

/** Client events. */
export type ClientEvent =
	| { type: "connected"; sessionId: string }
	| { type: "disconnected"; reason: string }
	| { type: "error"; message: string }
	| { type: "control"; action: string }
	| { type: "stateChange"; state: ConnectionState };

const DEFAULT_CLIENT_CONFIG: WsClientConfig = {
	host: "localhost",
	port: DEFAULT_PORT,
	autoReconnect: true,
	reconnectDelayMs: 3000,
	maxReconnectAttempts: 10,
};

/**
 * WebSocket client for streaming metrics from the in-app module to the CLI.
 *
 * Handles connection lifecycle, handshake protocol, auto-reconnection,
 * and metric snapshot serialization.
 */
export class LanternaWsClient {
	readonly config: WsClientConfig;
	private state: ConnectionState = "disconnected";
	private sessionId: string | null = null;
	private reconnectAttempts = 0;
	private listeners = new Set<ClientEventListener>();
	private intervalMs = DEFAULT_INTERVAL_MS;
	private ws: WebSocket | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

	// App info for handshake
	private appId: string;
	private platform: "ios" | "android";
	private deviceName: string;

	constructor(
		appId: string,
		platform: "ios" | "android",
		deviceName: string,
		config: Partial<WsClientConfig> = {},
	) {
		this.config = { ...DEFAULT_CLIENT_CONFIG, ...config };
		this.appId = appId;
		this.platform = platform;
		this.deviceName = deviceName;
	}

	/**
	 * Open a WebSocket connection to the Lanterna CLI server.
	 * Sends handshake on connect, handles reconnection automatically.
	 */
	connect(): void {
		if (this.state === "connecting" || this.state === "connected") return;

		this.setState("connecting");

		try {
			const url = `ws://${this.config.host}:${this.config.port}`;
			const ws = new WebSocket(url);

			ws.onopen = () => {
				this.ws = ws;
				ws.send(this.createHandshakeMessage());
			};

			ws.onmessage = (event) => {
				this.handleMessage(String(event.data));
			};

			ws.onclose = () => {
				this.ws = null;
				if (this.state === "connected") {
					this.handleDisconnect("connection closed");
				}
				if (this.shouldReconnect()) {
					this.scheduleReconnect();
				} else if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
					this.warnConnectionFailed();
				}
			};

			ws.onerror = () => {
				// onclose will fire after onerror — reconnection handled there
				this.emit({ type: "error", message: "WebSocket connection error" });
			};
		} catch {
			this.setState("disconnected");
			if (this.shouldReconnect()) {
				this.scheduleReconnect();
			}
		}
	}

	/**
	 * Close the connection and stop reconnection attempts.
	 */
	disconnect(reason = "client stopped"): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		this.reconnectAttempts = this.config.maxReconnectAttempts; // prevent reconnect

		if (this.ws) {
			try {
				this.ws.send(this.createDisconnectMessage(reason));
			} catch {
				// ignore send errors during shutdown
			}
			this.ws.close();
			this.ws = null;
		}

		this.sessionId = null;
		this.setState("disconnected");
	}

	/**
	 * Send a raw message string over the WebSocket.
	 * Returns true if sent, false if not connected.
	 */
	send(data: string): boolean {
		if (!this.ws || this.state !== "connected") return false;
		try {
			this.ws.send(data);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Send a metric snapshot to the CLI server.
	 * Only sends if connected (sessionId established via handshake).
	 */
	sendSnapshot(snapshot: MetricSnapshot, memoryMb?: number): boolean {
		if (!this.sessionId) return false;
		return this.send(this.serializeSnapshotWithMemory(snapshot, memoryMb));
	}

	private scheduleReconnect(): void {
		this.attemptReconnect();
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			this.connect();
		}, this.config.reconnectDelayMs);
	}

	/** Current connection state. */
	get connectionState(): ConnectionState {
		return this.state;
	}

	/** Current session ID (set after handshake). */
	get currentSessionId(): string | null {
		return this.sessionId;
	}

	/** Configured streaming interval. */
	get streamingIntervalMs(): number {
		return this.intervalMs;
	}

	/**
	 * Create the handshake message for this client.
	 */
	createHandshakeMessage(): string {
		const msg = createHandshake(this.appId, this.platform, this.deviceName);
		return serializeMessage(msg);
	}

	/**
	 * Process a received message from the server.
	 * Returns true if the message was handled.
	 */
	handleMessage(data: string): boolean {
		const message = parseMessage(data);
		if (!message) return false;

		switch (message.type) {
			case "handshake_ack":
				return this.handleHandshakeAck(message as HandshakeAckMessage);
			case "control":
				this.emit({
					type: "control",
					action: (message as LanternaMessage & { action: string }).action,
				});
				return true;
			case "disconnect":
				this.handleDisconnect((message as LanternaMessage & { reason: string }).reason);
				return true;
			case "error":
				this.emit({
					type: "error",
					message: (message as LanternaMessage & { message: string }).message,
				});
				return true;
			default:
				return false;
		}
	}

	/**
	 * Serialize a metric snapshot for sending to the server.
	 */
	serializeSnapshot(snapshot: MetricSnapshot): string {
		return this.serializeSnapshotWithMemory(snapshot);
	}

	private serializeSnapshotWithMemory(snapshot: MetricSnapshot, memoryMb?: number): string {
		const metrics: Record<string, number> = {};
		for (const sample of snapshot.samples) {
			metrics[sample.type] = sample.value;
		}

		const fps = snapshot.fps
			? { ui: snapshot.fps.fps, js: 0, droppedFrames: snapshot.fps.droppedFrames }
			: undefined;

		const memory = memoryMb != null && memoryMb > 0 ? { usedMb: memoryMb } : undefined;

		const msg = createMetricsMessage(this.sessionId ?? "unknown", metrics, fps, memory);
		return serializeMessage(msg);
	}

	/**
	 * Create a disconnect message.
	 */
	createDisconnectMessage(reason: string): string {
		return serializeMessage(createDisconnect(reason));
	}

	/**
	 * Simulate a connection (for testing without real WebSocket).
	 */
	simulateConnect(): void {
		this.setState("connecting");
	}

	/**
	 * Simulate connection established.
	 */
	simulateConnected(sessionId: string): void {
		this.sessionId = sessionId;
		this.reconnectAttempts = 0;
		this.setState("connected");
		this.emit({ type: "connected", sessionId });
	}

	/**
	 * Simulate disconnect.
	 */
	simulateDisconnect(reason: string): void {
		this.handleDisconnect(reason);
	}

	/**
	 * Check if reconnect should be attempted.
	 */
	shouldReconnect(): boolean {
		return this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts;
	}

	/**
	 * Increment reconnect attempt counter.
	 */
	attemptReconnect(): void {
		this.reconnectAttempts++;
		this.setState("reconnecting");
	}

	/** Subscribe to client events. Returns unsubscribe function. */
	on(listener: ClientEventListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	/** Remove all listeners. */
	removeAllListeners(): void {
		this.listeners.clear();
	}

	private handleHandshakeAck(message: HandshakeAckMessage): boolean {
		this.sessionId = message.sessionId;
		this.intervalMs = message.config.intervalMs;
		this.reconnectAttempts = 0;
		this.setState("connected");
		this.emit({ type: "connected", sessionId: message.sessionId });
		return true;
	}

	private handleDisconnect(reason: string): void {
		this.sessionId = null;
		this.setState("disconnected");
		this.emit({ type: "disconnected", reason });
	}

	private setState(newState: ConnectionState): void {
		if (this.state === newState) return;
		this.state = newState;
		this.emit({ type: "stateChange", state: newState });
	}

	private warnConnectionFailed(): void {
		const url = `ws://${this.config.host}:${this.config.port}`;
		console.warn(
			`[Lanterna] WebSocket connection to ${url} failed after ${this.config.maxReconnectAttempts} attempts. ` +
				"Metrics will not be streamed to the CLI.\n" +
				"• Make sure `lanterna monitor` is running\n" +
				"• On iOS, add NSAllowsLocalNetworking to Info.plist (see docs)\n" +
				"• On physical devices, set the wsHost prop to your machine's IP",
		);
	}

	private emit(event: ClientEvent): void {
		for (const listener of this.listeners) {
			listener(event);
		}
	}
}
