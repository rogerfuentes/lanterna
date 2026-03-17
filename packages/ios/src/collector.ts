import type { CommandRunner, Device, MeasurementSession } from "@lanternajs/core";
import { parseDevicectlMemory } from "./parsers/devicectl-memory";
import { parseTopMemory } from "./parsers/memory";
import { parseXctraceXml } from "./parsers/xctrace-xml";
import { findIosPid } from "./process";

const PID_POLL_INTERVAL_MS = 500;
const PID_MAX_ATTEMPTS = 10;

/**
 * Poll for a PID with retries. Gives the app up to 5 seconds to appear
 * in the process list after launch.
 */
async function waitForPid(findPid: () => Promise<number | null>): Promise<number | null> {
	for (let attempt = 0; attempt < PID_MAX_ATTEMPTS; attempt++) {
		const pid = await findPid();
		if (pid !== null) return pid;
		if (attempt < PID_MAX_ATTEMPTS - 1) {
			await new Promise((resolve) => setTimeout(resolve, PID_POLL_INTERVAL_MS));
		}
	}
	return null;
}

/**
 * Collect iOS performance metrics for a running app.
 *
 * Pipeline:
 * 1. Find the app PID (simctl for simulators, devicectl for physical devices)
 * 2. Record a Time Profiler trace with `xcrun xctrace`
 * 3. Export the trace to XML
 * 4. Parse CPU metrics from the XML
 * 5. Collect memory metrics (top for simulators, devicectl for physical devices)
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
	const isPhysical = device.type === "physical";

	// 1. Find PID (retries up to 5s for apps that are still launching)
	const pid = await waitForPid(() => findIosPid(runner, device.id, bundleId, device.type));
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

		// 6. Get memory — use devicectl for physical devices, top for simulators
		const memorySamples = isPhysical
			? await collectPhysicalDeviceMemory(runner, device.id, pid, Date.now())
			: await collectSimulatorMemory(runner, pid, Date.now());

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

async function collectSimulatorMemory(runner: CommandRunner, pid: number, timestamp: number) {
	const topResult = await runner("top", ["-l", "1", "-pid", String(pid), "-stats", "pid,rsize"]);
	return parseTopMemory(topResult.stdout, timestamp);
}

async function collectPhysicalDeviceMemory(
	runner: CommandRunner,
	deviceId: string,
	pid: number,
	timestamp: number,
) {
	const result = await runner("xcrun", [
		"devicectl",
		"device",
		"info",
		"processes",
		"--device",
		deviceId,
		"--json-output",
		"-",
	]);

	if (result.exitCode !== 0 || !result.stdout) {
		return [];
	}

	return parseDevicectlMemory(result.stdout, pid, timestamp);
}
