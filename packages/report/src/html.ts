import type {
	ComparisonResult,
	MeasurementSession,
	MetricSample,
	MetricType,
	NavigationTimelineData,
	NetworkRequestData,
	ScoreCategory,
	ScoreResult,
} from "@lanternajs/core";
import { categoryLabel, formatMetricValue, metricLabel } from "./format";

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function categoryColor(category: ScoreCategory): string {
	switch (category) {
		case "good":
			return "var(--good)";
		case "needs_work":
			return "var(--needs-work)";
		case "poor":
			return "var(--poor)";
		default:
			return "var(--good)";
	}
}

function renderCss(): string {
	return `
:root {
	--good: #0cce6b;
	--needs-work: #ffa400;
	--poor: #ff4e42;
	--bg: #ffffff;
	--surface: #f5f5f5;
	--text: #1a1a2e;
	--text-secondary: #6b7280;
	--border: #e5e7eb;
	--gauge-bg: #e0e0e0;
}

@media (prefers-color-scheme: dark) {
	:root {
		--bg: #1a1a2e;
		--surface: #232340;
		--text: #e5e7eb;
		--text-secondary: #9ca3af;
		--border: #374151;
		--gauge-bg: #3a3a5c;
	}
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
		Roboto, Oxygen, Ubuntu, sans-serif;
	background: var(--bg);
	color: var(--text);
	line-height: 1.6;
	padding: 24px;
	max-width: 960px;
	margin: 0 auto;
}

.header {
	text-align: center;
	margin-bottom: 32px;
}

.header h1 {
	font-size: 24px;
	font-weight: 700;
	margin-bottom: 4px;
}

.header .timestamp {
	font-size: 13px;
	color: var(--text-secondary);
}

.gauge-section {
	display: flex;
	justify-content: center;
	margin-bottom: 32px;
}

.gauge-container {
	position: relative;
	width: 160px;
	height: 160px;
}

.gauge-container svg {
	width: 100%;
	height: 100%;
}

.gauge-label {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	text-align: center;
}

.gauge-score {
	font-size: 40px;
	font-weight: 700;
	line-height: 1;
}

.gauge-category {
	font-size: 12px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.device-info {
	display: flex;
	justify-content: center;
	gap: 24px;
	flex-wrap: wrap;
	margin-bottom: 32px;
	font-size: 14px;
	color: var(--text-secondary);
}

.device-info span {
	display: flex;
	align-items: center;
	gap: 6px;
}

.metrics-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	gap: 16px;
	margin-bottom: 32px;
}

.metric-card {
	background: var(--surface);
	border: 1px solid var(--border);
	border-radius: 12px;
	padding: 20px;
	cursor: pointer;
	transition: box-shadow 0.2s;
}

.metric-card:hover {
	box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.metric-card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 8px;
}

.metric-name {
	font-size: 14px;
	font-weight: 600;
}

.metric-badge {
	font-size: 11px;
	font-weight: 600;
	padding: 2px 8px;
	border-radius: 12px;
	color: #fff;
}

.metric-value {
	font-size: 28px;
	font-weight: 700;
	margin-bottom: 8px;
}

.score-bar-container {
	height: 6px;
	background: var(--gauge-bg);
	border-radius: 3px;
	overflow: hidden;
}

.score-bar-fill {
	height: 100%;
	border-radius: 3px;
	transition: width 0.3s;
}

.metric-score-label {
	font-size: 12px;
	color: var(--text-secondary);
	margin-top: 4px;
}

.metric-detail {
	display: none;
	margin-top: 16px;
	padding-top: 16px;
	border-top: 1px solid var(--border);
}

.metric-detail.open {
	display: block;
}

.sparkline-container {
	width: 100%;
	height: 60px;
}

.sparkline-container svg {
	width: 100%;
	height: 100%;
}

.section-title {
	font-size: 18px;
	font-weight: 700;
	margin-bottom: 16px;
	padding-bottom: 8px;
	border-bottom: 2px solid var(--border);
}

.comparison-section {
	margin-bottom: 32px;
}

.comparison-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	gap: 12px;
}

.delta-card {
	background: var(--surface);
	border: 1px solid var(--border);
	border-radius: 8px;
	padding: 16px;
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.delta-label {
	font-size: 14px;
	font-weight: 600;
}

.delta-values {
	font-size: 13px;
	color: var(--text-secondary);
	margin-top: 2px;
}

.delta-indicator {
	text-align: right;
}

.delta-arrow {
	font-size: 18px;
	font-weight: 700;
}

.delta-score {
	font-size: 12px;
	color: var(--text-secondary);
}

.delta-improved { color: var(--good); }
.delta-regressed { color: var(--poor); }
.delta-unchanged { color: var(--text-secondary); }

.regression-banner {
	padding: 12px 16px;
	border-radius: 8px;
	margin-bottom: 16px;
	font-weight: 600;
	font-size: 14px;
}

.regression-banner.has-regression {
	background: rgba(255, 78, 66, 0.1);
	border: 1px solid var(--poor);
	color: var(--poor);
}

.regression-banner.no-regression {
	background: rgba(12, 206, 107, 0.1);
	border: 1px solid var(--good);
	color: var(--good);
}

.footer {
	text-align: center;
	font-size: 12px;
	color: var(--text-secondary);
	margin-top: 32px;
	padding-top: 16px;
	border-top: 1px solid var(--border);
}

.expand-hint {
	font-size: 11px;
	color: var(--text-secondary);
	margin-top: 4px;
}

.tier3-section {
	margin-bottom: 32px;
}

.tier3-table {
	width: 100%;
	border-collapse: collapse;
	margin-top: 12px;
	font-size: 14px;
}

.tier3-table th,
.tier3-table td {
	padding: 8px 12px;
	text-align: left;
	border-bottom: 1px solid var(--border);
}

.tier3-table th {
	font-weight: 600;
	color: var(--text-secondary);
	font-size: 12px;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.tier3-table tr:hover {
	background: var(--surface);
}

.ttid-good { color: var(--good); }
.ttid-warn { color: var(--needs-work); }
.ttid-slow { color: var(--poor); }

.bridge-card {
	background: var(--surface);
	border: 1px solid var(--border);
	border-radius: 12px;
	padding: 20px;
	margin-top: 12px;
}

.bridge-stat {
	font-size: 28px;
	font-weight: 700;
	margin-bottom: 8px;
}

.bridge-modules {
	font-size: 14px;
	color: var(--text-secondary);
}

.layout-warning {
	background: rgba(255, 164, 0, 0.08);
	border: 1px solid var(--needs-work);
	border-radius: 8px;
	padding: 12px 16px;
	margin-top: 8px;
	font-size: 14px;
}
`;
}

