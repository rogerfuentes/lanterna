import { type MetricSample, MetricType } from "@lanternajs/core";

/**
 * Parse the JSON output from `xcrun devicectl device info processes` for memory usage.
 *
 * Looks for a process matching the given PID and extracts its `memoryUse`
 * (reported in bytes by devicectl).
 *
 * Never throws — returns an empty array on malformed or missing data.
 */
export function parseDevicectlMemory(json: string, pid: number, timestamp: number): MetricSample[] {
	if (!json) return [];

	try {
		const parsed = JSON.parse(json);
		const processes = parsed?.result?.runningProcesses;
		if (!Array.isArray(processes)) return [];

		for (const proc of processes) {
			if (proc.processIdentifier === pid) {
				const memoryBytes = proc.memoryUse;
				if (typeof memoryBytes !== "number" || memoryBytes <= 0) return [];

				const memoryMb = memoryBytes / (1024 * 1024);
				return [
					{
						type: MetricType.MEMORY,
						value: Math.round(memoryMb * 100) / 100,
						timestamp,
						unit: "MB",
					},
				];
			}
		}

		return [];
	} catch {
		return [];
	}
}
