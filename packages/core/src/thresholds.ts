import { MetricType } from "./types";

export interface MetricThreshold {
	good: number;
	poor: number;
	/** true = higher is better (FPS), false = lower is better (CPU, memory, TTI, frame drops) */
	higherIsBetter: boolean;
	unit: string;
}

export const METRIC_WEIGHTS: Record<MetricType, number> = {
	[MetricType.UI_FPS]: 0.25,
	[MetricType.JS_FPS]: 0.2,
	[MetricType.CPU]: 0.15,
	[MetricType.MEMORY]: 0.15,
	[MetricType.FRAME_DROPS]: 0.15,
	[MetricType.TTI]: 0.1,
};

export const METRIC_THRESHOLDS: Record<MetricType, MetricThreshold> = {
	[MetricType.UI_FPS]: { good: 57, poor: 45, higherIsBetter: true, unit: "fps" },
	[MetricType.JS_FPS]: { good: 57, poor: 45, higherIsBetter: true, unit: "fps" },
	[MetricType.CPU]: { good: 30, poor: 60, higherIsBetter: false, unit: "%" },
	[MetricType.MEMORY]: { good: 300, poor: 500, higherIsBetter: false, unit: "MB" },
	[MetricType.FRAME_DROPS]: { good: 5, poor: 15, higherIsBetter: false, unit: "%" },
	[MetricType.TTI]: { good: 2, poor: 4, higherIsBetter: false, unit: "s" },
};