function renderGaugeSvg(score: number, color: string): string {
	const radius = 66;
	const circumference = 2 * Math.PI * radius;
	const clamped = Math.max(0, Math.min(100, score));
	const offset = circumference - (clamped / 100) * circumference;

	return `<svg viewBox="0 0 160 160">
	<circle cx="80" cy="80" r="${radius}"
		fill="none" stroke="var(--gauge-bg)" stroke-width="8" />
	<circle cx="80" cy="80" r="${radius}"
		fill="none" stroke="${color}" stroke-width="8"
		stroke-dasharray="${circumference}"
		stroke-dashoffset="${offset}"
		stroke-linecap="round"
		transform="rotate(-90 80 80)" />
</svg>`;
}

function renderSparklineSvg(samples: MetricSample[], color: string): string {
	if (samples.length === 0) {
		return `<svg viewBox="0 0 200 50">
	<text x="100" y="30" text-anchor="middle"
		fill="var(--text-secondary)" font-size="11">
		No sample data
	</text>
</svg>`;
	}

	const values = samples.map((s) => s.value);
	const min = Math.min(...values);
	const max = Math.max(...values);
	const range = max - min || 1;
	const width = 200;
	const height = 50;
	const padding = 4;

	const points = values.map((v, i) => {
		const x = (i / Math.max(1, values.length - 1)) * (width - 2 * padding) + padding;
		const y = height - padding - ((v - min) / range) * (height - 2 * padding);
		return `${x.toFixed(1)},${y.toFixed(1)}`;
	});

	return `<svg viewBox="0 0 ${width} ${height}">
	<polyline points="${points.join(" ")}"
		fill="none" stroke="${color}" stroke-width="1.5"
		stroke-linejoin="round" stroke-linecap="round" />
</svg>`;
}

