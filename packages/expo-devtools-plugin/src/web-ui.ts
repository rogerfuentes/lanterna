/**
 * Generate the static HTML/CSS/JS for the dev tools browser dashboard.
 * This would be served by the Expo dev server's plugin system.
 *
 * The dashboard connects via the Expo plugin WebSocket and renders:
 * - Live score gauge
 * - FPS timeline graph (last 60s)
 * - CPU + memory charts
 * - Current screen + navigation timeline
 * - Network requests table
 * - Bridge stats
 */
export function generateDashboardHtml(): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lanterna Dev Tools</title>
<style>${renderCss()}</style>
</head>
<body>

<div class="header">
	<h1>Lanterna Dev Tools</h1>
	<div class="status" id="connection-status">Connecting...</div>
</div>

<div class="dashboard">
	<div class="gauge-section">
		<div class="gauge-container" id="score-gauge">
			${renderGaugeSvg(0)}
			<div class="gauge-label">
				<div class="gauge-score" id="score-value">--</div>
				<div class="gauge-category" id="score-category">Waiting</div>
			</div>
		</div>
	</div>

	<div class="panels">
		<div class="panel" id="fps-panel">
			<h2 class="panel-title">FPS</h2>
			<div class="fps-values">
				<div class="fps-stat">
					<span class="fps-label">UI</span>
					<span class="fps-number" id="ui-fps">--</span>
				</div>
				<div class="fps-stat">
					<span class="fps-label">JS</span>
					<span class="fps-number" id="js-fps">--</span>
				</div>
				<div class="fps-stat">
					<span class="fps-label">Dropped</span>
					<span class="fps-number fps-dropped" id="dropped-frames">--</span>
				</div>
			</div>
			<div class="chart-container" id="fps-chart">
				<canvas id="fps-canvas" width="400" height="120"></canvas>
			</div>
		</div>

		<div class="panel" id="cpu-memory-panel">
			<h2 class="panel-title">CPU &amp; Memory</h2>
			<div class="resource-grid">
				<div class="resource-item">
					<span class="resource-label">CPU</span>
					<div class="resource-bar">
						<div class="resource-bar-fill" id="cpu-bar" style="width:0%"></div>
					</div>
					<span class="resource-value" id="cpu-value">--%</span>
				</div>
				<div class="resource-item">
					<span class="resource-label">Memory</span>
					<div class="resource-bar">
						<div class="resource-bar-fill memory-bar" id="memory-bar" style="width:0%"></div>
					</div>
					<span class="resource-value" id="memory-value">-- MB</span>
				</div>
			</div>
		</div>

		<div class="panel" id="navigation-panel">
			<h2 class="panel-title">Navigation</h2>
			<div class="nav-current">
				<span class="nav-label">Current Screen</span>
				<span class="nav-screen" id="current-screen">--</span>
			</div>
			<div class="nav-metrics">
				<div class="nav-metric">
					<span class="nav-metric-label">TTID</span>
					<span class="nav-metric-value" id="ttid-value">--</span>
				</div>
				<div class="nav-metric">
					<span class="nav-metric-label">Render</span>
					<span class="nav-metric-value" id="render-duration">--</span>
				</div>
				<div class="nav-metric">
					<span class="nav-metric-label">Time on Screen</span>
					<span class="nav-metric-value" id="time-on-screen">--</span>
				</div>
			</div>
		</div>

		<div class="panel" id="network-panel">
			<h2 class="panel-title">Network</h2>
			<div class="network-summary">
				<div class="network-stat">
					<span class="network-stat-value" id="active-requests">0</span>
					<span class="network-stat-label">Active</span>
				</div>
				<div class="network-stat">
					<span class="network-stat-value" id="total-requests">0</span>
					<span class="network-stat-label">Total</span>
				</div>
				<div class="network-stat">
					<span class="network-stat-value" id="avg-duration">--</span>
					<span class="network-stat-label">Avg Duration</span>
				</div>
			</div>
			<div class="network-slowest" id="slowest-request"></div>
		</div>

		<div class="panel" id="bridge-panel">
			<h2 class="panel-title">Bridge</h2>
			<div class="bridge-stats">
				<div class="bridge-stat">
					<span class="bridge-stat-value" id="bridge-calls-sec">0</span>
					<span class="bridge-stat-label">calls/sec</span>
				</div>
				<div class="bridge-stat">
					<span class="bridge-stat-value" id="bridge-total">0</span>
					<span class="bridge-stat-label">Total Calls</span>
				</div>
				<div class="bridge-stat">
					<span class="bridge-stat-value" id="bridge-top-module">--</span>
					<span class="bridge-stat-label">Top Module</span>
				</div>
			</div>
		</div>
	</div>
