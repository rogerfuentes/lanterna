import type { CommandRunner, Device, MeasurementSession } from "@lanternajs/core";
import { parseTopMemory } from "./parsers/memory";
import { parseXctraceXml } from "./parsers/xctrace-xml";
import { findIosPid } from "./process";

/**
 * Collect iOS performance metrics for a running app.
 *
 * Pipeline:
 * 1. Find the app PID via pgrep
 * 2. Record a Time Profiler trace with `xcrun xctrace`
 * 3. Export the trace to XML
 * 4. Parse CPU metrics from the XML
 * 5. Collect memory metrics via `top`
 * 6. Clean up temp files
 * 7. Return assembled MeasurementSession
 */
export async function collectIosMetrics(
	runner: CommandRunner,
	device: Device,
	bundleId: string,
	duration: number,
): Promise<MeasurementSession> {
	const startedAt = Date.now();

	// 1. Find PID
	const pid = await findIosPid(runner, device.id, bundleId);
	if (pid === null) {
		throw new Error(
			`Could not find running process for "${bundleId}" on device "${device.name}" (${device.id}). ` +
				"Make sure the app is running before starting the profiler.",
		);
	}

	// 2. Create temp dir path
	const tempDir = `/tmp/lanterna-trace-${startedAt}`;
	await runner("mkdir", ["-p", tempDir]);

	const tracePath = `${tempDir}/trace.trace`;
	const xmlPath = `${tempDir}/trace.xml`;

	try {
		// 3. Record trace
		const xctraceArgs = [
			"xctrace",
			"record",
			"--template",
			"Time Profiler",
			"--device",
			device.id,
			"--attach",
			String(pid),
			"--time-limit",
			`${duration}s`,
			"--output",
			tracePath,
		];
		const recordResult = await runner("xcrun", xctraceArgs);

		if (recordResult.exitCode !== 0) {
			throw new Error(
				`xctrace record failed (exit code ${recordResult.exitCode}): ${recordResult.stderr}`,
			);
		}

		// 4. Export trace to XML via xpath
		const exportResult = await runner("xcrun", [
			"xctrace",
			"export",
			"--input",
			tracePath,
			"--xpath",
			'/trace-toc/run[@number="1"]/data/table[@schema="time-profile"]',
			"--output",
			xmlPath,
		]);

		if (exportResult.exitCode !== 0) {
			throw new Error(
				`xctrace export failed (exit code ${exportResult.exitCode}): ${exportResult.stderr}`,
			);
		}

		// 5. Read and parse XML
		const xml = await Bun.file(xmlPath).text();
		const cpuSamples = parseXctraceXml(xml, duration);

		// 6. Get memory via top
		const topResult = await runner("top", ["-l", "1", "-pid", String(pid), "-stats", "pid,rsize"]);
		const memorySamples = parseTopMemory(topResult.stdout, Date.now());

		// 7. Assemble session
		return {
			device,
			platform: "ios",
			samples: [...cpuSamples, ...memorySamples],
			duration,
			startedAt,
		};
	} finally {
		// 8. Cleanup
		await runner("rm", ["-rf", tempDir]);
	}
}
