import type {
	MeasurementSession,
	MetricScore,
	Recommendation,
	RecommendationSeverity,
	ScoreResult,
} from "./types";
import { MetricType } from "./types";

export interface Heuristic {
	id: string;
	name: string;
	analyze: (session: MeasurementSession, score: ScoreResult) => Recommendation | null;
}

const GOOD_SCORE_THRESHOLD = 75;
const POOR_SCORE_THRESHOLD = 40;

function findMetricScore(score: ScoreResult, type: MetricType): MetricScore | undefined {
	return score.perMetric.find((m) => m.type === type);
}

function severityFromScore(score: number): RecommendationSeverity {
	if (score < POOR_SCORE_THRESHOLD) return "critical";
	return "warning";
}

const lowUiFps: Heuristic = {
	id: "low-ui-fps",
	name: "Low UI FPS",
	analyze(_session, score) {
		const metric = findMetricScore(score, MetricType.UI_FPS);
		if (!metric || metric.score >= GOOD_SCORE_THRESHOLD) return null;

		return {
			id: "low-ui-fps",
			title: "Low UI thread frame rate",
			severity: severityFromScore(metric.score),
			message:
				`UI FPS averaged ${metric.value.toFixed(1)} fps ` +
				`(score: ${metric.score}/100). ` +
				"This indicates heavy layout work or excessive " +
				"re-renders on the main thread.",
			metric: MetricType.UI_FPS,
			suggestion:
				"Wrap expensive components with React.memo() to prevent " +
				"unnecessary re-renders. Use useMemo() for costly " +
				"computations and useCallback() for stable function " +
				"references. For FlatList, set removeClippedSubviews " +
				"and use getItemLayout to skip layout measurement.",
		};
	},
};

const lowJsFps: Heuristic = {
	id: "low-js-fps",
	name: "Low JS FPS",
	analyze(_session, score) {
		const metric = findMetricScore(score, MetricType.JS_FPS);
		if (!metric || metric.score >= GOOD_SCORE_THRESHOLD) return null;

		return {
			id: "low-js-fps",
			title: "JS thread bottleneck detected",
			severity: severityFromScore(metric.score),
			message:
				`JS FPS averaged ${metric.value.toFixed(1)} fps ` +
				`(score: ${metric.score}/100). ` +
				"The JavaScript thread is overloaded, likely from " +
				"synchronous work blocking the run loop.",
			metric: MetricType.JS_FPS,
			suggestion:
				"Defer non-critical work with InteractionManager." +
				"runAfterInteractions(). Use requestAnimationFrame() " +
				"for animation-related JS. Move heavy computation to " +
				"native modules or web workers via react-native-worker.",
		};
	},
};

const highCpu: Heuristic = {
	id: "high-cpu",
	name: "High CPU Usage",
	analyze(_session, score) {
		const metric = findMetricScore(score, MetricType.CPU);
		if (!metric || metric.score >= GOOD_SCORE_THRESHOLD) return null;

		return {
			id: "high-cpu",
			title: "High CPU utilization",
			severity: severityFromScore(metric.score),
			message:
				`CPU usage averaged ${metric.value.toFixed(1)}% ` +
				`(score: ${metric.score}/100). ` +
				"Sustained high CPU drains battery and causes thermal " +
				"throttling on mobile devices.",
			metric: MetricType.CPU,
			suggestion:
				"Profile with Hermes sampling profiler to find hot " +
				"functions. Wrap stable callbacks with useCallback() " +
				"and memoize selectors. Check for infinite loops in " +
				"useEffect dependencies or rapid setState calls.",
		};
	},
};

const highMemory: Heuristic = {
	id: "high-memory",
	name: "High Memory Usage",
	analyze(_session, score) {
		const metric = findMetricScore(score, MetricType.MEMORY);
		if (!metric || metric.score >= GOOD_SCORE_THRESHOLD) return null;

		return {
			id: "high-memory",
			title: "Elevated memory consumption",
			severity: severityFromScore(metric.score),
			message:
				`Memory usage averaged ${metric.value.toFixed(0)} MB ` +
				`(score: ${metric.score}/100). ` +
				"High memory increases the risk of OOM kills, " +
				"especially on lower-end devices.",
			metric: MetricType.MEMORY,
			suggestion:
				"Enable removeClippedSubviews on FlatList/SectionList " +
				"to unmount off-screen items. Use a caching image " +
				"library like react-native-fast-image with memory " +
				"limits. Check for retained closures and event " +
				"listeners not cleaned up in useEffect return.",
		};
	},
};

