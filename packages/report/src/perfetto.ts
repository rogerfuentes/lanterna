import type { MeasurementSession, MetricSample } from "@lanternajs/core";
import { MetricType } from "@lanternajs/core";

export interface PerfettoTraceEvent {
	name: string;
	cat: string;
	ph: string;
	ts: number;
	pid: number;
	tid: number;
	args?: Record<string, unknown>;
}

export interface PerfettoTrace {
	traceEvents: PerfettoTraceEvent[];
	displayTimeUnit: "ms";
	metadata: {
		source: string;
		device: string;
		platform: string;
	};
}

const THREAD_MAP: Record<MetricType, number> = {
	[MetricType.UI_FPS]: 1,
	[MetricType.FRAME_DROPS]: 1,
	[MetricType.JS_FPS]: 2,
	[MetricType.CPU]: 3,
	[MetricType.MEMORY]: 3,
	[MetricType.TTI]: 4,
};

const CATEGORY_MAP: Record<MetricType, string> = {
	[MetricType.UI_FPS]: "UI Thread",
	[MetricType.FRAME_DROPS]: "UI Thread",
	[MetricType.JS_FPS]: "JS Thread",
	[MetricType.CPU]: "System",
	[MetricType.MEMORY]: "System",
	[MetricType.TTI]: "Lifecycle",
};

const LABEL_MAP: Record<MetricType, string> = {
	[MetricType.UI_FPS]: "UI FPS",
	[MetricType.JS_FPS]: "JS FPS",
	[MetricType.CPU]: "CPU Usage",
	[MetricType.MEMORY]: "Memory",
	[MetricType.FRAME_DROPS]: "Frame Drops",
	[MetricType.TTI]: "TTI",
};

function phaseForMetric(type: MetricType): string {
	if (type === MetricType.FRAME_DROPS) return "i";
	return "C";
}

function sampleToEvent(sample: MetricSample): PerfettoTraceEvent {
	const phase = phaseForMetric(sample.type);
	const event: PerfettoTraceEvent = {
		name: LABEL_MAP[sample.type],
		cat: CATEGORY_MAP[sample.type],
		ph: phase,
		ts: sample.timestamp * 1000,
		pid: 1,
		tid: THREAD_MAP[sample.type],
		args: { value: sample.value, unit: sample.unit },
	};

	if (phase === "i") {
		event.args = { ...event.args, s: "t" };
	}

	return event;
}

export function formatPerfettoTrace(session: MeasurementSession): PerfettoTrace {
	const traceEvents = session.samples.map(sampleToEvent);

	return {
		traceEvents,
		displayTimeUnit: "ms",
		metadata: {
			source: "lanterna",
			device: session.device.name,
			platform: session.platform,
		},
	};
}

export async function exportPerfetto(session: MeasurementSession, filePath: string): Promise<void> {
	const trace = formatPerfettoTrace(session);
	await Bun.write(filePath, JSON.stringify(trace, null, 2));
}
