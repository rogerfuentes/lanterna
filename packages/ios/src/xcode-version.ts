import type { CommandRunner } from "@lanternajs/core";

/**
 * Get the installed Xcode version by running `xcodebuild -version`.
 *
 * Parses "Xcode X.Y" from the first line of output.
 * Returns the version string (e.g. "16.2") or null if Xcode is not installed.
 */
export async function getXcodeVersion(runner: CommandRunner): Promise<string | null> {
	try {
		const result = await runner("xcodebuild", ["-version"]);

		if (result.exitCode !== 0 || !result.stdout.trim()) {
			return null;
		}

		const firstLine = result.stdout.trim().split("\n")[0];
		const match = firstLine.match(/^Xcode\s+(\S+)/i);

		if (!match) {
			return null;
		}

		return match[1];
	} catch {
		return null;
	}
}
