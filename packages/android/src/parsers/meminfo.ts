import { type MetricSample, MetricType } from "@lanternajs/core";

/**
 * Parse output from `adb shell dumpsys meminfo <package>`.
 * Extracts TOTAL Pss Total and converts KB to MB.
 * Never throws — returns empty array on malformed input.
 */
export function parseMeminfoOutput(output: string, timestamp: number): MetricSample[] {
	if (!output || typeof output !== "string") {
		return [];
	}

	const lines = output.split("\n");

	for (const line of lines) {
		// Look for the TOTAL line — format: "  TOTAL   120000   100000  ..."
		const match = line.match(/^\s*TOTAL\s+([\d]+)/);
		if (match) {
			const pssKb = Number.parseInt(match[1], 10);
			if (Number.isNaN(pssKb)) {
				return [];
			}

			const pssMb = pssKb / 1024;

			return [
				{
					type: MetricType.MEMORY,
					value: Math.round(pssMb * 100) / 100,
					timestamp,
					unit: "MB",
				},
			];
		}
	}

	return [];
}
