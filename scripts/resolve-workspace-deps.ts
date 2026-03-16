/**
 * Resolves `workspace:*` dependencies in all package.json files before npm publish.
 *
 * Bun (unlike pnpm) does not automatically replace `workspace:*` with real
 * version numbers during publish, so consumers get broken dependencies on npm.
 * This script reads each workspace package.json, replaces any `workspace:*`
 * references with the actual version from the target package, and writes back.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const packagesDir = join(import.meta.dirname, "..", "packages");

// Build a map of package name → version
const versionMap = new Map<string, string>();
const packageDirs = readdirSync(packagesDir, { withFileTypes: true })
	.filter((d) => d.isDirectory())
	.map((d) => d.name);

for (const dir of packageDirs) {
	const pkgPath = join(packagesDir, dir, "package.json");
	try {
		const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
		if (pkg.name && pkg.version) {
			versionMap.set(pkg.name, pkg.version);
		}
	} catch {
		// skip non-package dirs
	}
}

// Replace workspace:* in each package.json
let changed = 0;
for (const dir of packageDirs) {
	const pkgPath = join(packagesDir, dir, "package.json");
	try {
		const raw = readFileSync(pkgPath, "utf-8");
		const pkg = JSON.parse(raw);
		let modified = false;

		for (const depField of [
			"dependencies",
			"devDependencies",
			"peerDependencies",
		]) {
			const deps = pkg[depField];
			if (!deps) continue;

			for (const [name, version] of Object.entries(deps)) {
				if (typeof version === "string" && version.startsWith("workspace:")) {
					const realVersion = versionMap.get(name);
					if (!realVersion) {
						console.error(
							`ERROR: ${pkg.name} depends on ${name} with ${version}, but no version found`,
						);
						process.exit(1);
					}
					deps[name] = `^${realVersion}`;
					modified = true;
				}
			}
		}

		if (modified) {
			writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
			console.log(`Updated ${pkg.name}`);
			changed++;
		}
	} catch {
		// skip
	}
}

console.log(`Resolved workspace dependencies in ${changed} package(s)`);
