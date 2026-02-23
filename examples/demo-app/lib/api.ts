/**
 * API layer using real public endpoints so the NetworkInterceptor captures
 * actual fetch calls. Uses JSONPlaceholder (free, no auth) + randomuser.me.
 * Delays are added on top of real network latency where needed.
 */

export interface User {
	id: string;
	name: string;
	email: string;
	avatar: string;
}

export interface FeedItem {
	id: string;
	title: string;
	body: string;
	author: string;
	timestamp: number;
	likes: number;
}

export interface ProfileData {
	user: User;
	bio: string;
	followers: number;
	following: number;
	posts: number;
	joinedAt: string;
}

export interface SearchResult {
	id: string;
	title: string;
	category: string;
	relevance: number;
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fast response — real fetch to JSONPlaceholder (~200ms). */
export async function fetchUser(): Promise<User> {
	try {
		const res = await fetch("https://jsonplaceholder.typicode.com/users/1");
		const data = await res.json();
		return {
			id: String(data.id),
			name: data.name,
			email: data.email,
			avatar: `https://i.pravatar.cc/150?u=${data.email}`,
		};
	} catch {
		return {
			id: "user-1",
			name: "Alex Johnson",
			email: "alex@example.com",
			avatar: "https://i.pravatar.cc/150?u=alex",
		};
	}
}

/** Medium response — fetches 100 posts from JSONPlaceholder. */
export async function fetchFeed(): Promise<FeedItem[]> {
	try {
		const res = await fetch("https://jsonplaceholder.typicode.com/posts");
		const data: any[] = await res.json();
		return data.map((post, i) => ({
			id: String(post.id),
			title: post.title,
			body: post.body,
			author: NAMES[i % NAMES.length],
			timestamp: Date.now() - i * 3600_000,
			likes: Math.floor(Math.random() * 500),
		}));
	} catch {
		return Array.from({ length: 100 }, (_, i) => ({
			id: `feed-${i}`,
			title: `Post #${i + 1}`,
			body: "Fallback content.",
			author: NAMES[i % NAMES.length],
			timestamp: Date.now() - i * 3600_000,
			likes: Math.floor(Math.random() * 500),
		}));
	}
}

/**
 * Intentionally slow — 3 sequential fetches to simulate a waterfall.
 * ProfileScreen calls this once, but internally it makes 3 requests.
 */
export async function fetchProfile(): Promise<ProfileData> {
	try {
		// Three sequential requests — intentionally not parallelized
		const userRes = await fetch("https://jsonplaceholder.typicode.com/users/1");
		const userData = await userRes.json();

		const postsRes = await fetch("https://jsonplaceholder.typicode.com/posts?userId=1");
		const postsData = await postsRes.json();

		const todosRes = await fetch("https://jsonplaceholder.typicode.com/todos?userId=1");
		await todosRes.json();

		return {
			user: {
				id: String(userData.id),
				name: userData.name,
				email: userData.email,
				avatar: `https://i.pravatar.cc/150?u=${userData.email}`,
			},
			bio: userData.company?.catchPhrase ?? "React Native developer.",
			followers: 1_234,
			following: 567,
			posts: postsData.length,
			joinedAt: "2023-06-15",
		};
	} catch {
		await delay(1500);
		return {
			user: { id: "user-1", name: "Alex Johnson", email: "alex@example.com", avatar: "" },
			bio: "React Native developer.",
			followers: 1_234,
			following: 567,
			posts: 89,
			joinedAt: "2023-06-15",
		};
	}
}

/** Fetches followers — real users from JSONPlaceholder. */
export async function fetchFollowers(): Promise<User[]> {
	try {
		const res = await fetch("https://jsonplaceholder.typicode.com/users");
		const data: any[] = await res.json();
		return data.map((u) => ({
			id: String(u.id),
			name: u.name,
			email: u.email,
			avatar: `https://i.pravatar.cc/150?u=${u.email}`,
		}));
	} catch {
		return Array.from({ length: 10 }, (_, i) => ({
			id: `follower-${i}`,
			name: NAMES[i % NAMES.length],
			email: `user${i}@example.com`,
			avatar: `https://i.pravatar.cc/150?u=follower-${i}`,
		}));
	}
}

/** Fetches recent posts — comments from JSONPlaceholder. */
export async function fetchRecentPosts(): Promise<FeedItem[]> {
	try {
		const res = await fetch("https://jsonplaceholder.typicode.com/posts?_limit=10");
		const data: any[] = await res.json();
		return data.map((post, i) => ({
			id: String(post.id),
			title: post.title,
			body: post.body,
			author: "Alex Johnson",
			timestamp: Date.now() - i * 7200_000,
			likes: Math.floor(Math.random() * 200),
		}));
	} catch {
		return [];
	}
}

/** Search — fires a real fetch per keystroke (no debounce, intentionally). */
export async function searchItems(query: string): Promise<SearchResult[]> {
	if (!query.trim()) return [];
	try {
		const res = await fetch(
			`https://jsonplaceholder.typicode.com/posts?_limit=15&q=${encodeURIComponent(query)}`,
		);
		const data: any[] = await res.json();
		return data.map((post, i) => ({
			id: String(post.id),
			title: post.title,
			category: CATEGORIES[i % CATEGORIES.length],
			relevance: Math.round((1 - i * 0.05) * 100) / 100,
		}));
	} catch {
		return [];
	}
}

const NAMES = [
	"Jordan Lee",
	"Sam Rivera",
	"Taylor Kim",
	"Morgan Chen",
	"Casey Park",
	"Riley Patel",
	"Drew Martinez",
	"Quinn Foster",
	"Sage Williams",
	"Avery Brown",
];

const CATEGORIES = ["Article", "Tutorial", "Video", "Podcast", "Tool"];
