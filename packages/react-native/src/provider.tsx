/**
 * LanternaProvider — zero-config performance profiling for React Native.
 *
 * Wrap your app root with <LanternaProvider> and all profiling is automatic:
 * - FPS tracking via native CADisplayLink/Choreographer
 * - Memory monitoring
 * - Navigation tracking (auto-detects Expo Router, or pass navigationRef)
 * - Network request interception
 * - Bridge/JSI call tracking
 * - Expo DevTools Plugin integration
 * - WebSocket streaming to Lanterna CLI
 *
 * Usage:
 *   <LanternaProvider>
 *     <Stack />
 *   </LanternaProvider>
 */

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useRef } from "react";
import { Platform } from "react-native";
import { BridgeTracker } from "./bridge-tracker";
import { MetricCollector, type MetricSnapshot } from "./collector";
import { LayoutTracker } from "./layout-tracker";
import { PerformanceMarks } from "./marks";
import { getNativeModule } from "./NativeLanterna";
import { type NavigationState, NavigationTracker } from "./navigation";
import { createNavigationIntegration } from "./navigation-hooks";
import { NetworkInterceptor } from "./network";
import { ProfilerBridge } from "./profiler";
import { LanternaWsClient } from "./ws-client";

/** Props for LanternaProvider. All optional — zero-config by default. */
export interface LanternaProviderProps {
	children: ReactNode;
	/** Disable profiling entirely (default: true). Set to `__DEV__` to disable in production. */
	enabled?: boolean;
	/** Metric collection interval in ms (default: 500). */
	intervalMs?: number;
	/** Navigation ref override. If not provided, auto-detects Expo Router. */
	navigationRef?: { current: any } | null;
	/** WebSocket host for the lanterna monitor server (default: "localhost"). Set to your machine's IP for physical device monitoring. */
	wsHost?: string;
	/** WebSocket port for the lanterna monitor server (default: 8347). */
	wsPort?: number;
}

/** All Lanterna module instances accessible via useLanterna(). */
export interface LanternaInstances {
	marks: PerformanceMarks;
	profiler: ProfilerBridge;
	collector: MetricCollector;
	navigationTracker: NavigationTracker;
	networkInterceptor: NetworkInterceptor;
	bridgeTracker: BridgeTracker;
	layoutTracker: LayoutTracker;
}

const LanternaContext = createContext<LanternaInstances | null>(null);

// Shared ref for memory value (written by native polling, read by devtools)
let _lastMemoryMb = 0;

/**
 * Access Lanterna profiling modules from any component.
 */
export function useLanterna(): LanternaInstances {
	const ctx = useContext(LanternaContext);
	if (!ctx) {
		throw new Error("useLanterna() must be used within a <LanternaProvider>");
	}
	return ctx;
}

export function LanternaProvider({
	children,
	enabled = true,
	intervalMs = 500,
	navigationRef,
	wsHost,
	wsPort,
}: LanternaProviderProps) {
	const instances = useRef<LanternaInstances | null>(null);
	if (instances.current === null) {
		instances.current = {
			marks: new PerformanceMarks(),
			profiler: new ProfilerBridge(),
			collector: new MetricCollector({
				intervalMs,
				collectFps: true,
				collectHermes: true,
				collectReactProfiler: true,
			}),
			navigationTracker: new NavigationTracker(),
			networkInterceptor: new NetworkInterceptor(),
			bridgeTracker: new BridgeTracker(),
			layoutTracker: new LayoutTracker(),
		};
	}
	const inst = instances.current;

	// --- Start/stop all profiling ---
	useEffect(() => {
		if (!enabled) return;

		// Start passive trackers (don't start collector's internal interval —
		// we drive collection manually after feeding native data)
		inst.networkInterceptor.start();
		inst.bridgeTracker.start();
		inst.layoutTracker.start();
		inst.marks.mark("lanterna:start");

		const native = getNativeModule();
		if (native) {
			native.startProfiling(JSON.stringify({ intervalMs })).catch(() => {});
		}

		// Connect WebSocket client to CLI
		const platform = Platform.OS === "android" ? "android" : "ios";
		const wsClient = new LanternaWsClient("lanterna-app", platform, Platform.OS, {
			...(wsHost !== undefined && { host: wsHost }),
			...(wsPort !== undefined && { port: wsPort }),
		});
		wsClient.connect();

		// Single collection loop: poll native → feed trackers → collect → send
		const collectionId = setInterval(async () => {
			try {
				// 1. Poll native module for frame timestamps + memory
				if (native) {
					const framesJson = await native.getFrameTimestamps();
					const timestamps: number[] = JSON.parse(framesJson);
					if (timestamps.length > 0) {
						inst.collector.feedFrameData(timestamps);
					}
					const sessionId = await native.getActiveSessionId();
					if (sessionId) {
						const metricsJson = await native.getMetrics(sessionId);
						const result = JSON.parse(metricsJson);
						_lastMemoryMb = result.metrics?.memory ?? 0;
					}
				}

				// 2. Feed tracker data
				inst.collector.feedNetworkData(inst.networkInterceptor.getRequests());
				inst.collector.feedBridgeStats(inst.bridgeTracker.getStats());
				inst.collector.feedLayoutStats(inst.layoutTracker.getStats());

				// 3. Collect snapshot (triggers all onSnapshot listeners)
				const snapshot = inst.collector.collect();

				// 4. Stream to CLI
				wsClient.sendSnapshot(snapshot, _lastMemoryMb);
			} catch {
				// non-fatal
			}
		}, intervalMs);

		return () => {
			inst.marks.mark("lanterna:stop");
			wsClient.disconnect();
			clearInterval(collectionId);
			if (native) {
				native
					.getActiveSessionId()
					.then((id) => {
						if (id) native.stopProfiling(id).catch(() => {});
					})
					.catch(() => {});
			}
			inst.networkInterceptor.stop();
			inst.bridgeTracker.stop();
			inst.layoutTracker.stop();
		};
	}, [enabled]);

	// --- Navigation tracking ---
	useAutoNavigation(inst.navigationTracker, inst.marks, navigationRef);

	// --- DevTools plugin (React hook — needs to be called unconditionally) ---
	useDevToolsIntegration(inst);

	return <LanternaContext.Provider value={inst}>{children}</LanternaContext.Provider>;
}

