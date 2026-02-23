import { type MetricSample, MetricType } from "@lanternajs/core";

/**
 * Parse output from `adb shell top -H -d 1 -p <pid>`.
 * Sums all thread CPU percentages to produce a single CPU sample.
 * Never throws — returns empty array on malformed input.
 */
export function parseTopOutput(output: string, timestamp: number): MetricSample[] {
	if (!output || typeof output !== "string") {
		return [];
	}

	const lines = output.split("\n");
	let totalCpu = 0;
	let foundAny = false;

	for (const line of lines) {
		// Match data lines: PID TID USER PR NI VIRT RES SHR S %CPU %MEM TIME+ THREAD
		// The CPU column contains a value like "25.0" and is preceded by a single-char state (S/R/D/Z/T)
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("Tasks:") || trimmed.startsWith("PID")) {
			continue;
		}

		// Try to extract CPU percentage from process lines
		// Format: PID TID USER PR NI VIRT RES SHR S[%CPU] %MEM TIME+ THREAD
		const match = trimmed.match(
			/^\s*\d+\s+\d+\s+\S+\s+\d+\s+[-\d]+\s+\S+\s+\S+\s+\S+\s+[SRDZT]\s+([\d.]+)/,
		);
		if (match) {
			const cpu = Number.parseFloat(match[1]);
			if (!Number.isNaN(cpu)) {
				totalCpu += cpu;
				foundAny = true;
			}
		}
	}

	if (!foundAny) {
		return [];
	}

	return [
		{
			type: MetricType.CPU,
			value: totalCpu,
			timestamp,
			unit: "%",
		},
	];
}
