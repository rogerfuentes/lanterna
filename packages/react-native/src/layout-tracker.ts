/** A single layout event for a component. */
export interface LayoutEvent {
	/** Component name that triggered the layout. */
	componentName: string;
	/** Timestamp when the layout event occurred (ms since epoch). */
	timestamp: number;
	/** Layout width in points. */
	width: number;
	/** Layout height in points. */
	height: number;
	/** Running count of layout passes for this component. */
	layoutPassCount: number;
}

/** Aggregated layout statistics. */
export interface LayoutStats {
	/** Total number of layout events tracked. */
	totalLayoutEvents: number;
	/** Components exceeding the layout threshold. */
	componentsWithExcessiveLayouts: Array<{ name: string; count: number }>;
	/** Average layout events per unique component. */
	averageLayoutsPerComponent: number;
}

/** Default threshold for excessive layout passes per component. */
const DEFAULT_EXCESSIVE_THRESHOLD = 3;

/**
 * Tracks `onLayout` events by component name and identifies
 * components with excessive layout recalculations.
 *
 * Can be used directly via `trackLayout()` or integrated with
 * a higher-order component / wrapper that captures onLayout callbacks.
 */
export class LayoutTracker {
	private events: LayoutEvent[] = [];
	private componentCounts = new Map<string, number>();
	private active = false;

	/**
	 * Start tracking layout events.
	 */
	start(): void {
		if (this.active) return;
		this.active = true;
	}

	/**
	 * Stop tracking layout events.
	 */
	stop(): void {
		if (!this.active) return;
		this.active = false;
	}

	/**
	 * Record a layout event for a component.
	 * Call this from an `onLayout` handler or a HOC/wrapper.
	 */
	trackLayout(componentName: string, event: { width: number; height: number }): void {
		if (!this.active) return;

		const count = (this.componentCounts.get(componentName) ?? 0) + 1;
		this.componentCounts.set(componentName, count);

		const layoutEvent: LayoutEvent = {
			componentName,
			timestamp: Date.now(),
			width: event.width,
			height: event.height,
			layoutPassCount: count,
		};

		this.events.push(layoutEvent);
	}

	/**
	 * Get aggregated layout statistics.
	 */
	getStats(): LayoutStats {
		const totalLayoutEvents = this.events.length;
		const uniqueComponents = this.componentCounts.size;
		const averageLayoutsPerComponent =
			uniqueComponents > 0 ? Math.round((totalLayoutEvents / uniqueComponents) * 100) / 100 : 0;

		const componentsWithExcessiveLayouts = this.getExcessiveLayouts();

		return {
			totalLayoutEvents,
			componentsWithExcessiveLayouts,
			averageLayoutsPerComponent,
		};
	}

	/**
	 * Get components with layout passes exceeding the given threshold.
	 * Sorted by count descending.
	 */
	getExcessiveLayouts(
		threshold = DEFAULT_EXCESSIVE_THRESHOLD,
	): Array<{ name: string; count: number }> {
		const excessive: Array<{ name: string; count: number }> = [];

		for (const [name, count] of this.componentCounts) {
			if (count > threshold) {
				excessive.push({ name, count });
			}
		}

		return excessive.sort((a, b) => b.count - a.count);
	}

	/** Clear all tracked layout data. */
	clear(): void {
		this.events = [];
		this.componentCounts.clear();
	}
}
