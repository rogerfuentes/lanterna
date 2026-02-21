/**
 * Expo config plugin — iOS modifications.
 * Ensures the podspec is linked in the Podfile.
 */
export interface IosPluginConfig {
	/** Pod name to add. */
	podName: string;
	/** Path to the podspec relative to the project root. */
	podPath: string;
}

export const IOS_DEFAULTS: IosPluginConfig = {
	podName: "lanterna-react-native",
	podPath: "../node_modules/lanterna-react-native",
};

/**
 * Generate the modified Podfile content with Lanterna pod added.
 * Returns the original content unchanged if already configured.
 */
export function applyIosPlugin(
	podfileContent: string,
	config: IosPluginConfig = IOS_DEFAULTS,
): string {
	if (podfileContent.includes(config.podName)) {
		return podfileContent;
	}

	// Insert pod line after use_react_native or target block
	const useReactNativeIndex = podfileContent.indexOf("use_react_native!");
	if (useReactNativeIndex >= 0) {
		const lineEnd = podfileContent.indexOf("\n", useReactNativeIndex);
		const podLine = `  pod '${config.podName}', :path => '${config.podPath}'`;
		return `${podfileContent.slice(0, lineEnd + 1)}${podLine}\n${podfileContent.slice(lineEnd + 1)}`;
	}

	return podfileContent;
}