function renderDeviceInfo(session: MeasurementSession): string {
	const d = session.device;
	return `<div class="device-info">
	<span><strong>Device:</strong> ${escapeHtml(d.name)}</span>
	<span><strong>Platform:</strong> ${escapeHtml(session.platform)}</span>
	<span><strong>Type:</strong> ${escapeHtml(d.type)}</span>
	<span><strong>Duration:</strong> ${session.duration}s</span>
</div>`;
}

function renderMetricCards(
	score: ScoreResult,
	samplesByType: Map<MetricType, MetricSample[]>,
): string {
	const cards = score.perMetric.map((metric, index) => {
		const color = categoryColor(metric.category);
		const samples = samplesByType.get(metric.type) ?? [];
		const sparkline = renderSparklineSvg(samples, color);
		const label = metricLabel(metric.type);
		const value = formatMetricValue(metric.type, metric.value);
		const cat = categoryLabel(metric.category);

		return `<div class="metric-card" data-metric-index="${index}">
	<div class="metric-card-header">
		<span class="metric-name">${escapeHtml(label)}</span>
		<span class="metric-badge" style="background:${color}">
			${escapeHtml(cat)}
		</span>
	</div>
	<div class="metric-value" style="color:${color}">
		${escapeHtml(value)}
	</div>
	<div class="score-bar-container">
		<div class="score-bar-fill"
			style="width:${metric.score}%;background:${color}">
		</div>
	</div>
	<div class="metric-score-label">
		Score: ${metric.score} / 100
	</div>
	<div class="expand-hint">Click to expand</div>
	<div class="metric-detail" id="detail-${index}">
		<div class="sparkline-container">${sparkline}</div>
		<div class="metric-score-label">
			${samples.length} samples collected
		</div>
	</div>
</div>`;
	});

	return `<div class="metrics-grid">${cards.join("\n")}</div>`;
}

function renderComparisonSection(comparison: ComparisonResult): string {
	const bannerClass = comparison.hasRegression ? "has-regression" : "no-regression";
	const bannerText = comparison.hasRegression
		? `${comparison.regressionCount} regression${comparison.regressionCount > 1 ? "s" : ""} detected`
		: "No regressions detected";

	const deltaCards = comparison.deltas.map((delta) => {
		const label = metricLabel(delta.type);
		const prev = formatMetricValue(delta.type, delta.previous);
		const curr = formatMetricValue(delta.type, delta.current);
		const statusClass = `delta-${delta.status}`;
		const sign = delta.delta > 0 ? "+" : "";
		let arrow = "";
		if (delta.status === "improved") arrow = "&#9650;";
		if (delta.status === "regressed") arrow = "&#9660;";
		if (delta.status === "unchanged") arrow = "&#8212;";

		return `<div class="delta-card">
	<div>
		<div class="delta-label">${escapeHtml(label)}</div>
		<div class="delta-values">
			${escapeHtml(prev)} &rarr; ${escapeHtml(curr)}
		</div>
	</div>
	<div class="delta-indicator ${statusClass}">
		<div class="delta-arrow">${arrow}</div>
		<div class="delta-score">${sign}${delta.delta}</div>
	</div>
</div>`;
	});

	return `<div class="comparison-section">
	<h2 class="section-title">Comparison</h2>
	<div class="regression-banner ${bannerClass}">
		${escapeHtml(bannerText)}
	</div>
	<div class="comparison-grid">${deltaCards.join("\n")}</div>
</div>`;
}

