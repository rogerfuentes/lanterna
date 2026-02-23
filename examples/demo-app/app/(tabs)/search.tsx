/**
 * SearchScreen — Debounced text input with excessive bridge calls.
 *
 * PERF ISSUES (intentional):
 * 1. No debouncing on TextInput — every keystroke triggers a state update,
 *    an API call, and bridge traffic from the native text input events.
 * 2. No AbortController — previous search requests aren't cancelled, causing
 *    stale results to overwrite newer ones (race condition).
 * 3. Entire results list re-renders on every keystroke because items aren't
 *    memoized and the key includes the query string.
 *
 * Lanterna should detect: high bridge traffic (rapid TextInput onChange),
 * excessive-network (many concurrent requests), excessive re-renders.
 */

import { Profiler, useEffect, useState } from "react";
import {
	FlatList,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { useLanterna } from "@lanternajs/react-native";

import { searchItems, type SearchResult } from "@/lib/api";

export default function SearchScreen() {
	const { marks, profiler, layoutTracker, bridgeTracker } = useLanterna();
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [searchCount, setSearchCount] = useState(0);

	useEffect(() => {
		marks.mark("search:mount");
	}, []);

	// PERF ISSUE: No debounce — fires on every single keystroke
	const handleChangeText = (text: string) => {
		setQuery(text);

		// Manually record bridge call to simulate high-frequency native events
		bridgeTracker.recordCall({
			module: "TextInput",
			method: "onChange",
			timestamp: Date.now(),
			duration: 1,
		});

		// PERF ISSUE: No AbortController — stale requests can overwrite newer results
		marks.mark(`search:query:${searchCount}`);
		setSearchCount((c) => c + 1);

		searchItems(text).then((data) => {
			setResults(data);
		});
	};

	return (
		<Profiler
			id="SearchScreen"
			onRender={profiler.createOnRender("SearchScreen")}
		>
			<View
				style={styles.container}
				onLayout={(e) =>
					layoutTracker.trackLayout("SearchContainer", e.nativeEvent.layout)
				}
			>
				<View style={styles.searchBar}>
					<TextInput
						style={styles.input}
						placeholder="Search anything..."
						placeholderTextColor="#999"
						value={query}
						onChangeText={handleChangeText}
						autoCorrect={false}
					/>
					{searchCount > 0 && (
						<Text style={styles.searchCount}>
							{searchCount} searches fired
						</Text>
					)}
				</View>

				<FlatList
					data={results}
					// PERF ISSUE: Key includes query — forces full remount on every keystroke
					keyExtractor={(item) => `${query}-${item.id}`}
					renderItem={({ item }) => <SearchResultRow item={item} />}
					ListEmptyComponent={
						<View style={styles.empty}>
							<Text style={styles.emptyText}>
								{query
									? "Searching..."
									: "Type to search — notice the bridge traffic!"}
							</Text>
						</View>
					}
				/>
			</View>
		</Profiler>
	);
}

/** Not memoized — re-renders on every parent state change. */
function SearchResultRow({ item }: { item: SearchResult }) {
	return (
		<View style={styles.resultRow}>
			<View style={styles.resultContent}>
				<Text style={styles.resultTitle}>{item.title}</Text>
				<Text style={styles.resultCategory}>{item.category}</Text>
			</View>
			<View style={styles.relevanceBadge}>
				<Text style={styles.relevanceText}>
					{Math.round(item.relevance * 100)}%
				</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f8f9fa",
	},
	searchBar: {
		padding: 16,
		backgroundColor: "#fff",
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#ddd",
	},
	input: {
		backgroundColor: "#f0f2f5",
		borderRadius: 10,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 16,
		color: "#1a1a2e",
	},
	searchCount: {
		fontSize: 12,
		color: "#e74c3c",
		marginTop: 6,
		fontWeight: "500",
	},
	empty: {
		padding: 40,
		alignItems: "center",
	},
	emptyText: {
		fontSize: 14,
		color: "#999",
		textAlign: "center",
	},
	resultRow: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#fff",
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#eee",
	},
	resultContent: {
		flex: 1,
	},
	resultTitle: {
		fontSize: 15,
		fontWeight: "500",
		color: "#1a1a2e",
	},
	resultCategory: {
		fontSize: 12,
		color: "#888",
		marginTop: 2,
	},
	relevanceBadge: {
		backgroundColor: "#e8f5e9",
		borderRadius: 12,
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	relevanceText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#4CAF50",
	},
});
