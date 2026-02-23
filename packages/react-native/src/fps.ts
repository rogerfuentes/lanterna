import type { MetricSample } from "@lanternajs/core";
import { MetricType } from "@lanternajs/core";

/** Raw frame timing data from native Choreographer/CADisplayLink. */
export interface FrameData {
	/** Frame timestamps in milliseconds (monotonic). */
	timestamps: number[];
	/** Target frame interval in ms (e.g., 16.67 for 60Hz). */
	targetIntervalMs: number;
}

/** Processed FPS result. */
export interface FpsResult {
	/** Average FPS over the sample window. */
	fps: number;
	/** Number of dropped frames (exceeded 2x target interval). */
	droppedFrames: number;
	/** Total frames in the sample. */
	totalFrames: number;
	/** Percentage of dropped frames. */
	dropRate: number;
}

const DEFAULT_TARGET_INTERVAL = 16.667; // 60Hz

/**
 * Calculate FPS from a sequence of frame timestamps.
 * Returns graceful defaults for insufficient data.
 */
export function calculateFps(data: FrameData): FpsResult {
	const { timestamps, targetIntervalMs = DEFAULT_TARGET_INTERVAL } = data;

	if (timestamps.length < 2) {
		return { fps: 0, droppedFrames: 0, totalFrames: 0, dropRate: 0 };
	}

	const sorted = [...timestamps].sort((a, b) => a - b);
	const intervals: number[] = [];

	for (let i = 1; i < sorted.length; i++) {
		intervals.push(sorted[i] - sorted[i - 1]);
	}

	const totalDuration = sorted[sorted.length - 1] - sorted[0];
	if (totalDuration <= 0) {
		return { fps: 0, droppedFrames: 0, totalFrames: intervals.length, dropRate: 0 };
	}

	const fps = (intervals.length / totalDuration) * 1000;
	const dropThreshold = targetIntervalMs * 2;
	const droppedFrames = intervals.filter((interval) => interval > dropThreshold).length;
	const dropRate = intervals.length > 0 ? (droppedFrames / intervals.length) * 100 : 0;

	return {
		fps: Math.round(fps * 10) / 10,
		droppedFrames,
		totalFrames: intervals.length,
		dropRate: Math.round(dropRate * 10) / 10,
	};
}

/**
 * Convert FPS result into MetricSamples compatible with @lanternajs/core scoring.
 */
export function fpsToSamples(result: FpsResult, timestamp: number): MetricSample[] {
	const samples: MetricSample[] = [];

	if (result.fps > 0) {
		samples.push({
			type: MetricType.UI_FPS,
			value: result.fps,
			timestamp,
			unit: "fps",
		});
	}

	if (result.totalFrames > 0) {
		samples.push({
			type: MetricType.FRAME_DROPS,
			value: result.dropRate,
			timestamp,
			unit: "%",
		});
	}

	return samples;
}
