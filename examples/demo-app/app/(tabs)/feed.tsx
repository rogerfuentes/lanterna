/**
 * FeedScreen — Large FlatList with intentional performance issues.
 *
 * PERF ISSUES (intentional):
 * 1. No `getItemLayout` — forces FlatList to measure every item dynamically,
 *    causing expensive layout passes on scroll.
 * 2. State update on every render tick — the `refreshCount` state changes on
 *    pull-to-refresh and causes the entire list to re-render because items
 *    are not memoized and their keys change.
 * 3. Inline styles on each item — prevents StyleSheet optimization.
 *
 * Lanterna should detect: low UI FPS during scroll, excessive frame drops,
 * excessive layout events via LayoutTracker.
 */

import { Profiler, useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { useLanterna } from "@lanternajs/react-native";

import { fetchFeed, type FeedItem } from "@/lib/api";

export default function FeedScreen() {
	const { marks, profiler, layoutTracker } = useLanterna();
	const [items, setItems] = useState<FeedItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshCount, setRefreshCount] = useState(0);

	useEffect(() => {
		marks.mark("feed:mount");
		loadFeed();
	}, []);

	const loadFeed = useCallback(async () => {
		setLoading(true);
		const data = await fetchFeed();
		setItems(data);
		setLoading(false);
		marks.mark("feed:data-loaded");
		marks.measure("feed:load-time", "feed:mount", "feed:data-loaded");
	}, []);

	const handleRefresh = useCallback(() => {
		// PERF ISSUE: Incrementing refreshCount forces full re-render of list
		setRefreshCount((c) => c + 1);
		loadFeed();
	}, [loadFeed]);

	if (loading && items.length === 0) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" />
				<Text style={styles.loadingText}>Loading feed...</Text>
			</View>
		);
	}

	return (
		<Profiler id="FeedScreen" onRender={profiler.createOnRender("FeedScreen")}>
			<View
				style={styles.container}
				onLayout={(e) =>
					layoutTracker.trackLayout("FeedContainer", e.nativeEvent.layout)
				}
			>
				{/* PERF ISSUE: No getItemLayout prop — dynamic measurement on every item */}
				<FlatList
					data={items}
					keyExtractor={(item) => `${item.id}-${refreshCount}`}
					refreshing={loading}
					onRefresh={handleRefresh}
					renderItem={({ item }) => <FeedItemRow item={item} />}
				/>
			</View>
		</Profiler>
	);
}

/**
 * PERF ISSUE: Not wrapped in React.memo — re-renders on every parent state change.
 * Also uses inline styles that defeat StyleSheet caching.
 */
function FeedItemRow({ item }: { item: FeedItem }) {
	return (
		<View
			// PERF ISSUE: inline style — new object every render
			style={{
				backgroundColor: "#fff",
				padding: 16,
				marginHorizontal: 12,
				marginVertical: 6,
				borderRadius: 10,
				shadowColor: "#000",
				shadowOffset: { width: 0, height: 1 },
				shadowOpacity: 0.08,
				shadowRadius: 3,
				elevation: 2,
			}}
		>
			<Text style={{ fontSize: 16, fontWeight: "600", color: "#1a1a2e" }}>
				{item.title}
			</Text>
			<Text style={{ fontSize: 13, color: "#666", marginTop: 4 }} numberOfLines={2}>
				{item.body}
			</Text>
			<View
				style={{
					flexDirection: "row",
					justifyContent: "space-between",
					marginTop: 8,
				}}
			>
				<Text style={{ fontSize: 12, color: "#999" }}>{item.author}</Text>
				<Text style={{ fontSize: 12, color: "#999" }}>
					{item.likes} likes
				</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f0f2f5",
	},
	centered: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	loadingText: {
		marginTop: 12,
		fontSize: 14,
		color: "#666",
	},
});
