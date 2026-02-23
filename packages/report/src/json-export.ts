import type {
	BridgeStatsData,
	LayoutStatsData,
	MeasurementSession,
	NavigationTimelineData,
	NetworkRequestData,
	ScoreResult,
} from "@lanternajs/core";

export interface JsonReport {
	version: string;
	timestamp: string;
	device: {
		id: string;
		name: string;
		platform: string;
		type: string;
	};
	duration: number;
	score: {
		overall: number;
		category: string;
		metrics: Array<{
			type: string;
			value: number;
			score: number;
			category: string;
		}>;
	};
	navigation?: NavigationTimelineData;
	network?: NetworkRequestData[];
	bridge?: BridgeStatsData;
	layout?: LayoutStatsData;
}

export function formatJsonReport(session: MeasurementSession, score: ScoreResult): JsonReport {
	const report: JsonReport = {
		version: "0.0.1",
		timestamp: new Date(session.startedAt).toISOString(),
		device: {
			id: session.device.id,
			name: session.device.name,
			platform: session.device.platform,
			type: session.device.type,
		},
		duration: session.duration,
		score: {
			overall: score.overall,
			category: score.category,
			metrics: score.perMetric.map((m) => ({
				type: m.type,
				value: m.value,
				score: m.score,
				category: m.category,
			})),
		},
	};

	if (session.navigationTimeline) {
		report.navigation = session.navigationTimeline;
	}
	if (session.networkRequests && session.networkRequests.length > 0) {
		report.network = session.networkRequests;
	}
	if (session.bridgeStats) {
		report.bridge = session.bridgeStats;
	}
	if (session.layoutStats) {
		report.layout = session.layoutStats;
	}

	return report;
}

export async function exportJson(
	session: MeasurementSession,
	score: ScoreResult,
	filePath: string,
): Promise<void> {
	const report = formatJsonReport(session, score);
	await Bun.write(filePath, JSON.stringify(report, null, 2));
}