function ttidColorClass(ttid: number): string {
	if (ttid <= 300) return "ttid-good";
	if (ttid <= 500) return "ttid-warn";
	return "ttid-slow";
}

function renderNavigationSection(nav: NavigationTimelineData): string {
	const avgTtid = nav.averageTTID !== null ? `${Math.round(nav.averageTTID)}ms` : "N/A";

	const rows = nav.screens.map((screen) => {
		const ttid = screen.ttid !== undefined ? screen.ttid : null;
		const ttidStr = ttid !== null ? `${Math.round(ttid)}ms` : "N/A";
		const ttidClass = ttid !== null ? ttidColorClass(ttid) : "";
		const render =
			screen.renderDuration !== undefined ? `${Math.round(screen.renderDuration)}ms` : "N/A";
		const time =
			screen.timeOnScreen !== undefined ? `${(screen.timeOnScreen / 1000).toFixed(1)}s` : "N/A";

		return `<tr>
	<td>${escapeHtml(screen.screenName)}</td>
	<td class="${ttidClass}">${escapeHtml(ttidStr)}</td>
	<td>${escapeHtml(render)}</td>
	<td>${escapeHtml(time)}</td>
</tr>`;
	});

	return `<div class="tier3-section">
	<h2 class="section-title">Navigation Timeline</h2>
	<div style="font-size:14px;color:var(--text-secondary);margin-bottom:8px">
		${nav.screens.length} screens &middot; avg TTID ${escapeHtml(avgTtid)}
	</div>
	<table class="tier3-table">
		<thead>
			<tr><th>Screen</th><th>TTID</th><th>Render</th><th>Time</th></tr>
		</thead>
		<tbody>${rows.join("\n")}</tbody>
	</table>
</div>`;
}

function renderNetworkSection(requests: NetworkRequestData[]): string {
	const rows = requests.map((req) => {
		const dur = req.duration !== undefined ? `${Math.round(req.duration)}ms` : "N/A";
		const status = req.status !== undefined ? `${req.status}` : "N/A";

		return `<tr>
	<td>${escapeHtml(req.url)}</td>
	<td>${escapeHtml(req.method.toUpperCase())}</td>
	<td>${escapeHtml(status)}</td>
	<td>${escapeHtml(dur)}</td>
</tr>`;
	});

	return `<div class="tier3-section">
	<h2 class="section-title">Network Requests</h2>
	<div style="font-size:14px;color:var(--text-secondary);margin-bottom:8px">
		${requests.length} requests
	</div>
	<table class="tier3-table">
		<thead>
			<tr><th>URL</th><th>Method</th><th>Status</th><th>Duration</th></tr>
		</thead>
		<tbody>${rows.join("\n")}</tbody>
	</table>
</div>`;
}

function renderBridgeSection(bridge: MeasurementSession["bridgeStats"]): string {
	if (!bridge) return "";

	const modules =
		bridge.topModules.length > 0
			? bridge.topModules.map((m) => `${escapeHtml(m.module)} (${m.count})`).join(", ")
			: "None tracked";

	return `<div class="tier3-section">
	<h2 class="section-title">Bridge Stats</h2>
	<div class="bridge-card">
		<div class="bridge-stat">${bridge.callsPerSecond.toFixed(0)} calls/sec</div>
		<div class="bridge-modules">
			<strong>Total calls:</strong> ${bridge.totalCalls}<br>
			<strong>Top modules:</strong> ${modules}
		</div>
	</div>
</div>`;
}

