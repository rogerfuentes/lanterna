import { getNativeModule } from "./NativeLanterna";
import {
	DEFAULT_CONFIG,
	type LanternaEventMap,
	type LanternaEventType,
	type MetricsEventPayload,
	type NativeLanternaSpec,
	type ProfilingConfig,
	type ProfilingSession,
} from "./types";

type EventListener<T extends LanternaEventType> = (payload: LanternaEventMap[T]) => void;

/**
 * Lanterna profiling module — JS API wrapper around the native Turbo Module.
 *
 * Provides a high-level, type-safe API for starting/stopping profiling and
 * receiving metric events. Falls back gracefully when native module is unavailable.
 */
export class LanternaModule {
	private nativeModule: NativeLanternaSpec | null;
	private listeners = new Map<string, Set<EventListener<LanternaEventType>>>();
	private currentSession: ProfilingSession | null = null;

	constructor(nativeModule?: NativeLanternaSpec | null) {
		this.nativeModule = nativeModule ?? getNativeModule();
	}

	/** Whether the native module is available. */
	get isAvailable(): boolean {
		return this.nativeModule !== null;
	}

	/** The current profiling session, or null if not profiling. */
	get session(): ProfilingSession | null {
		return this.currentSession;
	}

	/**
	 * Start a profiling session with the given config.
	 * Returns the session, or null if the native module is unavailable.
	 */
	async startProfiling(config: Partial<ProfilingConfig> = {}): Promise<ProfilingSession | null> {
		if (!this.nativeModule) return null;

		const fullConfig: ProfilingConfig = { ...DEFAULT_CONFIG, ...config };
		const resultJson = await this.nativeModule.startProfiling(JSON.stringify(fullConfig));
		const result = JSON.parse(resultJson) as { sessionId: string };

		const session: ProfilingSession = {
			id: result.sessionId,
			active: true,
			startedAt: Date.now(),
			stoppedAt: null,
			config: fullConfig,
		};

		this.currentSession = session;
		this.emit("sessionStart", { sessionId: session.id, timestamp: session.startedAt });
		return session;
	}

	/**
	 * Stop the current profiling session.
	 * Returns the completed session, or null if no session is active.
	 */
	async stopProfiling(): Promise<ProfilingSession | null> {
		if (!this.nativeModule || !this.currentSession) return null;

		const resultJson = await this.nativeModule.stopProfiling(this.currentSession.id);
		JSON.parse(resultJson); // validate response

		const stoppedAt = Date.now();
		this.currentSession = {
			...this.currentSession,
			active: false,
			stoppedAt,
		};

		this.emit("sessionStop", { sessionId: this.currentSession.id, timestamp: stoppedAt });
		const session = this.currentSession;
		this.currentSession = null;
		return session;
	}

	/**
	 * Get the latest metrics from the current session.
	 * Returns the metrics payload, or null if unavailable.
	 */
	async getMetrics(): Promise<MetricsEventPayload | null> {
		if (!this.nativeModule || !this.currentSession) return null;

		const resultJson = await this.nativeModule.getMetrics(this.currentSession.id);
		const result = JSON.parse(resultJson) as MetricsEventPayload;
		this.emit("metrics", result);
		return result;
	}

	/** Check if profiling is currently active. */
	async isProfilingActive(): Promise<boolean> {
		if (!this.nativeModule) return false;
		return this.nativeModule.isProfilingActive();
	}

	/** Subscribe to a profiling event. Returns an unsubscribe function. */
	on<T extends LanternaEventType>(event: T, listener: EventListener<T>): () => void {
		const key = event as string;
		if (!this.listeners.has(key)) {
			this.listeners.set(key, new Set());
		}
		const set = this.listeners.get(key) as Set<EventListener<LanternaEventType>>;
		set.add(listener as EventListener<LanternaEventType>);
		return () => set.delete(listener as EventListener<LanternaEventType>);
	}

	/** Remove all event listeners. */
	removeAllListeners(): void {
		this.listeners.clear();
	}

	private emit<T extends LanternaEventType>(event: T, payload: LanternaEventMap[T]): void {
		const set = this.listeners.get(event as string);
		if (!set) return;
		for (const listener of set) {
			listener(payload);
		}
	}
}

/**
 * Create a mock native module for testing purposes.
 * Simulates native module behavior without requiring React Native.
 */
export function createMockNativeModule(
	overrides: Partial<NativeLanternaSpec> = {},
): NativeLanternaSpec {
	let active = false;
	let sessionCounter = 0;
	let currentSessionId: string | null = null;

	return {
		async startProfiling(configJson: string): Promise<string> {
			JSON.parse(configJson); // validate input
			sessionCounter++;
			currentSessionId = `mock-session-${sessionCounter}`;
			active = true;
			return JSON.stringify({ sessionId: currentSessionId });
		},
		async stopProfiling(sessionId: string): Promise<string> {
			active = false;
			const id = currentSessionId;
			currentSessionId = null;
			return JSON.stringify({ sessionId: id ?? sessionId, stopped: true });
		},
		async getMetrics(sessionId: string): Promise<string> {
			return JSON.stringify({
				sessionId,
				timestamp: Date.now(),
				metrics: { ui_fps: 60, js_fps: 58, cpu: 25, memory: 180 },
			} satisfies MetricsEventPayload);
		},
		async getFrameTimestamps(): Promise<string> {
			return JSON.stringify([]);
		},
		async isProfilingActive(): Promise<boolean> {
			return active;
		},
		async getActiveSessionId(): Promise<string | null> {
			return currentSessionId;
		},
		...overrides,
	};
}
