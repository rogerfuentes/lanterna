/**
 * HomeScreen — Clean baseline.
 *
 * PERF: No intentional issues. This screen serves as a baseline to demonstrate
 * that Lanterna correctly reports "good" scores on well-optimized screens.
 */

import { Profiler, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLanterna } from "@lanternajs/react-native";

import { fetchUser, type User } from "@/lib/api";

export default function HomeScreen() {
	const { marks, profiler, layoutTracker } = useLanterna();
	const [user, setUser] = useState<User | null>(null);

	useEffect(() => {
		marks.mark("home:mount");
		fetchUser().then((data) => {
			setUser(data);
			marks.mark("home:data-loaded");
			marks.measure("home:load-time", "home:mount", "home:data-loaded");
		});
	}, []);

	return (
		<Profiler id="HomeScreen" onRender={profiler.createOnRender("HomeScreen")}>
			<View
				style={styles.container}
				onLayout={(e) =>
					layoutTracker.trackLayout("HomeContainer", e.nativeEvent.layout)
				}
			>
				<Text style={styles.title}>Lanterna Demo</Text>
				<Text style={styles.subtitle}>
					Performance Profiler for React Native
				</Text>

				{user ? (
					<View style={styles.card}>
						<Text style={styles.cardTitle}>Welcome, {user.name}</Text>
						<Text style={styles.cardText}>{user.email}</Text>
					</View>
				) : (
					<View style={styles.card}>
						<Text style={styles.cardText}>Loading...</Text>
					</View>
				)}

				<View style={styles.infoSection}>
					<Text style={styles.infoTitle}>About This App</Text>
					<Text style={styles.infoText}>
						This demo app has intentional performance issues on some screens so
						Lanterna has something real to detect. Navigate to each tab to see
						different performance patterns.
					</Text>
				</View>

				<View style={styles.legend}>
					<LegendItem icon="check" label="Home" desc="Clean baseline" />
					<LegendItem icon="slow" label="Feed" desc="FlatList re-renders" />
					<LegendItem
						icon="wait"
						label="Profile"
						desc="Sequential API waterfall"
					/>
					<LegendItem icon="check" label="Settings" desc="Clean baseline" />
					<LegendItem
						icon="chat"
						label="Search"
						desc="Excessive bridge calls"
					/>
				</View>
			</View>
		</Profiler>
	);
}

function LegendItem({
	icon,
	label,
	desc,
}: { icon: string; label: string; desc: string }) {
	const iconSymbols: Record<string, string> = {
		check: "[OK]",
		slow: "[!!]",
		wait: "[..]",
		chat: "[>>]",
	};
	return (
		<View style={styles.legendItem}>
			<Text style={styles.legendIcon}>{iconSymbols[icon] ?? icon}</Text>
			<View>
				<Text style={styles.legendLabel}>{label}</Text>
				<Text style={styles.legendDesc}>{desc}</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
		backgroundColor: "#f8f9fa",
	},
	title: {
		fontSize: 32,
		fontWeight: "bold",
		marginTop: 20,
		color: "#1a1a2e",
	},
	subtitle: {
		fontSize: 16,
		color: "#666",
		marginTop: 4,
		marginBottom: 24,
	},
	card: {
		backgroundColor: "#fff",
		borderRadius: 12,
		padding: 16,
		marginBottom: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#1a1a2e",
	},
	cardText: {
		fontSize: 14,
		color: "#666",
		marginTop: 4,
	},
	infoSection: {
		marginBottom: 20,
	},
	infoTitle: {
		fontSize: 18,
		fontWeight: "600",
		marginBottom: 8,
		color: "#1a1a2e",
	},
	infoText: {
		fontSize: 14,
		color: "#555",
		lineHeight: 20,
	},
	legend: {
		gap: 12,
	},
	legendItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	legendIcon: {
		fontSize: 14,
		fontWeight: "bold",
		width: 36,
		textAlign: "center",
		color: "#555",
	},
	legendLabel: {
		fontSize: 15,
		fontWeight: "600",
		color: "#1a1a2e",
	},
	legendDesc: {
		fontSize: 13,
		color: "#888",
	},
});
