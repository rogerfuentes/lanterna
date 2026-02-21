#!/usr/bin/env bun
import { type MeasureArgs, type MonitorArgs, parseArgs, type TestArgs } from "./args";
import { runMeasure } from "./commands/measure";
import { runMonitor } from "./commands/monitor";
import { runTest } from "./commands/test";

const argv = process.argv.slice(2);
const parsed = parseArgs(argv);

if (parsed) {
	let exitCode: number;

	if (parsed.command === "test") {
		exitCode = await runTest(parsed.args as TestArgs);
	} else if (parsed.command === "monitor") {
		exitCode = await runMonitor(parsed.args as MonitorArgs);
	} else {
		exitCode = await runMeasure(parsed.args as MeasureArgs);
	}

	process.exit(exitCode);
}
