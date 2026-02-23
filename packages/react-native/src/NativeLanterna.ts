/**
 * Turbo Module loader for Lanterna native module.
 *
 * In a React Native environment, this loads the codegen-generated native binding.
 * Outside RN (e.g., Bun tests), this returns null gracefully.
 */
import type { NativeLanternaSpec } from "./types";

/**
 * Attempt to load the native Turbo Module.
 * Returns null when running outside React Native (tests, Node, Bun).
 */
export function getNativeModule(): NativeLanternaSpec | null {
	try {
		const spec = require("./specs/NativeLanterna");
		return (spec.default as NativeLanternaSpec) ?? null;
	} catch {
		return null;
	}
}
