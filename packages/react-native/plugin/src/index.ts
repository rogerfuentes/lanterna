/**
 * Expo config plugin for @lanternajs/react-native.
 *
 * Automatically configures native Android and iOS projects for Expo managed workflow.
 * Usage in app.json: ["@lanternajs/react-native/plugin"]
 */
export {
	ANDROID_DEFAULTS,
	type AndroidPluginConfig,
	applyAndroidPlugin,
} from "./withLanternaAndroid";
export { applyIosPlugin, IOS_DEFAULTS, type IosPluginConfig } from "./withLanternaIos";
