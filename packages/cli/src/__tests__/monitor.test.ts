import { describe, expect, test } from "bun:test";
import { renderDashboard } from "../live-dashboard";
import type { ConnectedApp } from "../ws-server";

describe("renderDashboard", () => {
	test("shows waiting message when no apps connected", () => {
		const output = renderDashboard([], 8347, true);
		expect(output).toContain("Waiting for apps to connect");
		expect(output).toContain("8347");
		expect(output).toContain("running");
	});

	test("shows stopped status", () => {
		const output = renderDashboard([], 8347, false);
		expect(output).toContain("stopped");
	});

	test("shows connected app info", () => {
		const apps: ConnectedApp[] = [
			{
				sessionId: "s1",
				appId: "com.example.app",
				platform: "android",
				deviceName: "Pixel 6",
				connectedAt: Date.now(),
				lastMetricsAt: Date.now(),
				latestMetrics: { ui_fps: 58.5, cpu: 25 },
			},
		];
		const output = renderDashboard(apps, 8347, true);
		expect(output).toContain("com.example.app");
		expect(output).toContain("Pixel 6");
		expect(output).toContain("58.5");
	});

	test("shows FPS data when available", () => {
		const apps: ConnectedApp[] = [
			{
				sessionId: "s1",
				appId: "com.example.app",
				platform: "ios",
				deviceName: "iPhone 15",
				connectedAt: Date.now(),
				lastMetricsAt: Date.now(),
				latestMetrics: {},
				fps: { ui: 59.5, js: 57, droppedFrames: 2 },
			},
		];
		const output = renderDashboard(apps, 8347, true);
		expect(output).toContain("59.5");
		expect(output).toContain("Drops: 2");
	});

	test("shows memory data", () => {
		const apps: ConnectedApp[] = [
			{
				sessionId: "s1",
				appId: "com.example.app",
				platform: "android",
				deviceName: "Pixel",
				connectedAt: Date.now(),
				lastMetricsAt: Date.now(),
				latestMetrics: {},
				memory: { usedMb: 250 },
			},
		];
		const output = renderDashboard(apps, 8347, true);
		expect(output).toContain("250 MB");
	});

	test("shows awaiting metrics for empty metrics", () => {
		const apps: ConnectedApp[] = [
			{
				sessionId: "s1",
				appId: "com.example.app",
				platform: "android",
				deviceName: "Pixel",
				connectedAt: Date.now(),
				lastMetricsAt: 0,
				latestMetrics: {},
			},
		];
		const output = renderDashboard(apps, 8347, true);
		expect(output).toContain("Awaiting metrics");
	});

	test("shows Ctrl+C hint", () => {
		const output = renderDashboard([], 8347, true);
		expect(output).toContain("Ctrl+C");
	});

	test("renders multiple apps", () => {
		const apps: ConnectedApp[] = [
			{
				sessionId: "s1",
				appId: "com.app.one",
				platform: "android",
				deviceName: "Pixel",
				connectedAt: Date.now(),
				lastMetricsAt: Date.now(),
				latestMetrics: { ui_fps: 60 },
			},
			{
				sessionId: "s2",
				appId: "com.app.two",
				platform: "ios",
				deviceName: "iPhone",
				connectedAt: Date.now(),
				lastMetricsAt: Date.now(),
				latestMetrics: { ui_fps: 45 },
			},
		];
		const output = renderDashboard(apps, 8347, true);
		expect(output).toContain("com.app.one");
		expect(output).toContain("com.app.two");
	});
});
