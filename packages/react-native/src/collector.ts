import type { MetricSample } from "@lanterna/core";
import type { BridgeStats } from "./bridge-tracker";
import type { FpsResult } from "./fps";
import { calculateFps, fpsToSamples } from "./fps";
import type { HermesProfile } from "./hermes";
import { hermesToSamples } from "./hermes";
import type { LayoutStats } from "./layout-tracker";
import type { PerformanceMeasure } from "./marks";
import { PerformanceMarks } from "./marks";
import type { NetworkRequest } from "./network";
import type { ComponentStats } from "./profiler";
import { ProfilerBridge } from "./profiler";

/** Configuration for the metric collector. */
export interface CollectorConfig {
	/** Collection interval in milliseconds. */
	intervalMs: number;
	/** Whether to collect FPS data. */
	collectFps: boolean;
	/** Whether to collect Hermes profiler data. */
	collectHermes: boolean;
	/** Whether to collect React Profiler data. */
	collectReactProfiler: boolean;
}

/** A snapshot of all metrics at a point in time. */
export interface MetricSnapshot {
	timestamp: number;
	samples: MetricSample[];
	fps: FpsResult | null;
	hermes: HermesProfile | null;
	componentStats: ComponentStats[];
	customMeasures: PerformanceMeasure[];
	/** Tier 3: captured network requests (if available). */
	networkRequests: NetworkRequest[];
	/** Tier 3: bridge/JSI call statistics (if available). */
	bridgeStats: BridgeStats | null;
	/** Tier 3: layout tracking statistics (if available). */
	layoutStats: LayoutStats | null;
}

/** Listener for metric snapshots. */
export type SnapshotListener = (snapshot: MetricSnapshot) => void;

const DEFAULT_COLLECTOR_CONFIG: CollectorConfig = {
	intervalMs: 500,
	collectFps: true,
	collectHermes: false,
	collectReactProfiler: true,
};

/**
 * Metric collector that aggregates data from all sources at configurable intervals.
 * Combines FPS, Hermes profiling, React Profiler, custom marks, and Tier 3 deep
 * instrumentation data (network, bridge, layout) into unified snapshots.
 */
export class MetricCollector {
	readonly config: CollectorConfig;
	readonly profiler: ProfilerBridge;
	readonly marks: PerformanceMarks;

	private listeners = new Set<SnapshotListener>();
	private snapshots: MetricSnapshot[] = [];
	private running = false;
	private intervalId: ReturnType<typeof setInterval> | null = null;
	private lastFpsResult: FpsResult | null = null;
	private lastHermesProfile: HermesProfile | null = null;
	private lastNetworkRequests: NetworkRequest[] = [];
	private lastBridgeStats: BridgeStats | null = null;
	private lastLayoutStats: LayoutStats | null = null;

	constructor(config: Partial<CollectorConfig> = {}) {
		this.config = { ...DEFAULT_COLLECTOR_CONFIG, ...config };
		this.profiler = new ProfilerBridge();
		this.marks = new PerformanceMarks();
	}

	/** Whether the collector is currently running. */
	get isRunning(): boolean {
		return this.running;
	}

	/** All collected snapshots. */
	get allSnapshots(): MetricSnapshot[] {
		return [...this.snapshots];
	}

	/**
	 * Start collecting metrics at the configured interval.
	 */
	start(): void {
		if (this.running) return;
		this.running = true;
		this.intervalId = setInterval(() => this.collect(), this.config.intervalMs);
	}

	/**
	 * Stop collecting metrics.
	 */
	stop(): void {
		if (!this.running) return;
		this.running = false;
		if (this.intervalId !== null) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	/**
	 * Feed FPS frame data into the collector.
	 * Call this when new frame timestamps arrive from the native module.
	 */
	feedFrameData(timestamps: number[], targetIntervalMs = 16.667): void {
		this.lastFpsResult = calculateFps({ timestamps, targetIntervalMs });
	}

	/**
	 * Feed a Hermes profile into the collector.
	 */
	feedHermesProfile(profile: HermesProfile): void {
		this.lastHermesProfile = profile;
	}

	/**
	 * Feed network request data into the collector.
	 * Call this with captured requests from the NetworkInterceptor.
	 */
	feedNetworkData(requests: NetworkRequest[]): void {
		this.lastNetworkRequests = [...requests];
	}

	/**
	 * Feed bridge/JSI call statistics into the collector.
	 * Call this with stats from the BridgeTracker.
	 */
	feedBridgeStats(stats: BridgeStats): void {
		this.lastBridgeStats = stats;
	}

	/**
	 * Feed layout tracking statistics into the collector.
	 * Call this with stats from the LayoutTracker.
	 */
	feedLayoutStats(stats: LayoutStats): void {
		this.lastLayoutStats = stats;
	}

	/**
	 * Manually trigger a collection cycle.
	 * Returns the snapshot.
	 */
	collect(): MetricSnapshot {
		const timestamp = Date.now();
		const samples: MetricSample[] = [];

		if (this.config.collectFps && this.lastFpsResult) {
			samples.push(...fpsToSamples(this.lastFpsResult, timestamp));
		}

		if (this.config.collectHermes && this.lastHermesProfile) {
			samples.push(...hermesToSamples(this.lastHermesProfile, timestamp));
		}

		const componentStats = this.config.collectReactProfiler ? this.profiler.getStats() : [];
		const customMeasures = this.marks.getMeasures();

		const snapshot: MetricSnapshot = {
			timestamp,
			samples,
			fps: this.lastFpsResult,
			hermes: this.lastHermesProfile,
			componentStats,
			customMeasures,
			networkRequests: this.lastNetworkRequests,
			bridgeStats: this.lastBridgeStats,
			layoutStats: this.lastLayoutStats,
		};

		this.snapshots.push(snapshot);
		this.notifyListeners(snapshot);
		return snapshot;
	}

	/** Subscribe to metric snapshots. Returns an unsubscribe function. */
	onSnapshot(listener: SnapshotListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	/** Clear all collected data. */
	reset(): void {
		this.snapshots = [];
		this.lastFpsResult = null;
		this.lastHermesProfile = null;
		this.lastNetworkRequests = [];
		this.lastBridgeStats = null;
		this.lastLayoutStats = null;
		this.profiler.clear();
		this.marks.clear();
	}

	private notifyListeners(snapshot: MetricSnapshot): void {
		for (const listener of this.listeners) {
			listener(snapshot);
		}
	}
}
