/**
 * Expo config plugin — Android modifications.
 * Adds LanternaPackage to MainApplication's package list.
 */
export interface AndroidPluginConfig {
	/** Package import statement to add. */
	importLine: string;
	/** Package instantiation to add to getPackages(). */
	packageLine: string;
}

export const ANDROID_DEFAULTS: AndroidPluginConfig = {
	importLine: "import com.lanterna.LanternaPackage",
	packageLine: "packages.add(LanternaPackage())",
};

/**
 * Generate the modified MainApplication.kt content with Lanterna package added.
 * Returns the original content unchanged if already configured.
 */
export function applyAndroidPlugin(
	mainApplicationContent: string,
	config: AndroidPluginConfig = ANDROID_DEFAULTS,
): string {
	if (mainApplicationContent.includes("LanternaPackage")) {
		return mainApplicationContent;
	}

	let result = mainApplicationContent;

	// Add import if not present
	if (!result.includes(config.importLine)) {
		const lastImportIndex = result.lastIndexOf("import ");
		if (lastImportIndex >= 0) {
			const lineEnd = result.indexOf("\n", lastImportIndex);
			result = `${result.slice(0, lineEnd + 1)}${config.importLine}\n${result.slice(lineEnd + 1)}`;
		}
	}

	// Add package to getPackages() if not present
	if (!result.includes(config.packageLine)) {
		const getPackagesIndex = result.indexOf("getPackages()");
		if (getPackagesIndex >= 0) {
			const returnIndex = result.indexOf("return ", getPackagesIndex);
			if (returnIndex >= 0) {
				const lineEnd = result.indexOf("\n", returnIndex);
				result = `${result.slice(0, lineEnd + 1)}            ${config.packageLine}\n${result.slice(lineEnd + 1)}`;
			}
		}
	}

	return result;
}