function renderLayoutSection(layoutStats: MeasurementSession["layoutStats"]): string {
	if (!layoutStats) return "";

	const excessive = layoutStats.componentsWithExcessiveLayouts;
	if (excessive.length === 0) return "";

	const items = excessive
		.map((c) => `<div class="layout-warning">${escapeHtml(c.name)}: ${c.count} layout passes</div>`)
		.join("\n");

	return `<div class="tier3-section">
	<h2 class="section-title">Layout Warnings</h2>
	<div style="font-size:14px;color:var(--text-secondary);margin-bottom:8px">
		${layoutStats.totalLayoutEvents} total layout events &middot;
		avg ${layoutStats.averageLayoutsPerComponent.toFixed(1)} per component
	</div>
	${items}
</div>`;
}

function renderScript(): string {
	return `
document.querySelectorAll('.metric-card').forEach(function(card) {
	card.addEventListener('click', function() {
		var index = card.getAttribute('data-metric-index');
		var detail = document.getElementById('detail-' + index);
		if (!detail) return;
		var hint = card.querySelector('.expand-hint');
		if (detail.classList.contains('open')) {
			detail.classList.remove('open');
			if (hint) hint.textContent = 'Click to expand';
		} else {
			detail.classList.add('open');
			if (hint) hint.textContent = 'Click to collapse';
		}
	});
});
`;
}

function groupSamplesByType(samples: MetricSample[]): Map<MetricType, MetricSample[]> {
	const map = new Map<MetricType, MetricSample[]>();
	for (const sample of samples) {
		const existing = map.get(sample.type);
		if (existing) {
			existing.push(sample);
		} else {
			map.set(sample.type, [sample]);
		}
	}
	return map;
}

/**
 * Generate a standalone HTML report from measurement data.
 * Returns a complete HTML string with all CSS and JS inlined.
 */
export function renderHtmlReport(
	session: MeasurementSession,
	score: ScoreResult,
	comparison?: ComparisonResult,
): string {
	const timestamp = new Date(session.startedAt).toISOString();
	const gaugeColor = categoryColor(score.category);
	const samplesByType = groupSamplesByType(session.samples);

	const comparisonHtml = comparison ? renderComparisonSection(comparison) : "";
	const navigationHtml = session.navigationTimeline
		? renderNavigationSection(session.navigationTimeline)
		: "";
	const networkHtml =
		session.networkRequests && session.networkRequests.length > 0
			? renderNetworkSection(session.networkRequests)
			: "";
	const bridgeHtml = session.bridgeStats ? renderBridgeSection(session.bridgeStats) : "";
	const layoutHtml = session.layoutStats ? renderLayoutSection(session.layoutStats) : "";

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lanterna Performance Report</title>
<style>${renderCss()}</style>
</head>
<body>

<div class="header">
	<h1>Lanterna Performance Report</h1>
	<div class="timestamp">Generated ${escapeHtml(timestamp)}</div>
</div>

<div class="gauge-section">
	<div class="gauge-container">
		${renderGaugeSvg(score.overall, gaugeColor)}
		<div class="gauge-label">
			<div class="gauge-score" style="color:${gaugeColor}">
				${score.overall}
			</div>
			<div class="gauge-category" style="color:${gaugeColor}">
				${escapeHtml(categoryLabel(score.category))}
			</div>
		</div>
	</div>
</div>

${renderDeviceInfo(session)}

<h2 class="section-title">Metrics</h2>
${renderMetricCards(score, samplesByType)}

${navigationHtml}
${networkHtml}
${bridgeHtml}
${layoutHtml}

${comparisonHtml}

<div class="footer">
	Lanterna v0.0.1 &mdash; Performance profiler for React Native
</div>

<script>${renderScript()}</script>
</body>
</html>`;
}

/**
 * Write an HTML report to disk.
 */
export async function exportHtml(
	session: MeasurementSession,
	score: ScoreResult,
	filePath: string,
	comparison?: ComparisonResult,
): Promise<void> {
	const html = renderHtmlReport(session, score, comparison);
	await Bun.write(filePath, html);
}
