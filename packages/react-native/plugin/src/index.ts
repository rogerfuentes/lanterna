/**
 * Expo config plugin for lanterna-react-native.
 *
 * Automatically configures native Android and iOS projects for Expo managed workflow.
 * Usage in app.json: ["lanterna-react-native/plugin"]
 */
export {
	ANDROID_DEFAULTS,
	type AndroidPluginConfig,
	applyAndroidPlugin,
} from "./withLanternaAndroid";
export { applyIosPlugin, IOS_DEFAULTS, type IosPluginConfig } from "./withLanternaIos";
