/**
 * ProfileScreen — Heavy component with sequential API waterfall.
 *
 * PERF ISSUES (intentional):
 * 1. Three API calls made SEQUENTIALLY on mount (~1.5s + 1.2s + 1.0s = ~3.7s).
 *    The correct pattern would be Promise.all() or parallel fetching.
 * 2. Slow TTI — screen shows loading spinner for ~3.7s before content appears.
 * 3. No skeleton UI — blank loading state causes perceived slowness.
 *
 * Lanterna should detect: slow TTI (>2s threshold), slow-screen-ttid heuristic,
 * excessive-network heuristic (3 slow sequential requests).
 */

import { Profiler, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Image,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { useLanterna } from "@lanternajs/react-native";

import {
	fetchFollowers,
	fetchProfile,
	fetchRecentPosts,
	type FeedItem,
	type ProfileData,
	type User,
} from "@/lib/api";

export default function ProfileScreen() {
	const { marks, profiler, layoutTracker, navigationTracker } = useLanterna();
	const [profileData, setProfileData] = useState<ProfileData | null>(null);
	const [followers, setFollowers] = useState<User[]>([]);
	const [recentPosts, setRecentPosts] = useState<FeedItem[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		marks.mark("profile:mount");
		loadProfileData();
	}, []);

	async function loadProfileData() {
		// PERF ISSUE: Sequential fetches — each waits for the previous to complete.
		// Total time: ~1500ms + ~1200ms + ~1000ms = ~3700ms
		// Fix would be: Promise.all([fetchProfile(), fetchFollowers(), fetchRecentPosts()])

		const profile = await fetchProfile(); // 1500ms
		setProfileData(profile);
		marks.mark("profile:profile-loaded");

		const followerList = await fetchFollowers(); // 1200ms
		setFollowers(followerList);
		marks.mark("profile:followers-loaded");

		const posts = await fetchRecentPosts(); // 1000ms
		setRecentPosts(posts);
		marks.mark("profile:posts-loaded");

		setLoading(false);
		marks.mark("profile:all-loaded");
		marks.measure("profile:total-load", "profile:mount", "profile:all-loaded");

		// Signal to Lanterna that screen is fully displayed
		navigationTracker.screenReady();
	}

	if (loading) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" />
				<Text style={styles.loadingText}>Loading profile...</Text>
				{profileData && (
					<Text style={styles.progressText}>Fetching followers...</Text>
				)}
				{followers.length > 0 && (
					<Text style={styles.progressText}>Fetching posts...</Text>
				)}
			</View>
		);
	}

	return (
		<Profiler
			id="ProfileScreen"
			onRender={profiler.createOnRender("ProfileScreen")}
		>
			<ScrollView
				style={styles.container}
				onLayout={(e) =>
					layoutTracker.trackLayout("ProfileContainer", e.nativeEvent.layout)
				}
			>
				{/* Profile header */}
				<View style={styles.header}>
					<Image
						source={{ uri: profileData!.user.avatar }}
						style={styles.avatar}
					/>
					<Text style={styles.name}>{profileData!.user.name}</Text>
					<Text style={styles.bio}>{profileData!.bio}</Text>
				</View>

				{/* Stats row */}
				<View style={styles.statsRow}>
					<StatItem label="Posts" value={profileData!.posts} />
					<StatItem label="Followers" value={profileData!.followers} />
					<StatItem label="Following" value={profileData!.following} />
				</View>

				{/* Followers preview */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>
						Followers ({followers.length})
					</Text>
					<ScrollView horizontal showsHorizontalScrollIndicator={false}>
						{followers.slice(0, 10).map((f) => (
							<View key={f.id} style={styles.followerChip}>
								<Image
									source={{ uri: f.avatar }}
									style={styles.followerAvatar}
								/>
								<Text style={styles.followerName} numberOfLines={1}>
									{f.name}
								</Text>
							</View>
						))}
					</ScrollView>
				</View>

				{/* Recent posts */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Recent Posts</Text>
					{recentPosts.map((post) => (
						<View key={post.id} style={styles.postCard}>
							<Text style={styles.postTitle}>{post.title}</Text>
							<Text style={styles.postBody} numberOfLines={2}>
								{post.body}
							</Text>
							<Text style={styles.postMeta}>{post.likes} likes</Text>
						</View>
					))}
				</View>
			</ScrollView>
		</Profiler>
	);
}

function StatItem({ label, value }: { label: string; value: number }) {
	return (
		<View style={styles.statItem}>
			<Text style={styles.statValue}>{value.toLocaleString()}</Text>
			<Text style={styles.statLabel}>{label}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f8f9fa",
	},
	centered: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	loadingText: {
		marginTop: 12,
		fontSize: 16,
		color: "#666",
	},
	progressText: {
		marginTop: 4,
		fontSize: 13,
		color: "#999",
	},
	header: {
		alignItems: "center",
		padding: 24,
		backgroundColor: "#fff",
	},
	avatar: {
		width: 96,
		height: 96,
		borderRadius: 48,
		marginBottom: 12,
		backgroundColor: "#e0e0e0",
	},
	name: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#1a1a2e",
	},
	bio: {
		fontSize: 14,
		color: "#666",
		marginTop: 4,
		textAlign: "center",
	},
	statsRow: {
		flexDirection: "row",
		justifyContent: "space-around",
		backgroundColor: "#fff",
		paddingVertical: 16,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: "#eee",
	},
	statItem: {
		alignItems: "center",
	},
	statValue: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#1a1a2e",
	},
	statLabel: {
		fontSize: 13,
		color: "#888",
		marginTop: 2,
	},
	section: {
		padding: 16,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#1a1a2e",
		marginBottom: 12,
	},
	followerChip: {
		alignItems: "center",
		marginRight: 16,
		width: 64,
	},
	followerAvatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: "#e0e0e0",
	},
	followerName: {
		fontSize: 11,
		color: "#666",
		marginTop: 4,
		textAlign: "center",
	},
	postCard: {
		backgroundColor: "#fff",
		borderRadius: 10,
		padding: 14,
		marginBottom: 10,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.06,
		shadowRadius: 2,
		elevation: 1,
	},
	postTitle: {
		fontSize: 15,
		fontWeight: "600",
		color: "#1a1a2e",
	},
	postBody: {
		fontSize: 13,
		color: "#666",
		marginTop: 4,
	},
	postMeta: {
		fontSize: 12,
		color: "#999",
		marginTop: 8,
	},
});
