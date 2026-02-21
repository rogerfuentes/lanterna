import type { CommandRunner } from "@lanterna/core";

export interface MaestroStep {
	name: string;
	lineNumber: number;
}

export interface MaestroFlow {
	name: string;
	appId: string;
	steps: MaestroStep[];
}

const KNOWN_COMMANDS = new Set([
	"tapOn",
	"assertVisible",
	"inputText",
	"scrollUntilVisible",
	"back",
	"swipe",
	"waitForAnimationToEnd",
	"launchApp",
	"clearState",
	"runFlow",
	"openLink",
]);

/**
 * Parse a Maestro YAML flow file into a structured MaestroFlow.
 * Extracts appId and recognized Maestro command steps.
 */
export function parseMaestroFlow(yaml: string): MaestroFlow {
	const lines = yaml.split("\n");
	let appId = "";
	const steps: MaestroStep[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const lineNumber = i + 1;

		// Extract appId from lines like `appId: "com.example.app"` or `appId: com.example.app`
		const appIdMatch = line.match(/^\s*appId:\s*"?([^"\s]+)"?\s*$/);
		if (appIdMatch) {
			appId = appIdMatch[1];
			continue;
		}

		// Extract steps: lines starting with `- ` that contain known Maestro commands
		const stepMatch = line.match(/^\s*-\s+(\w+)(?::\s*(.*))?$/);
		if (!stepMatch) continue;

		const command = stepMatch[1];
		if (!KNOWN_COMMANDS.has(command)) continue;

		const rawArg = stepMatch[2]?.trim() ?? "";
		// Strip surrounding quotes from the argument
		const arg = rawArg.replace(/^"(.*)"$/, "$1");
		const name = arg ? `${command} "${arg}"` : command;

		steps.push({ name, lineNumber });
	}

	// Derive flow name from appId or default
	const name = appId ? `Flow: ${appId}` : "Unnamed flow";

	return { name, appId, steps };
}

/**
 * Run a Maestro flow file using the `maestro test` CLI command.
 */
export async function runMaestro(
	runner: CommandRunner,
	flowPath: string,
): Promise<{ exitCode: number; output: string }> {
	const result = await runner("maestro", ["test", flowPath]);
	return {
		exitCode: result.exitCode,
		output: result.stdout,
	};
}