/**
 * Wire navigation state changes to the NavigationTracker.
 */
function useAutoNavigation(
	tracker: NavigationTracker,
	marks: PerformanceMarks,
	externalRef?: { current: any } | null,
) {
	const integrationRef = useRef(
		createNavigationIntegration({
			tracker,
			onScreenChange: (screen) => {
				marks.mark(`screen:${screen.screenName}`);
			},
		}),
	);

	useEffect(() => {
		if (!externalRef) return;

		const handler = integrationRef.current.handler;
		const navRef = externalRef as any;

		if (typeof navRef.addListener === "function") {
			const unsub = navRef.addListener("state", () => {
				const state = navRef.getRootState?.();
				if (state) handler(state as NavigationState);
			});
			return typeof unsub === "function" ? unsub : () => unsub?.remove();
		}
	}, [externalRef]);
}

/**
 * Connect to Expo DevTools Plugin using the React hook from expo/devtools.
 * This MUST be a hook (called unconditionally) because useDevToolsPluginClient is a hook.
 */
function useDevToolsIntegration(inst: LanternaInstances) {
	// Dynamically require expo/devtools — returns null if not available
	let useDevToolsPluginClient: any = null;
	try {
		useDevToolsPluginClient = require("expo/devtools").useDevToolsPluginClient;
	} catch {
		// expo/devtools not available
	}

	// We must call the hook unconditionally (React rules of hooks).
	// If expo/devtools isn't available, we use a no-op fallback.
	const expoClient = useDevToolsPluginClient
		? useDevToolsPluginClient("@lanternajs/expo-devtools-plugin")
		: null;

	useEffect(() => {
		if (!expoClient) return;

		let DevToolsClient: any;
		try {
			DevToolsClient = require("@lanternajs/expo-devtools-plugin").DevToolsClient;
		} catch {
			return;
		}

		const devToolsClient = new DevToolsClient();

		// Feed snapshot data to devtools, which sends it to the browser via Expo WebSocket
		const unsub = inst.collector.onSnapshot((snapshot: MetricSnapshot) => {
			const timeline = inst.navigationTracker.getTimeline();
			const netRequests = inst.networkInterceptor.getRequests();
			const bStats = inst.bridgeTracker.getStats();
			const memoryMb = _lastMemoryMb;

			let score: number | undefined;
			if (snapshot.fps) {
				const fps = snapshot.fps.fps;
				score = Math.round(Math.max(0, Math.min(100, ((fps - 30) / (57 - 30)) * 100)));
			}

			const currentScreenName = timeline.currentScreen;
			const screenData = currentScreenName
				? inst.navigationTracker.getScreenMetrics(currentScreenName)
				: null;

			// Get the most recent render — Profiler ids (e.g. "HomeScreen") may
			// differ from route names (e.g. "index"), so we take the latest render
			// from any component as a proxy for the current screen's render time.
			const allRenders = inst.profiler.getRenders();
			const lastRender = allRenders.length > 0 ? allRenders[allRenders.length - 1] : null;

			const liveTimeOnScreen = screenData?.visitedAt
				? snapshot.timestamp - screenData.visitedAt
				: undefined;

			devToolsClient.updateMetrics({
				timestamp: snapshot.timestamp,
				score,
				fps: snapshot.fps
					? { ui: snapshot.fps.fps, js: 0, droppedFrames: snapshot.fps.droppedFrames }
					: undefined,
				memory: memoryMb > 0 ? memoryMb : undefined,
				currentScreen: currentScreenName ?? undefined,
				screenMetrics: screenData
					? {
							screenName: screenData.screenName,
							ttid: screenData.ttid,
							renderDuration: lastRender?.actualDuration ?? screenData.renderDuration,
							timeOnScreen: screenData.timeOnScreen ?? liveTimeOnScreen,
						}
					: undefined,
				networkSummary:
					netRequests.length > 0
						? {
								activeRequests: netRequests.filter((r: any) => !r.endTime).length,
								totalRequests: netRequests.length,
								averageDuration:
									netRequests.reduce((sum: number, r: any) => sum + (r.duration ?? 0), 0) /
									netRequests.length,
							}
						: undefined,
				bridgeSummary:
					bStats.totalCalls > 0
						? {
								callsPerSecond: bStats.callsPerSecond,
								totalCalls: bStats.totalCalls,
								topModule: bStats.topModules[0]?.module,
							}
						: undefined,
			});
		});

		// Start sending metrics to the Expo DevTools browser panel
		devToolsClient.start(1000, (msg: any) => {
			expoClient.sendMessage("lanterna:metrics", msg);
		});

		// Listen for commands from the browser
		const subscription = expoClient.addMessageListener("lanterna:command", (data: any) => {
			devToolsClient.handleCommand(data.command, data.payload);
		});

		return () => {
			devToolsClient.stop();
			unsub();
			subscription?.remove();
		};
	}, [expoClient]);
}