const excessiveFrameDrops: Heuristic = {
	id: "excessive-frame-drops",
	name: "Excessive Frame Drops",
	analyze(_session, score) {
		const metric = findMetricScore(score, MetricType.FRAME_DROPS);
		if (!metric || metric.score >= GOOD_SCORE_THRESHOLD) return null;

		return {
			id: "excessive-frame-drops",
			title: "Excessive frame drops detected",
			severity: severityFromScore(metric.score),
			message:
				`Frame drop rate was ${metric.value.toFixed(1)}% ` +
				`(score: ${metric.score}/100). ` +
				"Users perceive jank when frames are dropped during " +
				"scrolling or transitions.",
			metric: MetricType.FRAME_DROPS,
			suggestion:
				"Use react-native-screens for native navigation " +
				"transitions instead of JS-driven animations. For " +
				"FlatList, tune windowSize (default 21) and " +
				"maxToRenderPerBatch. Replace Animated with " +
				"react-native-reanimated for UI-thread animations.",
		};
	},
};

const slowTti: Heuristic = {
	id: "slow-tti",
	name: "Slow Time to Interactive",
	analyze(_session, score) {
		const metric = findMetricScore(score, MetricType.TTI);
		if (!metric || metric.score >= GOOD_SCORE_THRESHOLD) return null;

		return {
			id: "slow-tti",
			title: "Slow time to interactive",
			severity: severityFromScore(metric.score),
			message:
				`TTI was ${metric.value.toFixed(2)}s ` +
				`(score: ${metric.score}/100). ` +
				"Users expect the app to be interactive within 2 " +
				"seconds on a good connection.",
			metric: MetricType.TTI,
			suggestion:
				"Lazy-load non-critical screens with React.lazy() " +
				"and Suspense. Enable Hermes for faster JS parse " +
				"time. Use inline requires or RAM bundles to defer " +
				"module loading. Reduce the initial component tree " +
				"depth rendered on mount.",
		};
	},
};

const slowScreenTtid: Heuristic = {
	id: "slow-screen-ttid",
	name: "Slow Screen TTID",
	analyze(session, _score) {
		if (!session.navigationTimeline) return null;

		const slowScreens = session.navigationTimeline.screens.filter(
			(s) => s.ttid !== undefined && s.ttid > 500,
		);
		if (slowScreens.length === 0) return null;

		const worst = slowScreens.reduce((a, b) => ((a.ttid ?? 0) > (b.ttid ?? 0) ? a : b));
		const worstMs = worst.ttid ?? 0;
		const severity: RecommendationSeverity = worstMs > 1000 ? "critical" : "warning";

		return {
			id: "slow-screen-ttid",
			title: "Slow screen time to initial display",
			severity,
			message:
				`${slowScreens.length} screen${slowScreens.length > 1 ? "s" : ""} had TTID > 500ms. ` +
				`Slowest: ${worst.screenName} at ${worstMs}ms. ` +
				"Users expect screens to display content almost instantly.",
			metric: MetricType.TTI,
			suggestion:
				"Use React.lazy() and code splitting to defer non-critical " +
				"screen content. Implement skeleton placeholders for " +
				"immediate visual feedback. Move heavy data fetching " +
				"to deferred loading after initial display.",
		};
	},
};

const excessiveNetwork: Heuristic = {
	id: "excessive-network",
	name: "Excessive Network Activity",
	analyze(session, _score) {
		if (!session.networkRequests) return null;

		const requests = session.networkRequests;
		const tooMany = requests.length > 10;
		const slowRequests = requests.filter((r) => r.duration !== undefined && r.duration > 3000);
		const hasSlow = slowRequests.length > 0;

		if (!tooMany && !hasSlow) return null;

		const parts: string[] = [];
		if (tooMany) {
			parts.push(`${requests.length} network requests during the session`);
		}
		if (hasSlow) {
			parts.push(`${slowRequests.length} request${slowRequests.length > 1 ? "s" : ""} took > 3s`);
		}

		return {
			id: "excessive-network",
			title: "Excessive network activity detected",
			severity: "warning",
			message:
				`${parts.join("; ")}. ` +
				"Excessive or slow network requests can block rendering " +
				"and degrade user experience.",
			metric: MetricType.TTI,
			suggestion:
				"Batch API requests where possible and implement " +
				"response caching. Check for slow endpoints and " +
				"consider pagination or lazy loading for large " +
				"data sets. Use stale-while-revalidate patterns.",
		};
	},
};