</div>

<div class="footer">
	Lanterna v0.0.1 &mdash; Expo Dev Tools Plugin
</div>

<script>${renderScript()}</script>
</body>
</html>`;
}

function renderGaugeSvg(score: number): string {
	const radius = 66;
	const circumference = 2 * Math.PI * radius;
	const clamped = Math.max(0, Math.min(100, score));
	const offset = circumference - (clamped / 100) * circumference;

	return `<svg viewBox="0 0 160 160" id="gauge-svg">
	<circle cx="80" cy="80" r="${radius}"
		fill="none" stroke="var(--gauge-bg)" stroke-width="8" />
	<circle cx="80" cy="80" r="${radius}"
		fill="none" stroke="var(--good)" stroke-width="8"
		stroke-dasharray="${circumference}"
		stroke-dashoffset="${offset}"
		stroke-linecap="round"
		transform="rotate(-90 80 80)"
		id="gauge-arc" />
</svg>`;
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
	--accent: #6366f1;
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
	padding: 16px;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 24px;
	padding-bottom: 12px;
	border-bottom: 2px solid var(--border);
}

.header h1 {
	font-size: 20px;
	font-weight: 700;
}

.status {
	font-size: 12px;
	padding: 4px 12px;
	border-radius: 12px;
	background: var(--surface);
	color: var(--text-secondary);
}

.status.connected {
	background: rgba(12, 206, 107, 0.15);
	color: var(--good);
}

.dashboard {
	max-width: 1200px;
	margin: 0 auto;
}

.gauge-section {
	display: flex;
	justify-content: center;
	margin-bottom: 24px;
}

.gauge-container {
	position: relative;
	width: 140px;
	height: 140px;
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
	font-size: 36px;
	font-weight: 700;
	line-height: 1;
}

.gauge-category {
	font-size: 11px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	color: var(--text-secondary);
}

.panels {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
	gap: 16px;
}

.panel {
	background: var(--surface);
	border: 1px solid var(--border);
	border-radius: 12px;
	padding: 16px;
}

.panel-title {
	font-size: 14px;
	font-weight: 700;
	margin-bottom: 12px;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	color: var(--text-secondary);
}

.fps-values {
	display: flex;
	gap: 24px;
	margin-bottom: 12px;
}

.fps-stat {
	display: flex;
	flex-direction: column;
}

.fps-label {
	font-size: 11px;
	color: var(--text-secondary);
	text-transform: uppercase;
}

.fps-number {
	font-size: 28px;
	font-weight: 700;
	color: var(--good);
}

.fps-dropped {
	color: var(--poor);
}

.chart-container {
	width: 100%;
	height: 120px;
	position: relative;
}

.chart-container canvas {
	width: 100%;
	height: 100%;
}

.resource-grid {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.resource-item {
	display: flex;
	align-items: center;
	gap: 12px;
}

.resource-label {
	font-size: 13px;
	font-weight: 600;
	width: 60px;
}

.resource-bar {
	flex: 1;
	height: 8px;
	background: var(--gauge-bg);
	border-radius: 4px;
	overflow: hidden;
}

.resource-bar-fill {
	height: 100%;
	background: var(--accent);
	border-radius: 4px;
	transition: width 0.3s;
}

.resource-bar-fill.memory-bar {
	background: var(--needs-work);
}

.resource-value {
	font-size: 13px;
	font-weight: 600;
	width: 60px;
	text-align: right;
}

.nav-current {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12px;
	padding-bottom: 12px;
	border-bottom: 1px solid var(--border);
}

.nav-label {
	font-size: 12px;
	color: var(--text-secondary);
}

.nav-screen {
	font-size: 16px;
	font-weight: 700;
}

.nav-metrics {
	display: flex;
	gap: 16px;
}

.nav-metric {
	display: flex;
	flex-direction: column;
}

.nav-metric-label {
	font-size: 11px;
	color: var(--text-secondary);
	text-transform: uppercase;
}

.nav-metric-value {
	font-size: 18px;
	font-weight: 600;
}

.network-summary {
	display: flex;
	gap: 16px;
	margin-bottom: 12px;
}

.network-stat {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.network-stat-value {
	font-size: 24px;
	font-weight: 700;
}

.network-stat-label {
	font-size: 11px;
	color: var(--text-secondary);
	text-transform: uppercase;
}

.network-slowest {
	font-size: 12px;
	color: var(--text-secondary);
	padding-top: 8px;
	border-top: 1px solid var(--border);
	word-break: break-all;
}

.bridge-stats {
	display: flex;
	gap: 16px;
}

.bridge-stat {
	display: flex;
	flex-direction: column;
	align-items: center;
	flex: 1;
}

.bridge-stat-value {
	font-size: 24px;
	font-weight: 700;
}

.bridge-stat-label {
	font-size: 11px;
	color: var(--text-secondary);
	text-transform: uppercase;
}

.footer {
	text-align: center;
	font-size: 12px;
	color: var(--text-secondary);
	margin-top: 24px;
	padding-top: 12px;
	border-top: 1px solid var(--border);
}
`;
}

