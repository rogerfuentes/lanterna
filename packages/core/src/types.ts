export type Platform = "ios" | "android";

export type DeviceType = "simulator" | "emulator" | "physical";

export interface Device {
	id: string;
	name: string;
	platform: Platform;
	type: DeviceType;
}

export enum MetricType {
	UI_FPS = "ui_fps",
	JS_FPS = "js_fps",
	CPU = "cpu",
	MEMORY = "memory",
	FRAME_DROPS = "frame_drops",
	TTI = "tti",
}

export interface MetricSample {
	type: MetricType;
	value: number;
	timestamp: number;
	unit: string;
}

export interface ScreenMetricsData {
	screenName: string;
	visitedAt: number;
	leftAt?: number;
	ttid?: number;
	ttfd?: number;
	renderDuration?: number;
	timeOnScreen?: number;
}

export interface NavigationTimelineData {
	screens: ScreenMetricsData[];
	currentScreen: string | null;
	totalScreenChanges: number;
	averageTTID: number | null;
	slowestScreen: ScreenMetricsData | null;
}

export interface NetworkRequestData {
	id: string;
	url: string;
	method: string;
	startTime: number;
	duration?: number;
	status?: number;
	responseSize?: number;
	error?: string;
}

export interface BridgeStatsData {
	callsPerSecond: number;
	totalCalls: number;
	topModules: Array<{ module: string; count: number }>;
}

export interface LayoutStatsData {
	totalLayoutEvents: number;
	componentsWithExcessiveLayouts: Array<{ name: string; count: number }>;
	averageLayoutsPerComponent: number;
}

export interface MeasurementSession {
	device: Device;
	platform: Platform;
	samples: MetricSample[];
	duration: number;
	startedAt: number;
	// Tier 3 + Navigation (optional)
	navigationTimeline?: NavigationTimelineData;
	networkRequests?: NetworkRequestData[];
	bridgeStats?: BridgeStatsData;
	layoutStats?: LayoutStatsData;
}

export enum ScoreCategory {
	GOOD = "good",
	NEEDS_WORK = "needs_work",
	POOR = "poor",
}

export interface MetricScore {
	type: MetricType;
	value: number;
	score: number;
	category: ScoreCategory;
	weight: number;
}

export interface ScoreResult {
	overall: number;
	category: ScoreCategory;
	perMetric: MetricScore[];
}

export type RecommendationSeverity = "critical" | "warning" | "info";

export interface Recommendation {
	id: string;
	title: string;
	severity: RecommendationSeverity;
	message: string;
	metric: MetricType;
	suggestion: string;
}
