export interface MeasureArgs {
	package: string;
	duration: number;
	platform?: "ios" | "android";
	device?: string;
	output?: string;
	baseline?: string;
}

export interface TestArgs extends MeasureArgs {
	maestro: string;
}

export interface MonitorArgs {
	port: number;
}

export interface ParsedCommand {
	command: "measure" | "test" | "monitor";
	args: MeasureArgs | TestArgs | MonitorArgs;
}

const HELP_TEXT = `
lanterna — Performance profiler for React Native apps

Usage:
  lanterna measure <package> [options]
  lanterna test --maestro <flow.yaml> [options]
  lanterna monitor [options]

Commands:
  measure    Collect performance metrics for a running app
  test       Run a Maestro E2E flow and collect performance metrics
  monitor    Start live monitoring dashboard (WebSocket server)

Options (measure):
  --duration <seconds>    Measurement duration (default: 10)
  --platform <ios|android> Force platform (auto-detect if omitted)
  --device <id>           Target device ID (auto-select if omitted)
  --output <path>         Export JSON report to file
  --baseline <path>       Compare against a previous JSON report
  --help                  Show this help message

Options (test):
  --maestro <flow.yaml>   Path to Maestro flow YAML (required)
  --duration <seconds>    Measurement duration (default: 10)
  --platform <ios|android> Force platform (auto-detect if omitted)
  --device <id>           Target device ID (auto-select if omitted)
  --output <path>         Export JSON report to file

Options (monitor):
  --port <number>         WebSocket server port (default: 8347)

Examples:
  lanterna measure com.example.app
  lanterna measure com.example.app --duration 15
  lanterna measure com.example.app --platform ios --output report.json
  lanterna test --maestro login-flow.yaml
  lanterna test --maestro login-flow.yaml --duration 30 --output report.json
  lanterna monitor
  lanterna monitor --port 9000
`.trim();

function parseDuration(value: string): number {
	const stripped = value.replace(/s$/, "");
	const num = Number(stripped);
	if (Number.isNaN(num) || num <= 0) {
		throw new Error(`Invalid duration: "${value}". Must be a positive number (e.g., 10 or 10s).`);
	}
	return num;
}

function parseMeasureCommand(args: string[]): MeasureArgs {
	const result: MeasureArgs = {
		package: "",
		duration: 10,
	};

	let i = 0;
	while (i < args.length) {
		const arg = args[i];

		if (arg === "--duration" || arg === "-d") {
			i++;
			if (i >= args.length) throw new Error("--duration requires a value");
			result.duration = parseDuration(args[i]);
		} else if (arg === "--platform" || arg === "-p") {
			i++;
			if (i >= args.length) throw new Error("--platform requires a value");
			const val = args[i];
			if (val !== "ios" && val !== "android") {
				throw new Error(`Invalid platform: "${val}". Must be "ios" or "android".`);
			}
			result.platform = val;
		} else if (arg === "--device") {
			i++;
			if (i >= args.length) throw new Error("--device requires a value");
			result.device = args[i];
		} else if (arg === "--output" || arg === "-o") {
			i++;
			if (i >= args.length) throw new Error("--output requires a value");
			result.output = args[i];
		} else if (arg === "--baseline" || arg === "-b") {
			i++;
			if (i >= args.length) throw new Error("--baseline requires a value");
			result.baseline = args[i];
		} else if (!arg.startsWith("-") && !result.package) {
			result.package = arg;
		} else {
			throw new Error(`Unknown option: "${arg}"`);
		}
		i++;
	}

	if (!result.package) {
		throw new Error(
			"Package name is required. Usage: lanterna measure <package>\n  e.g., lanterna measure com.example.app",
		);
	}

	return result;
}

function parseTestCommand(args: string[]): TestArgs {
	const result: TestArgs = {
		package: "",
		duration: 10,
		maestro: "",
	};

	let i = 0;
	while (i < args.length) {
		const arg = args[i];

		if (arg === "--maestro" || arg === "-m") {
			i++;
			if (i >= args.length) throw new Error("--maestro requires a value");
			result.maestro = args[i];
		} else if (arg === "--duration" || arg === "-d") {
			i++;
			if (i >= args.length) throw new Error("--duration requires a value");
			result.duration = parseDuration(args[i]);
		} else if (arg === "--platform" || arg === "-p") {
			i++;
			if (i >= args.length) throw new Error("--platform requires a value");
			const val = args[i];
			if (val !== "ios" && val !== "android") {
				throw new Error(`Invalid platform: "${val}". Must be "ios" or "android".`);
			}
			result.platform = val;
		} else if (arg === "--device") {
			i++;
			if (i >= args.length) throw new Error("--device requires a value");
			result.device = args[i];
		} else if (arg === "--output" || arg === "-o") {
			i++;
			if (i >= args.length) throw new Error("--output requires a value");
			result.output = args[i];
		} else if (!arg.startsWith("-") && !result.package) {
			result.package = arg;
		} else {
			throw new Error(`Unknown option: "${arg}"`);
		}
		i++;
	}

	if (!result.maestro) {
		throw new Error(
			"--maestro flag is required for test command.\n  Usage: lanterna test --maestro <flow.yaml>",
		);
	}

	// package can be auto-populated from the flow's appId, so it's not required here

	return result;
}

function parseMonitorCommand(args: string[]): MonitorArgs {
	const result: MonitorArgs = { port: 8347 };

	let i = 0;
	while (i < args.length) {
		const arg = args[i];
		if (arg === "--port") {
			i++;
			if (i >= args.length) throw new Error("--port requires a value");
			const port = Number(args[i]);
			if (Number.isNaN(port) || port <= 0 || port > 65535) {
				throw new Error(`Invalid port: "${args[i]}". Must be 1-65535.`);
			}
			result.port = port;
		} else {
			throw new Error(`Unknown option: "${arg}"`);
		}
		i++;
	}

	return result;
}

export function parseArgs(argv: string[]): ParsedCommand | null {
	const args = argv.slice(0);

	if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
		console.log(HELP_TEXT);
		return null;
	}

	const command = args.shift() as string;

	if (command === "measure") {
		return { command: "measure", args: parseMeasureCommand(args) };
	}

	if (command === "test") {
		return { command: "test", args: parseTestCommand(args) };
	}

	if (command === "monitor") {
		return { command: "monitor", args: parseMonitorCommand(args) };
	}

	console.log(`Unknown command: "${command}"\n`);
	console.log(HELP_TEXT);
	return null;
}

export { HELP_TEXT };
