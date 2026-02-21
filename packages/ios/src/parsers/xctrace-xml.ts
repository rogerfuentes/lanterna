import { type MetricSample, MetricType } from "@lanterna/core";

/**
 * Parse the XML output from `xcrun xctrace export` (Time Profiler template).
 *
 * Extracts `<weight>` values (in nanoseconds) from each `<row>`, sums them
 * to compute total CPU time, then converts to a CPU percentage relative to
 * the provided wall-clock duration.
 *
 * Never throws — returns an empty array on malformed or empty input.
 */
export function parseXctraceXml(xml: string, duration: number): MetricSample[] {
	if (!xml || duration <= 0) {
		return [];
	}

	try {
		const weightRegex = /<weight[^>]*>(\d+)<\/weight>/g;
		let totalWeightNs = 0;
		let match = weightRegex.exec(xml);

		while (match !== null) {
			totalWeightNs += Number(match[1]);
			match = weightRegex.exec(xml);
		}

		if (totalWeightNs === 0) {
			return [];
		}

		const cpuPercent = (totalWeightNs / (duration * 1e9)) * 100;

		return [
			{
				type: MetricType.CPU,
				value: Math.round(cpuPercent * 100) / 100,
				timestamp: Date.now(),
				unit: "%",
			},
		];
	} catch {
		return [];
	}
}
