import { getDevToolsPluginClientAsync } from 'expo/devtools';

const GAUGE_RADIUS = 66;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;
const FPS_HISTORY_SIZE = 60;

const uiFpsHistory = [];
const jsFpsHistory = [];

function $(id) {
	return document.getElementById(id);
}

function categoryForScore(score) {
	if (score >= 75) return { label: 'Good', color: 'var(--good)' };
	if (score >= 50) return { label: 'Needs Work', color: 'var(--needs-work)' };
	return { label: 'Poor', color: 'var(--poor)' };
}

function updateGauge(score) {
	const clamped = Math.max(0, Math.min(100, score));
	const offset = GAUGE_CIRCUMFERENCE - (clamped / 100) * GAUGE_CIRCUMFERENCE;
	const arc = $('gauge-arc');
	const scoreEl = $('score-value');
	const catEl = $('score-category');
	const cat = categoryForScore(score);

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
	const canvas = $('fps-canvas');
	if (!canvas || !canvas.getContext) return;
	const ctx = canvas.getContext('2d');
	const w = canvas.width;
	const h = canvas.height;

	ctx.clearRect(0, 0, w, h);

	// 60 FPS reference line
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
		for (let i = 0; i < history.length; i++) {
			const x = (i / (FPS_HISTORY_SIZE - 1)) * w;
			const y = h - (history[i] / 65) * h;
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

function setConnected(connected) {
	const statusEl = $('connection-status');
	if (connected) {
		statusEl.textContent = 'Connected';
		statusEl.className = 'status connected';
	} else {
		statusEl.textContent = 'Disconnected';
		statusEl.className = 'status';
	}
}

function onMetrics(data) {
	if (!data || data.type !== 'metrics') return;
	const m = data.payload;
	if (!m) return;

	setConnected(true);

	// FPS
	if (m.fps) {
		$('ui-fps').textContent = Math.round(m.fps.ui);
		$('js-fps').textContent = Math.round(m.fps.js);
		$('dropped-frames').textContent = m.fps.droppedFrames;

		uiFpsHistory.push(m.fps.ui);
		jsFpsHistory.push(m.fps.js);
		if (uiFpsHistory.length > FPS_HISTORY_SIZE) uiFpsHistory.shift();
		if (jsFpsHistory.length > FPS_HISTORY_SIZE) jsFpsHistory.shift();
		drawFpsChart();
	}

	// CPU & Memory
	if (m.cpu != null) {
		const cpuPct = Math.min(100, Math.max(0, m.cpu));
		$('cpu-bar').style.width = cpuPct + '%';
		$('cpu-value').textContent = cpuPct.toFixed(1) + '%';
	}
	if (m.memory != null) {
		const memPct = Math.min(100, (m.memory / 512) * 100);
		$('memory-bar').style.width = memPct + '%';
		$('memory-value').textContent = Math.round(m.memory) + ' MB';
	}

	// Score
	if (m.score != null) {
		updateGauge(m.score);
	}

	// Navigation
	if (m.currentScreen) {
		$('current-screen').textContent = m.currentScreen;
	}
	if (m.screenMetrics) {
		$('ttid-value').textContent = formatMs(m.screenMetrics.ttid);
		$('render-duration').textContent = formatMs(m.screenMetrics.renderDuration);
		$('time-on-screen').textContent = formatMs(m.screenMetrics.timeOnScreen);
	}

	// Network
	if (m.networkSummary) {
		const ns = m.networkSummary;
		$('active-requests').textContent = ns.activeRequests;
		$('total-requests').textContent = ns.totalRequests;
		$('avg-duration').textContent = formatMs(ns.averageDuration);
	}

	// Bridge
	if (m.bridgeSummary) {
		const bs = m.bridgeSummary;
		$('bridge-calls-sec').textContent = Math.round(bs.callsPerSecond);
		$('bridge-total').textContent = bs.totalCalls;
		$('bridge-top-module').textContent = bs.topModule || '--';
	}
}

(async function () {
	const client = await getDevToolsPluginClientAsync(
		'lanterna-expo-devtools-plugin'
	);

	setConnected(true);

	client.addMessageListener('lanterna:metrics', (data) => {
		onMetrics(data);
	});

	// Send start command to the app
	client.sendMessage('lanterna:command', { command: 'start' });
})();
