/**
 * WebSocket server for receiving real-time metrics from @lanternajs/react-native apps.
 */

/** Message types from the protocol (duplicated here to avoid dependency on react-native package). */
export type ServerMessageType =
	| "handshake"
	| "handshake_ack"
	| "metrics"
	| "control"
	| "disconnect"
	| "error";

/** Parsed message from a connected app. */
export interface ServerMessage {
	type: ServerMessageType;
	timestamp: number;
	[key: string]: unknown;
}

/** A connected app session. */
export interface ConnectedApp {
	sessionId: string;
	appId: string;
	platform: "ios" | "android";
	deviceName: string;
	connectedAt: number;
	lastMetricsAt: number;
	latestMetrics: Record<string, number>;
	fps?: { ui: number; js: number; droppedFrames: number };
	memory?: { usedMb: number };
	currentScreen?: string;
}

/** Server event listener. */
export type ServerEventListener = (event: ServerEvent) => void;

/** Server events. */
export type ServerEvent =
	| { type: "appConnected"; app: ConnectedApp }
	| { type: "appDisconnected"; sessionId: string; reason: string }
	| { type: "metricsReceived"; sessionId: string; metrics: Record<string, number> }
	| { type: "serverStarted"; port: number }
	| { type: "serverStopped" }
	| { type: "error"; message: string };

/** Default port for the Lanterna WebSocket server. */
export const WS_DEFAULT_PORT = 8347;

let sessionCounter = 0;

function generateSessionId(): string {
	sessionCounter++;
	return `lanterna-${Date.now()}-${sessionCounter}`;
}

/**
 * Lanterna WebSocket metric server.
 *
 * Accepts connections from instrumented apps, processes handshakes,
 * and collects streaming metrics. Pure logic — no WebSocket runtime
 * dependency, allowing full testing in Bun.
 */
export class LanternaServer {
	private apps = new Map<string, ConnectedApp>();
	private listeners = new Set<ServerEventListener>();
	private running = false;
	private port: number;
	private httpServer: ReturnType<typeof Bun.serve> | null = null;

	constructor(port = WS_DEFAULT_PORT) {
		this.port = port;
	}

	/** Whether the server is running. */
	get isRunning(): boolean {
		return this.running;
	}

	/** Server port. */
	get serverPort(): number {
		return this.port;
	}

	/** All currently connected apps. */
	get connectedApps(): ConnectedApp[] {
		return [...this.apps.values()];
	}

	/** Get a connected app by session ID. */
	getApp(sessionId: string): ConnectedApp | null {
		return this.apps.get(sessionId) ?? null;
	}

	/**
	 * Start the server (sets running state).
	 */
	start(): void {
		if (this.running) return;
		this.running = true;
		this.emit({ type: "serverStarted", port: this.port });
	}

	/**
	 * Stop the server.
	 */
	stop(): void {
		if (!this.running) return;
		this.running = false;
		this.apps.clear();
		this.emit({ type: "serverStopped" });
	}

	/**
	 * Start the server with a real WebSocket listener bound to the port.
	 * Uses Bun's native WebSocket support — no external library needed.
	 */
	startListening(): void {
		if (this.running) return;

		const server = this;

		this.httpServer = Bun.serve({
			port: this.port,
			fetch(req, bunServer) {
				if (bunServer.upgrade(req, { data: {} })) return undefined;
				return new Response("Lanterna WebSocket Server", { status: 200 });
			},
			websocket: {
				message(ws, data) {
					const response = server.handleMessage(String(data));
					if (response) ws.send(response);
				},
				close(_ws) {
					// App disconnected without sending disconnect message
				},
			},
		});

		this.start();
	}

	/**
	 * Stop the server and close the WebSocket listener.
	 */
	stopListening(): void {
		this.httpServer?.stop();
		this.httpServer = null;
		this.stop();
	}

	/**
	 * Process an incoming message from a client.
	 * Returns a response message to send back, or null if no response needed.
	 */
	handleMessage(data: string): string | null {
		const message = parseServerMessage(data);
		if (!message) {
			this.emit({ type: "error", message: "Invalid message received" });
			return null;
		}

		switch (message.type) {
			case "handshake":
				return this.handleHandshake(message);
			case "metrics":
				this.handleMetrics(message);
				return null;
			case "disconnect":
				this.handleDisconnect(message);
				return null;
			default:
				return null;
		}
	}

	/** Subscribe to server events. Returns unsubscribe function. */
	on(listener: ServerEventListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	/** Remove all listeners. */
	removeAllListeners(): void {
		this.listeners.clear();
	}

	private handleHandshake(message: ServerMessage): string {
		const sessionId = generateSessionId();
		const app: ConnectedApp = {
			sessionId,
			appId: (message.appId as string) ?? "unknown",
			platform: (message.platform as "ios" | "android") ?? "android",
			deviceName: (message.deviceName as string) ?? "unknown",
			connectedAt: Date.now(),
			lastMetricsAt: 0,
			latestMetrics: {},
		};

		this.apps.set(sessionId, app);
		this.emit({ type: "appConnected", app });

		const ack = {
			type: "handshake_ack",
			timestamp: Date.now(),
			sessionId,
			config: { intervalMs: 1000, metrics: [] },
		};
		return JSON.stringify(ack);
	}

	private handleMetrics(message: ServerMessage): void {
		const sessionId = message.sessionId as string;
		const app = this.apps.get(sessionId);
		if (!app) return;

		const metrics = (message.metrics as Record<string, number>) ?? {};
		app.lastMetricsAt = Date.now();
		app.latestMetrics = metrics;

		if (message.fps) {
			app.fps = message.fps as ConnectedApp["fps"];
		}
		if (message.memory) {
			app.memory = message.memory as ConnectedApp["memory"];
		}
		if (typeof message.currentScreen === "string") {
			app.currentScreen = message.currentScreen;
		}

		this.emit({ type: "metricsReceived", sessionId, metrics });
	}

	private handleDisconnect(message: ServerMessage): void {
		const sessionId = message.sessionId as string;
		const reason = (message.reason as string) ?? "client disconnected";

		// Find and remove by sessionId or by matching
		for (const [id, _app] of this.apps) {
			if (id === sessionId) {
				this.apps.delete(id);
				this.emit({ type: "appDisconnected", sessionId: id, reason });
				return;
			}
		}
	}

	private emit(event: ServerEvent): void {
		for (const listener of this.listeners) {
			listener(event);
		}
	}
}

/**
 * Parse a raw message string into a ServerMessage.
 * Returns null for invalid messages.
 */
export function parseServerMessage(data: string): ServerMessage | null {
	try {
		const parsed = JSON.parse(data) as Record<string, unknown>;
		if (!parsed || typeof parsed !== "object") return null;
		if (typeof parsed.type !== "string") return null;
		if (typeof parsed.timestamp !== "number") return null;
		return parsed as ServerMessage;
	} catch {
		return null;
	}
}
