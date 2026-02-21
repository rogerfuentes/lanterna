export interface DevToolsMetrics {
	timestamp: number;
	fps?: { ui: number; js: number; droppedFrames: number };
	cpu?: number;
	memory?: number;
	currentScreen?: string;
	screenMetrics?: ScreenMetricsSnapshot;
	networkSummary?: NetworkSummary;
	bridgeSummary?: BridgeSummary;
	score?: number;
	category?: string;
}

export interface ScreenMetricsSnapshot {
	screenName: string;
	ttid?: number;
	renderDuration?: number;
	timeOnScreen?: number;
}

export interface NetworkSummary {
	activeRequests: number;
	totalRequests: number;
	averageDuration: number;
	slowestUrl?: string;
	slowestDuration?: number;
}

export interface BridgeSummary {
	callsPerSecond: number;
	totalCalls: number;
	topModule?: string;
}

export type DevToolsMessageType = "metrics" | "config" | "command" | "status";

export interface DevToolsMessage {
	type: DevToolsMessageType;
	payload: unknown;
	timestamp: number;
}
