import { type MetricSample, MetricType } from "@lanterna/core";

/**
 * Parse output from `adb shell dumpsys gfxinfo <package>`.
 * Extracts janky frame percentage to calculate effective UI FPS and frame drop rate.
 * Never throws — returns empty array on malformed input.
 */
export function parseGfxinfoOutput(output: string, timestamp: number): MetricSample[] {
	if (!output || typeof output !== "string") {
		return [];
	}

	const lines = output.split("\n");
	let totalFrames: number | null = null;
	let jankyFrames: number | null = null;
	let jankyPercent: number | null = null;

	for (const line of lines) {
		const totalMatch = line.match(/Total frames rendered:\s*([\d]+)/);
		if (totalMatch) {
			totalFrames = Number.parseInt(totalMatch[1], 10);
		}

		// "Janky frames: 75 (5.00%)"
		const jankyMatch = line.match(/Janky frames:\s*([\d]+)\s*\(([\d.]+)%\)/);
		if (jankyMatch) {
			jankyFrames = Number.parseInt(jankyMatch[1], 10);
			jankyPercent = Number.parseFloat(jankyMatch[2]);
		}
	}

	if (totalFrames === null || jankyFrames === null || jankyPercent === null) {
		return [];
	}

	if (Number.isNaN(totalFrames) || Number.isNaN(jankyPercent)) {
		return [];
	}

	// Calculate effective FPS: 60 * (1 - jankyPercent/100)
	const actualFps = 60 * (1 - jankyPercent / 100);

	return [
		{
			type: MetricType.UI_FPS,
			value: Math.round(actualFps * 100) / 100,
			timestamp,
			unit: "fps",
		},
		{
			type: MetricType.FRAME_DROPS,
			value: jankyPercent,
			timestamp,
			unit: "%",
		},
	];
}
