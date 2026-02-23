/**
 * SettingsScreen — Clean, well-optimized screen.
 *
 * PERF: No intentional issues. This screen uses proper patterns:
 * - StyleSheet.create for all styles
 * - Simple state, no heavy computation
 * - Memoized callbacks
 * Lanterna should report "good" scores for this screen.
 */

import { Profiler, useCallback, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useLanterna } from "@lanternajs/react-native";

interface Setting {
	id: string;
	label: string;
	description: string;
}

const SETTINGS: Setting[] = [
	{
		id: "notifications",
		label: "Push Notifications",
		description: "Receive alerts for new posts and messages",
	},
	{
		id: "darkMode",
		label: "Dark Mode",
		description: "Use dark color scheme throughout the app",
	},
	{
		id: "analytics",
		label: "Usage Analytics",
		description: "Help improve the app by sharing anonymous usage data",
	},
	{
		id: "autoPlay",
		label: "Auto-play Videos",
		description: "Automatically play videos in the feed",
	},
	{
		id: "compression",
		label: "Data Saver",
		description: "Reduce data usage by compressing images",
	},
];

export default function SettingsScreen() {
	const { marks, profiler, layoutTracker } = useLanterna();
	const [values, setValues] = useState<Record<string, boolean>>({
		notifications: true,
		darkMode: false,
		analytics: true,
		autoPlay: false,
		compression: false,
	});

	const handleToggle = useCallback((id: string) => {
		marks.mark(`settings:toggle:${id}`);
		setValues((prev) => ({ ...prev, [id]: !prev[id] }));
	}, []);

	return (
		<Profiler
			id="SettingsScreen"
			onRender={profiler.createOnRender("SettingsScreen")}
		>
			<ScrollView
				style={styles.container}
				onLayout={(e) =>
					layoutTracker.trackLayout("SettingsContainer", e.nativeEvent.layout)
				}
			>
				<Text style={styles.header}>Preferences</Text>

				{SETTINGS.map((setting) => (
					<View key={setting.id} style={styles.row}>
						<View style={styles.rowText}>
							<Text style={styles.label}>{setting.label}</Text>
							<Text style={styles.description}>{setting.description}</Text>
						</View>
						<Switch
							value={values[setting.id]}
							onValueChange={() => handleToggle(setting.id)}
							trackColor={{ false: "#ddd", true: "#4CAF50" }}
						/>
					</View>
				))}

				<View style={styles.footer}>
					<Text style={styles.footerText}>Lanterna Demo v1.0.0</Text>
					<Text style={styles.footerText}>
						This screen is intentionally well-optimized.
					</Text>
				</View>
			</ScrollView>
		</Profiler>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f8f9fa",
	},
	header: {
		fontSize: 22,
		fontWeight: "bold",
		padding: 20,
		paddingBottom: 8,
		color: "#1a1a2e",
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#fff",
		paddingHorizontal: 20,
		paddingVertical: 14,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#eee",
	},
	rowText: {
		flex: 1,
		marginRight: 12,
	},
	label: {
		fontSize: 16,
		fontWeight: "500",
		color: "#1a1a2e",
	},
	description: {
		fontSize: 13,
		color: "#888",
		marginTop: 2,
	},
	footer: {
		padding: 24,
		alignItems: "center",
	},
	footerText: {
		fontSize: 13,
		color: "#bbb",
		marginTop: 4,
	},
});
