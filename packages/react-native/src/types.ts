import type { MetricType } from "@lanterna/core";

/** Configuration for a profiling session. */
export interface ProfilingConfig {
	/** Sampling interval in milliseconds (default: 500). */
	intervalMs: number;
	/** Which metrics to collect (default: all). */
	metrics: MetricType[];
	/** Whether to enable Hermes CPU profiling (default: false). */
	hermesProfiling: boolean;
	/** Whether to capture React component render times (default: false). */
	reactProfiling: boolean;
	/** Whether to intercept and track network requests (default: false). */
	networkWaterfall?: boolean;
	/** Whether to track bridge/JSI calls (default: false). */
	bridgeTracking?: boolean;
	/** Whether to track Yoga layout events (default: false). */
	layoutTracking?: boolean;
}

/** A running or completed profiling session. */
export interface ProfilingSession {
	/** Unique session identifier. */
	id: string;
	/** Whether the session is currently active. */
	active: boolean;
	/** Timestamp when profiling started (ms since epoch). */
	startedAt: number;
	/** Timestamp when profiling stopped, or null if still active. */
	stoppedAt: number | null;
	/** The config used for this session. */
	config: ProfilingConfig;
}

/** Events emitted by the native module. */
export type LanternaEventType = "metrics" | "error" | "sessionStart" | "sessionStop";

/** Payload for a metrics event. */
export interface MetricsEventPayload {
	sessionId: string;
	timestamp: number;
	metrics: Record<string, number>;
}

/** Payload for an error event. */
export interface ErrorEventPayload {
	sessionId: string;
	message: string;
	code: string;
}

/** Payload for session lifecycle events. */
export interface SessionEventPayload {
	sessionId: string;
	timestamp: number;
}

/** Union of all event payloads by type. */
export interface LanternaEventMap {
	metrics: MetricsEventPayload;
	error: ErrorEventPayload;
	sessionStart: SessionEventPayload;
	sessionStop: SessionEventPayload;
}

/** Interface that the native module must implement. */
export interface NativeLanternaSpec {
	startProfiling(configJson: string): Promise<string>;
	stopProfiling(sessionId: string): Promise<string>;
	getMetrics(sessionId: string): Promise<string>;
	isProfilingActive(): Promise<boolean>;
	getActiveSessionId(): Promise<string | null>;
}

export const DEFAULT_CONFIG: ProfilingConfig = {
	intervalMs: 500,
	metrics: [],
	hermesProfiling: false,
	reactProfiling: false,
};
