/** A custom performance mark. */
export interface PerformanceMark {
	name: string;
	timestamp: number;
	metadata?: Record<string, unknown>;
}

/** A custom performance measurement (span between two marks). */
export interface PerformanceMeasure {
	name: string;
	startMark: string;
	endMark: string;
	duration: number;
	startTime: number;
	endTime: number;
}

/**
 * Custom performance marks and measurements API.
 * Provides `mark()` and `measure()` similar to the Performance API.
 */
export class PerformanceMarks {
	private marks = new Map<string, PerformanceMark>();
	private measures: PerformanceMeasure[] = [];

	/**
	 * Create a performance mark at the current time.
	 * If a mark with the same name exists, it will be overwritten.
	 */
	mark(name: string, metadata?: Record<string, unknown>): PerformanceMark {
		const mark: PerformanceMark = {
			name,
			timestamp: Date.now(),
			metadata,
		};
		this.marks.set(name, mark);
		return mark;
	}

	/**
	 * Create a measurement between two marks.
	 * Returns null if either mark doesn't exist.
	 */
	measure(name: string, startMarkName: string, endMarkName: string): PerformanceMeasure | null {
		const startMark = this.marks.get(startMarkName);
		const endMark = this.marks.get(endMarkName);

		if (!startMark || !endMark) return null;

		const measurement: PerformanceMeasure = {
			name,
			startMark: startMarkName,
			endMark: endMarkName,
			duration: endMark.timestamp - startMark.timestamp,
			startTime: startMark.timestamp,
			endTime: endMark.timestamp,
		};

		this.measures.push(measurement);
		return measurement;
	}

	/** Get a mark by name. */
	getMark(name: string): PerformanceMark | null {
		return this.marks.get(name) ?? null;
	}

	/** Get all marks. */
	getMarks(): PerformanceMark[] {
		return [...this.marks.values()];
	}

	/** Get all measurements. */
	getMeasures(): PerformanceMeasure[] {
		return [...this.measures];
	}

	/** Get measurements by name. */
	getMeasuresByName(name: string): PerformanceMeasure[] {
		return this.measures.filter((m) => m.name === name);
	}

	/** Clear all marks and measurements. */
	clear(): void {
		this.marks.clear();
		this.measures = [];
	}
}