function renderScript(): string {
	return `
(function() {
	var GAUGE_RADIUS = 66;
	var GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;
	var FPS_HISTORY_SIZE = 60;

	var uiFpsHistory = [];
	var jsFpsHistory = [];

	function categoryForScore(score) {
		if (score >= 75) return { label: 'Good', color: 'var(--good)' };
		if (score >= 50) return { label: 'Needs Work', color: 'var(--needs-work)' };
		return { label: 'Poor', color: 'var(--poor)' };
	}

	function updateGauge(score) {
		var clamped = Math.max(0, Math.min(100, score));
		var offset = GAUGE_CIRCUMFERENCE - (clamped / 100) * GAUGE_CIRCUMFERENCE;
		var arc = document.getElementById('gauge-arc');
		var scoreEl = document.getElementById('score-value');
		var catEl = document.getElementById('score-category');
		var cat = categoryForScore(score);

		if (arc) {
			arc.setAttribute('stroke-dashoffset', offset);
			arc.setAttribute('stroke', cat.color);
		}
		if (scoreEl) {
			scoreEl.textContent = Math.round(score);
			scoreEl.style.color = cat.color;
		}
		if (catEl) {
			catEl.textContent = cat.label;
			catEl.style.color = cat.color;
		}
	}

	function drawFpsChart() {
		var canvas = document.getElementById('fps-canvas');
		if (!canvas || !canvas.getContext) return;
		var ctx = canvas.getContext('2d');
		var w = canvas.width;
		var h = canvas.height;

		ctx.clearRect(0, 0, w, h);

		// Draw 60 FPS reference line
		ctx.strokeStyle = 'rgba(107, 114, 128, 0.3)';
		ctx.setLineDash([4, 4]);
		ctx.beginPath();
		ctx.moveTo(0, h * (1 - 60 / 65));
		ctx.lineTo(w, h * (1 - 60 / 65));
		ctx.stroke();
		ctx.setLineDash([]);

		function drawLine(history, color) {
			if (history.length < 2) return;
			ctx.strokeStyle = color;
			ctx.lineWidth = 2;
			ctx.lineJoin = 'round';
			ctx.lineCap = 'round';
			ctx.beginPath();
			for (var i = 0; i < history.length; i++) {
				var x = (i / (FPS_HISTORY_SIZE - 1)) * w;
				var y = h - (history[i] / 65) * h;
				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.stroke();
		}

		drawLine(uiFpsHistory, '#0cce6b');
		drawLine(jsFpsHistory, '#6366f1');
	}

	function formatMs(ms) {
		if (ms == null) return '--';
		return ms.toFixed(0) + ' ms';
	}

	function onMessage(data) {
		if (!data || data.type !== 'metrics') return;
		var m = data.payload;
		if (!m) return;

		// FPS
		if (m.fps) {
			document.getElementById('ui-fps').textContent = Math.round(m.fps.ui);
			document.getElementById('js-fps').textContent = Math.round(m.fps.js);
			document.getElementById('dropped-frames').textContent = m.fps.droppedFrames;

			uiFpsHistory.push(m.fps.ui);
			jsFpsHistory.push(m.fps.js);
			if (uiFpsHistory.length > FPS_HISTORY_SIZE) uiFpsHistory.shift();
			if (jsFpsHistory.length > FPS_HISTORY_SIZE) jsFpsHistory.shift();
			drawFpsChart();
		}

		// CPU & Memory
		if (m.cpu != null) {
			var cpuPct = Math.min(100, Math.max(0, m.cpu));
			document.getElementById('cpu-bar').style.width = cpuPct + '%';
			document.getElementById('cpu-value').textContent = cpuPct.toFixed(1) + '%';
		}
		if (m.memory != null) {
			var memPct = Math.min(100, (m.memory / 512) * 100);
			document.getElementById('memory-bar').style.width = memPct + '%';
			document.getElementById('memory-value').textContent = Math.round(m.memory) + ' MB';
		}

		// Score
		if (m.score != null) {
			updateGauge(m.score);
		}

		// Navigation
		if (m.currentScreen) {
			document.getElementById('current-screen').textContent = m.currentScreen;
		}
		if (m.screenMetrics) {
			document.getElementById('ttid-value').textContent = formatMs(m.screenMetrics.ttid);
			document.getElementById('render-duration').textContent =
				formatMs(m.screenMetrics.renderDuration);
			document.getElementById('time-on-screen').textContent =
				formatMs(m.screenMetrics.timeOnScreen);
		}

		// Network
		if (m.networkSummary) {
			var ns = m.networkSummary;
			document.getElementById('active-requests').textContent = ns.activeRequests;
			document.getElementById('total-requests').textContent = ns.totalRequests;
			document.getElementById('avg-duration').textContent = formatMs(ns.averageDuration);

			var slowest = document.getElementById('slowest-request');
			if (ns.slowestUrl) {
				slowest.textContent = 'Slowest: ' + ns.slowestUrl +
					' (' + formatMs(ns.slowestDuration) + ')';
			} else {
				slowest.textContent = '';
			}
		}

		// Bridge
		if (m.bridgeSummary) {
			var bs = m.bridgeSummary;
			document.getElementById('bridge-calls-sec').textContent =
				Math.round(bs.callsPerSecond);
			document.getElementById('bridge-total').textContent = bs.totalCalls;
			document.getElementById('bridge-top-module').textContent =
				bs.topModule || '--';
		}
	}

	// Expose onMessage globally for the Expo plugin WebSocket integration
	window.__lanterna_onMessage = onMessage;

	// Connection status handling
	function setConnected(connected) {
		var statusEl = document.getElementById('connection-status');
		if (connected) {
			statusEl.textContent = 'Connected';
			statusEl.className = 'status connected';
		} else {
			statusEl.textContent = 'Disconnected';
			statusEl.className = 'status';
		}
	}

	window.__lanterna_setConnected = setConnected;
})();
`;
}
