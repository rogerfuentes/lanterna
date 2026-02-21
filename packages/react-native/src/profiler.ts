/** A recorded component render from React Profiler API. */
export interface ComponentRender {
	/** Component name (from Profiler id prop). */
	name: string;
	/** Render phase: "mount" or "update". */
	phase: "mount" | "update";
	/** Actual render duration in ms. */
	actualDuration: number;
	/** Base render duration (without memoization) in ms. */
	baseDuration: number;
	/** Timestamp when rendering started. */
	startTime: number;
	/** Timestamp when rendering committed. */
	commitTime: number;
}

/** Aggregated render stats for a component. */
export interface ComponentStats {
	name: string;
	renderCount: number;
	mountCount: number;
	updateCount: number;
	avgActualDuration: number;
	maxActualDuration: number;
	totalActualDuration: number;
	avgBaseDuration: number;
}

/**
 * In-memory store for React Profiler render data.
 * Collects onRender callbacks and aggregates stats.
 */
export class ProfilerBridge {
	private renders: ComponentRender[] = [];

	/**
	 * Record a component render.
	 * Called from React Profiler onRender callback.
	 */
	recordRender(render: ComponentRender): void {
		this.renders.push(render);
	}

	/**
	 * Create an onRender callback for use with React.Profiler.
	 * Returns a function compatible with the Profiler onRender prop.
	 */
	createOnRender(componentName: string) {
		return (
			_id: string,
			phase: "mount" | "update",
			actualDuration: number,
			baseDuration: number,
			startTime: number,
			commitTime: number,
		) => {
			this.recordRender({
				name: componentName,
				phase,
				actualDuration,
				baseDuration,
				startTime,
				commitTime,
			});
		};
	}

	/** Get all recorded renders. */
	getRenders(): ComponentRender[] {
		return [...this.renders];
	}

	/** Get renders for a specific component. */
	getRendersFor(name: string): ComponentRender[] {
		return this.renders.filter((r) => r.name === name);
	}

	/** Get aggregated stats per component. */
	getStats(): ComponentStats[] {
		const byComponent = new Map<string, ComponentRender[]>();

		for (const render of this.renders) {
			const existing = byComponent.get(render.name) ?? [];
			existing.push(render);
			byComponent.set(render.name, existing);
		}

		const stats: ComponentStats[] = [];
		for (const [name, renders] of byComponent) {
			const totalActual = renders.reduce((sum, r) => sum + r.actualDuration, 0);
			const totalBase = renders.reduce((sum, r) => sum + r.baseDuration, 0);
			const maxActual = renders.reduce((max, r) => Math.max(max, r.actualDuration), 0);

			stats.push({
				name,
				renderCount: renders.length,
				mountCount: renders.filter((r) => r.phase === "mount").length,
				updateCount: renders.filter((r) => r.phase === "update").length,
				avgActualDuration: Math.round((totalActual / renders.length) * 100) / 100,
				maxActualDuration: Math.round(maxActual * 100) / 100,
				totalActualDuration: Math.round(totalActual * 100) / 100,
				avgBaseDuration: Math.round((totalBase / renders.length) * 100) / 100,
			});
		}

		return stats.sort((a, b) => b.totalActualDuration - a.totalActualDuration);
	}

	/** Clear all recorded renders. */
	clear(): void {
		this.renders = [];
	}
}
