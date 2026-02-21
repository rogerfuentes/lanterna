import { collectAndroidMetrics } from "@lanterna/android";
import {
	type CommandRunner,
	calculateScore,
	type Device,
	defaultRunner,
	detectDevices,
	ScoreCategory,
} from "@lanterna/core";
import { collectIosMetrics } from "@lanterna/ios";
import { exportJson, renderReport } from "@lanterna/report";
import type { TestArgs } from "../args";
import { parseMaestroFlow, runMaestro } from "../maestro";
import { Spinner } from "../spinner";

function selectDevice(devices: Device[], args: TestArgs): Device {
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

	return devices[0];
}

export async function runTest(
	args: TestArgs,
	runner: CommandRunner = defaultRunner,
): Promise<number> {
	const spinner = new Spinner();

	try {
		// 1. Read and parse the Maestro flow YAML
		spinner.start(`Reading Maestro flow: ${args.maestro}...`);
		const flowFile = Bun.file(args.maestro);
		if (!(await flowFile.exists())) {
			spinner.fail(`Maestro flow file not found: ${args.maestro}`);
			return 1;
		}
		const yaml = await flowFile.text();
		const flow = parseMaestroFlow(yaml);
		spinner.stop(
			`Maestro flow: ${flow.name} (${flow.steps.length} step${flow.steps.length !== 1 ? "s" : ""})`,
		);

		// 2. Extract appId — use as package name unless --package was provided
		const packageName = args.package || flow.appId;
		if (!packageName) {
			spinner.fail("No app ID found. Provide a package name or include appId in the Maestro flow.");
			return 1;
		}

		// 3. Detect devices
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

		// 4. Start metric collection and Maestro in parallel
		spinner.start(`Running Maestro flow and collecting metrics on ${device.name}...`);

		const collectMetrics =
			device.platform === "android"
				? collectAndroidMetrics(runner, device, packageName, args.duration)
				: collectIosMetrics(runner, device, packageName, args.duration);

		const maestroResult = runMaestro(runner, args.maestro);

		const [session, maestro] = await Promise.all([collectMetrics, maestroResult]);

		spinner.stop(`Collection complete (${session.samples.length} samples)`);

		// 5. Score the session
		const score = calculateScore(session);

		// 6. Render report
		const report = renderReport(session, score);
		console.log(report);

		// 7. Show maestro pass/fail status
		const maestroPassed = maestro.exitCode === 0;
		if (maestroPassed) {
			console.log("\nMaestro: PASSED");
		} else {
			console.error("\nMaestro: FAILED");
			if (maestro.output) {
				console.error(maestro.output);
			}
		}

		// 8. Export JSON if --output specified
		if (args.output) {
			await exportJson(session, score, args.output);
			console.log(`\nJSON report saved to ${args.output}`);
		}

		// 9. Return exit code (0 if both maestro passed and score is not poor)
		if (!maestroPassed) return 1;
		return score.category === ScoreCategory.POOR ? 1 : 0;
	} catch (error) {
		spinner.fail("Test failed");
		console.error(`\n${error instanceof Error ? error.message : String(error)}`);
		return 1;
	}
}
