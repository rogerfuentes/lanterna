import { describe, expect, test } from "bun:test";
import type { CommandRunner } from "@lanterna/core";
import { parseMaestroFlow, runMaestro } from "../maestro";

const SAMPLE_FLOW = `
appId: "com.example.app"
---
- launchApp
- tapOn: "Login"
- inputText:
    text: "user@example.com"
- tapOn: "Submit"
- assertVisible: "Welcome"
`.trim();

describe("parseMaestroFlow", () => {
	test("extracts appId from quoted value", () => {
		const flow = parseMaestroFlow(SAMPLE_FLOW);
		expect(flow.appId).toBe("com.example.app");
	});

	test("extracts appId from unquoted value", () => {
		const yaml = `
appId: com.example.unquoted
---
- launchApp
`.trim();
		const flow = parseMaestroFlow(yaml);
		expect(flow.appId).toBe("com.example.unquoted");
	});

	test("extracts step names", () => {
		const flow = parseMaestroFlow(SAMPLE_FLOW);
		expect(flow.steps).toHaveLength(5);
		expect(flow.steps[0].name).toBe("launchApp");
		expect(flow.steps[1].name).toBe('tapOn "Login"');
		expect(flow.steps[2].name).toBe("inputText");
		expect(flow.steps[3].name).toBe('tapOn "Submit"');
		expect(flow.steps[4].name).toBe('assertVisible "Welcome"');
	});

	test("records correct line numbers for steps", () => {
		const flow = parseMaestroFlow(SAMPLE_FLOW);
		expect(flow.steps[0].lineNumber).toBe(3);
		expect(flow.steps[1].lineNumber).toBe(4);
	});

	test("handles inputText with multi-line YAML as a step with no argument", () => {
		// `- inputText:` followed by indented content matches as a step
		// with an empty argument since the value is on a subsequent line.
		const flow = parseMaestroFlow(SAMPLE_FLOW);
		const inputSteps = flow.steps.filter((s) => s.name.startsWith("inputText"));
		expect(inputSteps).toHaveLength(1);
		expect(inputSteps[0].name).toBe("inputText");
	});

	test("handles missing appId", () => {
		const yaml = `
---
- launchApp
- tapOn: "Login"
`.trim();
		const flow = parseMaestroFlow(yaml);
		expect(flow.appId).toBe("");
		expect(flow.name).toBe("Unnamed flow");
	});

	test("handles empty YAML", () => {
		const flow = parseMaestroFlow("");
		expect(flow.appId).toBe("");
		expect(flow.steps).toHaveLength(0);
		expect(flow.name).toBe("Unnamed flow");
	});

	test("sets flow name from appId", () => {
		const flow = parseMaestroFlow(SAMPLE_FLOW);
		expect(flow.name).toBe("Flow: com.example.app");
	});

	test("ignores unknown commands", () => {
		const yaml = `
appId: com.example.app
---
- launchApp
- unknownCommand: "foo"
- tapOn: "Button"
`.trim();
		const flow = parseMaestroFlow(yaml);
		expect(flow.steps).toHaveLength(2);
		expect(flow.steps[0].name).toBe("launchApp");
		expect(flow.steps[1].name).toBe('tapOn "Button"');
	});

	test("handles all known commands", () => {
		const yaml = `
appId: com.test.app
---
- tapOn: "X"
- assertVisible: "Y"
- scrollUntilVisible: "Z"
- back
- swipe: "LEFT"
- waitForAnimationToEnd
- launchApp
- clearState
- runFlow: "other.yaml"
- openLink: "https://example.com"
`.trim();
		const flow = parseMaestroFlow(yaml);
		expect(flow.steps).toHaveLength(10);
	});
});

describe("runMaestro", () => {
	test("calls maestro test with the flow path", async () => {
		let capturedCmd = "";
		let capturedArgs: string[] = [];

		const mockRunner: CommandRunner = async (cmd, args) => {
			capturedCmd = cmd;
			capturedArgs = args;
			return { stdout: "All tests passed", stderr: "", exitCode: 0 };
		};

		await runMaestro(mockRunner, "/path/to/flow.yaml");

		expect(capturedCmd).toBe("maestro");
		expect(capturedArgs).toEqual(["test", "/path/to/flow.yaml"]);
	});

	test("returns exit code and output on success", async () => {
		const mockRunner: CommandRunner = async () => ({
			stdout: "Tests passed\nAll green",
			stderr: "",
			exitCode: 0,
		});

		const result = await runMaestro(mockRunner, "flow.yaml");

		expect(result.exitCode).toBe(0);
		expect(result.output).toBe("Tests passed\nAll green");
	});

	test("returns exit code and output on failure", async () => {
		const mockRunner: CommandRunner = async () => ({
			stdout: "Test failed at step 3",
			stderr: "Error details",
			exitCode: 1,
		});

		const result = await runMaestro(mockRunner, "flow.yaml");

		expect(result.exitCode).toBe(1);
		expect(result.output).toBe("Test failed at step 3");
	});
});
