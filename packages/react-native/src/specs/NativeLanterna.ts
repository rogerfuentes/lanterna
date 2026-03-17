import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
	startProfiling(configJson: string): Promise<string>;
	stopProfiling(sessionId: string): Promise<string>;
	getMetrics(sessionId: string): Promise<string>;
	getFrameTimestamps(): Promise<string>;
	isProfilingActive(): Promise<boolean>;
	getActiveSessionId(): Promise<string | null>;
}

export default TurboModuleRegistry.get<Spec>("LanternaModule");
