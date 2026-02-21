/**
 * Turbo Module spec for Lanterna native module.
 *
 * This file defines the interface that React Native codegen uses to generate
 * native bindings. In a full RN environment, TurboModuleRegistry.get() resolves
 * the native implementation. Outside RN (e.g., Bun tests), this returns null.
 */
import type { NativeLanternaSpec } from "./types";

/**
 * Attempt to load the native Turbo Module.
 * Returns null when running outside React Native (tests, Node, Bun).
 */
export function getNativeModule(): NativeLanternaSpec | null {
	try {
		// biome-ignore lint/suspicious/noExplicitAny: RN global not typed in Bun
		const RN = (globalThis as any).require?.("react-native");
		if (!RN?.TurboModuleRegistry) return null;
		return (RN.TurboModuleRegistry.get("LanternaModule") as NativeLanternaSpec) ?? null;
	} catch {
		return null;
	}
}
