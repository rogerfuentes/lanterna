import { collectAndroidMetrics } from "@lanterna/android";
import {
	type CommandRunner,
	calculateScore,
	compareScores,
	type Device,
	defaultRunner,
	detectDevices,
	ScoreCategory,
} from "@lanterna/core";
import { collectIosMetrics } from "@lanterna/ios";
import { exportJson, renderComparison, renderReport } from "@lanterna/report";
import type { MeasureArgs } from "../args";
import { Spinner } from "../spinner";

function selectDevice(devices: Device[], args: MeasureArgs): Device {
	if (args.device) {
		const match = devices.find((d) => d.id === args.device);
		if (!match) {
			throw new Error(
				`Device "${args.device}" not found. Available devices:\n${devices.map((d) => `  ${d.id} (${d.name}, ${d.platform})`).join("\n")}`,
			);
		}
		return match;
	}

	if (args.platform) {
		const platformDevices = devices.filter((d) => d.platform === args.platform);
		if (platformDevices.length === 0) {
			throw new Error(
				`No ${args.platform} devices found. Run "lanterna devices" to see available devices.`,
			);
		}
		return platformDevices[0];
	}

	// Auto-select: first available device (physical devices sorted first by detectDevices)
	return devices[0];
}

export async function runMeasure(
	args: MeasureArgs,
	runner: CommandRunner = defaultRunner,
): Promise<number> {
	const spinner = new Spinner();

	try {
		// 1. Detect devices
		spinner.start("Detecting devices...");
		const devices = await detectDevices(runner);

		if (devices.length === 0) {
			spinner.fail("No devices found");
			console.error(
				"\nMake sure you have a device connected or simulator/emulator running.\n" +
					"  iOS: Open Simulator or connect a physical device\n" +
					"  Android: Start an emulator or connect via ADB",
			);
			return 1;
		}

		const device = selectDevice(devices, args);
		spinner.stop(`Device: ${device.name} (${device.platform}, ${device.type})`);

		// 2. Collect metrics
		spinner.start(`Collecting metrics for ${args.duration}s on ${device.name}...`);

		const session =
			device.platform === "android"
				? await collectAndroidMetrics(runner, device, args.package, args.duration)
				: await collectIosMetrics(runner, device, args.package, args.duration);

		spinner.stop(`Collection complete (${session.samples.length} samples)`);

		// 3. Score
		const score = calculateScore(session);

		// 4. Report
		const report = renderReport(session, score);
		console.log(report);

		// 5. Baseline comparison if requested
		if (args.baseline) {
			const baselineFile = Bun.file(args.baseline);
			if (!(await baselineFile.exists())) {
				console.error(`\nBaseline file not found: ${args.baseline}`);
				return 1;
			}
			const baselineData = JSON.parse(await baselineFile.text());
			const baselineScore = baselineData.score;
			const comparison = compareScores(
				{
					overall: baselineScore.overall,
					category: baselineScore.category,
					perMetric: baselineScore.metrics.map(
						(m: { type: string; value: number; score: number; category: string }) => ({
							type: m.type,
							value: m.value,
							score: m.score,
							category: m.category,
							weight: 0,
						}),
					),
				},
				score,
			);
			console.log(
				renderComparison(
					{
						overall: baselineScore.overall,
						category: baselineScore.category,
						perMetric: baselineScore.metrics.map(
							(m: { type: string; value: number; score: number; category: string }) => ({
								type: m.type,
								value: m.value,
								score: m.score,
								category: m.category,
								weight: 0,
							}),
						),
					},
					score,
					comparison,
				),
			);

			if (comparison.hasRegression) {
				console.error(`\n⚠ ${comparison.regressionCount} regression(s) detected`);
				return 1;
			}
		}

		// 6. Export JSON if requested
		if (args.output) {
			await exportJson(session, score, args.output);
			console.log(`\nJSON report saved to ${args.output}`);
		}

		// 7. Exit code
		return score.category === ScoreCategory.POOR ? 1 : 0;
	} catch (error) {
		spinner.fail("Measurement failed");
		console.error(`\n${error instanceof Error ? error.message : String(error)}`);
		return 1;
	}
}
