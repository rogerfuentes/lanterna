import { describe, expect, test } from "bun:test";
import { generateDashboardHtml } from "../web-ui";

describe("generateDashboardHtml", () => {
	const html = generateDashboardHtml();

	test("HTML contains score gauge SVG", () => {
		expect(html).toContain("<svg viewBox");
		expect(html).toContain("gauge-arc");
		expect(html).toContain("score-gauge");
	});

	test("HTML contains FPS chart section", () => {
		expect(html).toContain("fps-panel");
		expect(html).toContain("fps-canvas");
		expect(html).toContain("ui-fps");
		expect(html).toContain("js-fps");
	});

	test("HTML contains CPU/memory display", () => {
		expect(html).toContain("cpu-memory-panel");
		expect(html).toContain("cpu-bar");
		expect(html).toContain("memory-bar");
		expect(html).toContain("cpu-value");
		expect(html).toContain("memory-value");
	});

	test("HTML contains navigation section", () => {
		expect(html).toContain("navigation-panel");
		expect(html).toContain("current-screen");
		expect(html).toContain("ttid-value");
		expect(html).toContain("render-duration");
		expect(html).toContain("time-on-screen");
	});

	test("HTML contains network section", () => {
		expect(html).toContain("network-panel");
		expect(html).toContain("active-requests");
		expect(html).toContain("total-requests");
		expect(html).toContain("avg-duration");
		expect(html).toContain("slowest-request");
	});

	test("HTML is self-contained (no external URLs)", () => {
		expect(html).not.toMatch(/https?:\/\//);
	});

	test("HTML includes dark mode CSS", () => {
		expect(html).toContain("prefers-color-scheme: dark");
	});

	test("HTML includes onMessage handler script", () => {
		expect(html).toContain("__lanterna_onMessage");
		expect(html).toContain("onMessage");
		expect(html).toContain("<script>");
	});

	test("returns valid HTML structure", () => {
		expect(html.trimStart().startsWith("<!DOCTYPE html>")).toBe(true);
		expect(html).toContain("<html");
		expect(html).toContain("</html>");
		expect(html).toContain("<head>");
		expect(html).toContain("</head>");
		expect(html).toContain("<body>");
		expect(html).toContain("</body>");
	});

	test("contains bridge stats section", () => {
		expect(html).toContain("bridge-panel");
		expect(html).toContain("bridge-calls-sec");
		expect(html).toContain("bridge-total");
		expect(html).toContain("bridge-top-module");
	});

	test("contains CSS variables for theming", () => {
		expect(html).toContain("--good: #0cce6b");
		expect(html).toContain("--needs-work: #ffa400");
		expect(html).toContain("--poor: #ff4e42");
		expect(html).toContain("--bg:");
		expect(html).toContain("--surface:");
	});
});
