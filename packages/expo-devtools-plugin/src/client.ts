import type { DevToolsMessage, DevToolsMetrics } from "./types";

export class DevToolsClient {
	private intervalId: ReturnType<typeof setInterval> | null = null;
	private listeners: Set<(msg: DevToolsMessage) => void> = new Set();
	private metrics: DevToolsMetrics = { timestamp: 0 };
	private sendFn: ((msg: DevToolsMessage) => void) | null = null;

	/**
	 * Update the current metrics snapshot.
	 * Called by the app to feed data from MetricCollector/NavigationTracker.
	 */
	updateMetrics(metrics: DevToolsMetrics): void {
		this.metrics = metrics;
	}

	/**
	 * Start sending metrics at the given interval.
	 * Calls onSend with each DevToolsMessage.
	 */
	start(intervalMs = 1000, onSend?: (msg: DevToolsMessage) => void): void {
		if (this.intervalId !== null) {
			return;
		}

		this.sendFn = onSend ?? null;

		this.intervalId = setInterval(() => {
			const message: DevToolsMessage = {
				type: "metrics",
				payload: this.metrics,
				timestamp: Date.now(),
			};

			if (this.sendFn) {
				this.sendFn(message);
			}

			for (const listener of this.listeners) {
				listener(message);
			}
		}, intervalMs);
	}

	/**
	 * Stop sending metrics.
	 */
	stop(): void {
		if (this.intervalId === null) {
			return;
		}

		clearInterval(this.intervalId);
		this.intervalId = null;
		this.sendFn = null;
	}

	/**
	 * Handle an incoming command from the browser (e.g., start/stop profiling).
	 */
	handleCommand(command: string, _payload?: unknown): void {
		switch (command) {
			case "start":
				this.start();
				break;
			case "stop":
				this.stop();
				break;
		}
	}

	/**
	 * Subscribe to outgoing messages (for testing).
	 */
	onMessage(listener: (msg: DevToolsMessage) => void): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	get isRunning(): boolean {
		return this.intervalId !== null;
	}

	get latestMetrics(): DevToolsMetrics {
		return this.metrics;
	}
}
