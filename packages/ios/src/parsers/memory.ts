import { type MetricSample, MetricType } from "@lanterna/core";

/**
 * Parse host-side `top -l 1 -pid <pid> -stats pid,rsize` output for memory usage.
 *
 * Expected format:
 * ```
 * PID    RSIZE
 * 12345  250M+
 * ```
 *
 * Handles M (megabytes) and G (gigabytes) suffixes, strips trailing `+` or `-`.
 * Never throws — returns an empty array on malformed or empty input.
 */
export function parseTopMemory(output: string, timestamp: number): MetricSample[] {
	if (!output) {
		return [];
	}

	try {
		const lines = output.trim().split("\n");

		// Find the data line (skip header lines)
		for (const line of lines) {
			const trimmed = line.trim();

			// Skip empty lines and header lines
			if (!trimmed || /^PID/i.test(trimmed)) {
				continue;
			}

			// Match a line with PID and memory value like "12345  250M+" or "12345  1G-"
			const match = trimmed.match(/^\d+\s+(\d+(?:\.\d+)?)\s*([MG])[+-]?\s*$/i);
			if (!match) {
				continue;
			}

			const value = Number.parseFloat(match[1]);
			const suffix = match[2].toUpperCase();

			let memoryMb: number;
			if (suffix === "G") {
				memoryMb = value * 1024;
			} else {
				memoryMb = value;
			}

			return [
				{
					type: MetricType.MEMORY,
					value: Math.round(memoryMb * 100) / 100,
					timestamp,
					unit: "MB",
				},
			];
		}

		return [];
	} catch {
		return [];
	}
}