const highBridgeTraffic: Heuristic = {
	id: "high-bridge-traffic",
	name: "High Bridge Traffic",
	analyze(session, _score) {
		if (!session.bridgeStats) return null;

		const cps = session.bridgeStats.callsPerSecond;
		if (cps <= 50) return null;

		const severity: RecommendationSeverity = cps > 100 ? "critical" : "warning";

		return {
			id: "high-bridge-traffic",
			title: "High bridge call frequency",
			severity,
			message:
				`Bridge is handling ${cps.toFixed(0)} calls/sec. ` +
				"High bridge traffic causes serialization overhead " +
				"and can block both JS and UI threads.",
			metric: MetricType.JS_FPS,
			suggestion:
				"Migrate to JSI or TurboModules for synchronous native " +
				"access without bridge overhead. Batch bridge calls " +
				"using setNativeProps or Animated.event. Consider " +
				"react-native-reanimated worklets for UI-thread work.",
		};
	},
};

const excessiveLayouts: Heuristic = {
	id: "excessive-layouts",
	name: "Excessive Layouts",
	analyze(session, _score) {
		if (!session.layoutStats) return null;

		const excessive = session.layoutStats.componentsWithExcessiveLayouts.filter((c) => c.count > 3);
		if (excessive.length === 0) return null;

		const names = excessive.map((c) => `${c.name} (${c.count})`).join(", ");

		return {
			id: "excessive-layouts",
			title: "Excessive layout passes detected",
			severity: "warning",
			message:
				`${excessive.length} component${excessive.length > 1 ? "s" : ""} had > 3 layout passes: ` +
				`${names}. ` +
				"Excessive layout recalculations cause jank and wasted CPU cycles.",
			metric: MetricType.UI_FPS,
			suggestion:
				"Avoid dynamic inline styles that change on every render. " +
				"Use StyleSheet.create() for stable style objects. " +
				"Check for layout thrashing caused by reading layout " +
				"values and immediately writing style changes.",
		};
	},
};

const jsUiCorrelation: Heuristic = {
	id: "js-ui-correlation",
	name: "JS-UI Thread Correlation",
	analyze(_session, score) {
		const jsMetric = findMetricScore(score, MetricType.JS_FPS);
		const uiMetric = findMetricScore(score, MetricType.UI_FPS);

		if (!jsMetric || !uiMetric) return null;
		if (jsMetric.score >= GOOD_SCORE_THRESHOLD || uiMetric.score >= GOOD_SCORE_THRESHOLD) {
			return null;
		}

		return {
			id: "js-ui-correlation",
			title: "Both JS and UI threads are struggling",
			severity: "info",
			message:
				"Both JS and UI thread frame rates are below " +
				"acceptable levels. This pattern typically indicates " +
				"a bridge bottleneck or synchronous native calls " +
				"blocking both threads.",
			metric: MetricType.JS_FPS,
			suggestion:
				"Audit bridge calls with MessageQueue.spy(). Migrate " +
				"synchronous NativeModules to async or use JSI for " +
				"direct native access. Consider moving animations to " +
				"the UI thread with react-native-reanimated's " +
				"worklets.",
		};
	},
};

const SEVERITY_ORDER: Record<RecommendationSeverity, number> = {
	critical: 0,
	warning: 1,
	info: 2,
};

export const builtInHeuristics: Heuristic[] = [
	lowUiFps,
	lowJsFps,
	highCpu,
	highMemory,
	excessiveFrameDrops,
	slowTti,
	jsUiCorrelation,
	slowScreenTtid,
	excessiveNetwork,
	highBridgeTraffic,
	excessiveLayouts,
];

/**
 * Analyze a measurement session and return sorted recommendations.
 * Runs all built-in heuristics and returns results ordered by severity
 * (critical first, then warning, then info).
 */
export function analyzeSession(session: MeasurementSession, score: ScoreResult): Recommendation[] {
	const recommendations: Recommendation[] = [];

	for (const heuristic of builtInHeuristics) {
		const result = heuristic.analyze(session, score);
		if (result) {
			recommendations.push(result);
		}
	}

	recommendations.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

	return recommendations;
}
