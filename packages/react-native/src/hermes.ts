import type { MetricSample } from "@lanterna/core";
import { MetricType } from "@lanterna/core";

/** A single sample from the Hermes CPU profiler. */
export interface HermesSample {
	/** Timestamp in microseconds. */
	ts: number;
	/** Stack frame ID. */
	sf: number;
}

/** A stack frame from Hermes profiling data. */
export interface HermesStackFrame {
	name: string;
	category: string;
	line: number;
	column: number;
	funcId: number;
}

/** Parsed Hermes CPU profile. */
export interface HermesProfile {
	samples: HermesSample[];
	stackFrames: Record<string, HermesStackFrame>;
	/** Duration of the profile in milliseconds. */
	durationMs: number;
	/** Estimated JS thread utilization (0-100). */
	jsThreadUtilization: number;
}

/** Raw Hermes profiler JSON output. */
export interface RawHermesProfile {
	traceEvents?: Array<{
		ph?: string;
		ts?: number;
		sf?: number;
		name?: string;
		cat?: string;
		args?: Record<string, unknown>;
	}>;
	samples?: HermesSample[];
	stackFrames?: Record<string, HermesStackFrame>;
}

/**
 * Parse raw Hermes profiler JSON into a structured profile.
 * Returns a default empty profile on invalid input.
 */
export function parseHermesProfile(raw: string): HermesProfile {
	try {
		const data = JSON.parse(raw) as RawHermesProfile;
		return parseHermesProfileData(data);
	} catch {
		return emptyProfile();
	}
}

/**
 * Parse pre-parsed Hermes profile data.
 */
export function parseHermesProfileData(data: RawHermesProfile): HermesProfile {
	if (!data) return emptyProfile();

	const samples = data.samples ?? extractSamplesFromTraceEvents(data.traceEvents);
	const stackFrames = data.stackFrames ?? {};

	if (samples.length < 2) {
		return { samples, stackFrames, durationMs: 0, jsThreadUtilization: 0 };
	}

	const sorted = [...samples].sort((a, b) => a.ts - b.ts);
	const durationUs = sorted[sorted.length - 1].ts - sorted[0].ts;
	const durationMs = durationUs / 1000;

	// Estimate JS thread utilization from sample density
	// Hermes samples at ~1ms intervals when JS is active, gaps indicate idle
	const expectedSamples = durationMs; // ~1 sample per ms
	const jsThreadUtilization = Math.min(100, (samples.length / Math.max(1, expectedSamples)) * 100);

	return {
		samples: sorted,
		stackFrames,
		durationMs: Math.round(durationMs),
		jsThreadUtilization: Math.round(jsThreadUtilization * 10) / 10,
	};
}

/**
 * Convert Hermes profile into MetricSamples.
 */
export function hermesToSamples(profile: HermesProfile, timestamp: number): MetricSample[] {
	const samples: MetricSample[] = [];

	if (profile.durationMs > 0) {
		// JS FPS estimated from thread utilization
		// 100% utilization at 60fps = 60, lower utilization = proportionally lower
		const jsFps = Math.round((profile.jsThreadUtilization / 100) * 60 * 10) / 10;
		samples.push({
			type: MetricType.JS_FPS,
			value: Math.min(60, jsFps),
			timestamp,
			unit: "fps",
		});

		samples.push({
			type: MetricType.CPU,
			value: profile.jsThreadUtilization,
			timestamp,
			unit: "%",
		});
	}

	return samples;
}

function extractSamplesFromTraceEvents(events: RawHermesProfile["traceEvents"]): HermesSample[] {
	if (!events) return [];
	return events
		.filter((e) => e.ph === "P" && typeof e.ts === "number" && typeof e.sf === "number")
		.map((e) => ({ ts: e.ts as number, sf: e.sf as number }));
}

function emptyProfile(): HermesProfile {
	return { samples: [], stackFrames: {}, durationMs: 0, jsThreadUtilization: 0 };
}
