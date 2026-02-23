import { describe, expect, test } from "bun:test";
import { applyAndroidPlugin } from "../withLanternaAndroid";
import { applyIosPlugin } from "../withLanternaIos";

const SAMPLE_MAIN_APPLICATION = `package com.myapp

import android.app.Application
import com.facebook.react.ReactApplication
import com.facebook.react.defaults.DefaultReactNativeHost

class MainApplication : Application(), ReactApplication {
    override fun getPackages(): List<ReactPackage> {
        val packages = mutableListOf<ReactPackage>()
        return packages
    }
}`;

const SAMPLE_PODFILE = `platform :ios, '14.0'

target 'MyApp' do
  use_react_native!
  pod 'RNScreens', :path => '../node_modules/react-native-screens'
end`;

describe("applyAndroidPlugin", () => {
	test("adds import and package line", () => {
		const result = applyAndroidPlugin(SAMPLE_MAIN_APPLICATION);
		expect(result).toContain("import com.lanterna.LanternaPackage");
		expect(result).toContain("packages.add(LanternaPackage())");
	});

	test("idempotent — does not duplicate if already present", () => {
		const first = applyAndroidPlugin(SAMPLE_MAIN_APPLICATION);
		const second = applyAndroidPlugin(first);
		expect(second).toBe(first);
	});

	test("preserves existing content", () => {
		const result = applyAndroidPlugin(SAMPLE_MAIN_APPLICATION);
		expect(result).toContain("import android.app.Application");
		expect(result).toContain("class MainApplication");
	});

	test("handles custom config", () => {
		const result = applyAndroidPlugin(SAMPLE_MAIN_APPLICATION, {
			importLine: "import com.custom.CustomPackage",
			packageLine: "packages.add(CustomPackage())",
		});
		expect(result).toContain("import com.custom.CustomPackage");
		expect(result).toContain("packages.add(CustomPackage())");
	});
});

describe("applyIosPlugin", () => {
	test("adds pod line after use_react_native", () => {
		const result = applyIosPlugin(SAMPLE_PODFILE);
		expect(result).toContain("pod '@lanternajs/react-native'");
		expect(result).toContain(":path => '../node_modules/@lanternajs/react-native'");
	});

	test("idempotent — does not duplicate if already present", () => {
		const first = applyIosPlugin(SAMPLE_PODFILE);
		const second = applyIosPlugin(first);
		expect(second).toBe(first);
	});

	test("preserves existing pods", () => {
		const result = applyIosPlugin(SAMPLE_PODFILE);
		expect(result).toContain("pod 'RNScreens'");
	});

	test("returns unchanged if no use_react_native found", () => {
		const podfile = "platform :ios, '14.0'\ntarget 'MyApp' do\nend";
		const result = applyIosPlugin(podfile);
		expect(result).toBe(podfile);
	});

	test("handles custom config", () => {
		const result = applyIosPlugin(SAMPLE_PODFILE, {
			podName: "custom-pod",
			podPath: "../custom/path",
		});
		expect(result).toContain("pod 'custom-pod'");
		expect(result).toContain(":path => '../custom/path'");
	});
});
