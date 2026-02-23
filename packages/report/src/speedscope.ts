import type { MeasurementSession, MetricSample } from "@lanternajs/core";
import { MetricType } from "@lanternajs/core";

export interface SpeedScopeEvent {
	type: "O" | "C";
	at: number;
	frame: number;
}

export interface SpeedScopeFrame {
	name: string;
	file?: string;
	col?: number;
	line?: number;
}

export interface SpeedScopeProfile {
	type: "evented";
	name: string;
	unit: "milliseconds";
	startValue: number;
	endValue: number;
	events: SpeedScopeEvent[];
}

export interface SpeedScopeFile {
	$schema: string;
	shared: { frames: SpeedScopeFrame[] };
	profiles: SpeedScopeProfile[];
	name: string;
	activeProfileIndex: number;
	exporter: string;
}

const SCHEMA_URL = "https://www.speedscope.app/file/speedscope/0.0.1/speedscope.schema.json";

const PROFILE_LABELS: Record<MetricType, string> = {
	[MetricType.UI_FPS]: "UI FPS",
	[MetricType.JS_FPS]: "JS FPS",
	[MetricType.CPU]: "CPU Usage",
	[MetricType.MEMORY]: "Memory",
	[MetricType.FRAME_DROPS]: "Frame Drops",
	[MetricType.TTI]: "TTI",
};

function groupSamplesByType(samples: MetricSample[]): Map<MetricType, MetricSample[]> {
	const groups = new Map<MetricType, MetricSample[]>();

	for (const sample of samples) {
		const existing = groups.get(sample.type);
		if (existing) {
			existing.push(sample);
		} else {
			groups.set(sample.type, [sample]);
		}
	}

	return groups;
}

function buildProfileForMetric(
	type: MetricType,
	samples: MetricSample[],
	frames: SpeedScopeFrame[],
): SpeedScopeProfile {
	const sorted = [...samples].sort((a, b) => a.timestamp - b.timestamp);
	const events: SpeedScopeEvent[] = [];

	for (let i = 0; i < sorted.length; i++) {
		const sample = sorted[i];
		const frameName = `${PROFILE_LABELS[type]}: ${sample.value}`;
		const frameIndex = frames.length;
		frames.push({ name: frameName });

		const openAt = sample.timestamp;
		const closeAt = i < sorted.length - 1 ? sorted[i + 1].timestamp : sample.timestamp + 1;

		events.push({ type: "O", at: openAt, frame: frameIndex });
		events.push({ type: "C", at: closeAt, frame: frameIndex });
	}

	const startValue = sorted.length > 0 ? sorted[0].timestamp : 0;
	const lastSample = sorted[sorted.length - 1];
	const endValue = sorted.length > 0 ? lastSample.timestamp + 1 : 0;

	return {
		type: "evented",
		name: PROFILE_LABELS[type],
		unit: "milliseconds",
		startValue,
		endValue,
		events,
	};
}

export function formatSpeedScopeProfile(session: MeasurementSession): SpeedScopeFile {
	const frames: SpeedScopeFrame[] = [];
	const profiles: SpeedScopeProfile[] = [];
	const grouped = groupSamplesByType(session.samples);

	for (const [type, samples] of grouped) {
		profiles.push(buildProfileForMetric(type, samples, frames));
	}

	return {
		$schema: SCHEMA_URL,
		shared: { frames },
		profiles,
		name: `Lanterna - ${session.device.name}`,
		activeProfileIndex: 0,
		exporter: "lanterna@0.0.1",
	};
}

export async function exportSpeedScope(
	session: MeasurementSession,
	filePath: string,
): Promise<void> {
	const profile = formatSpeedScopeProfile(session);
	await Bun.write(filePath, JSON.stringify(profile, null, 2));
}
