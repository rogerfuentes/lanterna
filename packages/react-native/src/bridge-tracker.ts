/** A single bridge/JSI call record. */
export interface BridgeCall {
	/** Native module name. */
	module: string;
	/** Method name invoked. */
	method: string;
	/** Timestamp when the call was made (ms since epoch). */
	timestamp: number;
	/** Duration of the call in ms (estimated for async), or undefined if not measured. */
	duration?: number;
}

/** Aggregated bridge call statistics. */
export interface BridgeStats {
	/** Average calls per second over the tracking window. */
	callsPerSecond: number;
	/** Total number of tracked calls. */
	totalCalls: number;
	/** Top modules sorted by call count (descending). */
	topModules: Array<{ module: string; count: number }>;
	/** Slowest calls sorted by duration (descending). */
	slowestCalls: BridgeCall[];
}

/**
 * Tracks bridge (old architecture) and JSI (new architecture) calls
 * in a React Native app.
 *
 * For the old architecture, uses the `MessageQueue.spy()` pattern.
 * For the new architecture (JSI), provides a wrapper-based approach
 * since there is no official JSI spy API.
 */
export class BridgeTracker {
	private calls: BridgeCall[] = [];
	private active = false;
	private startTime = 0;
	private spyInstalled = false;
	private originalSpy: unknown = null;

	/**
	 * Start tracking bridge calls.
	 * Installs a spy on MessageQueue if available (old architecture).
	 */
	start(): void {
		if (this.active) return;
		this.active = true;
		this.startTime = Date.now();
		this.installSpy();
	}

	/**
	 * Stop tracking bridge calls and remove the spy.
	 */
	stop(): void {
		if (!this.active) return;
		this.active = false;
		this.removeSpy();
	}

	/**
	 * Get aggregated bridge call statistics.
	 */
	getStats(): BridgeStats {
		const totalCalls = this.calls.length;
		const elapsedSeconds = this.active
			? (Date.now() - this.startTime) / 1000
			: this.calls.length > 0
				? (this.calls[this.calls.length - 1].timestamp - this.startTime) / 1000
				: 0;

		const callsPerSecond =
			elapsedSeconds > 0 ? Math.round((totalCalls / elapsedSeconds) * 10) / 10 : 0;

		// Aggregate calls by module
		const moduleCounts = new Map<string, number>();
		for (const call of this.calls) {
			moduleCounts.set(call.module, (moduleCounts.get(call.module) ?? 0) + 1);
		}

		const topModules = [...moduleCounts.entries()]
			.map(([module, count]) => ({ module, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		// Find slowest calls (only those with duration)
		const slowestCalls = [...this.calls]
			.filter((c) => c.duration !== undefined)
			.sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0))
			.slice(0, 10);

		return {
			callsPerSecond,
			totalCalls,
			topModules,
			slowestCalls,
		};
	}

	/**
	 * Get recent bridge calls, optionally limited.
	 */
	getRecentCalls(limit = 50): BridgeCall[] {
		if (limit >= this.calls.length) return [...this.calls];
		return this.calls.slice(-limit);
	}

	/**
	 * Manually record a bridge/JSI call.
	 * Use this for new architecture (JSI) calls that cannot be auto-detected.
	 */
	recordCall(call: BridgeCall): void {
		if (!this.active) return;
		this.calls.push(call);
	}

	/** Clear all tracked call data. */
	clear(): void {
		this.calls = [];
		if (this.active) {
			this.startTime = Date.now();
		}
	}

	private installSpy(): void {
		try {
			// Try to access the old-architecture MessageQueue
			// biome-ignore lint/suspicious/noExplicitAny: RN internals not typed
			const BatchedBridge = (globalThis as any).__fbBatchedBridge;
			if (BatchedBridge && typeof BatchedBridge.spy === "function") {
				// Save any existing spy
				this.originalSpy = BatchedBridge._spy ?? null;

				BatchedBridge.spy((info: { type: number; module?: string; method?: string }) => {
					if (!this.active) return;

					// type 0 = N->JS, type 1 = JS->N
					const moduleName = info.module ?? "unknown";
					const methodName = info.method ?? "unknown";

					this.calls.push({
						module: moduleName,
						method: methodName,
						timestamp: Date.now(),
					});
				});
				this.spyInstalled = true;
			}
		} catch {
			// MessageQueue not available — likely new architecture or non-RN environment
			this.spyInstalled = false;
		}
	}

	private removeSpy(): void {
		if (!this.spyInstalled) return;

		try {
			// biome-ignore lint/suspicious/noExplicitAny: RN internals not typed
			const BatchedBridge = (globalThis as any).__fbBatchedBridge;
			if (BatchedBridge && typeof BatchedBridge.spy === "function") {
				// Restore original spy or disable spying
				if (this.originalSpy && typeof this.originalSpy === "function") {
					BatchedBridge.spy(this.originalSpy);
				} else {
					BatchedBridge.spy(null);
				}
			}
		} catch {
			// Silently fail — cleanup is best-effort
		}

		this.spyInstalled = false;
		this.originalSpy = null;
	}
}
