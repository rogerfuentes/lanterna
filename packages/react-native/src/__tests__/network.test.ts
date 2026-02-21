import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { NetworkInterceptor } from "../network";

/**
 * Set a mock fetch on globalThis.
 * Uses `any` to avoid Bun's strict `typeof fetch` which includes `preconnect`.
 */
// biome-ignore lint/suspicious/noExplicitAny: mock fetch for testing
function setMockFetch(fn: (...args: any[]) => Promise<Response>): void {
	// biome-ignore lint/suspicious/noExplicitAny: mock fetch for testing
	(globalThis as any).fetch = fn;
}

describe("NetworkInterceptor", () => {
	let interceptor: NetworkInterceptor;
	let originalFetch: typeof globalThis.fetch;

	beforeEach(() => {
		interceptor = new NetworkInterceptor();
		// Save the real fetch before each test
		originalFetch = globalThis.fetch;
	});

	afterEach(() => {
		interceptor.stop();
		// Ensure fetch is always restored
		globalThis.fetch = originalFetch;
	});

	test("patches and restores fetch", () => {
		const before = globalThis.fetch;
		interceptor.start();
		expect(globalThis.fetch).not.toBe(before);
		interceptor.stop();
		expect(globalThis.fetch).toBe(before);
	});

	test("start is idempotent", () => {
		interceptor.start();
		const patched = globalThis.fetch;
		interceptor.start();
		expect(globalThis.fetch).toBe(patched);
	});

	test("stop is idempotent", () => {
		interceptor.stop(); // should not throw
		interceptor.start();
		interceptor.stop();
		interceptor.stop(); // should not throw
		expect(globalThis.fetch).toBe(originalFetch);
	});

	test("captures request URL, method, status, and duration", async () => {
		const mockResponse = new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { "content-length": "11" },
		});
		setMockFetch(async () => mockResponse);

		interceptor.start();

		const response = await globalThis.fetch("https://api.example.com/data", {
			method: "POST",
		});

		expect(response).toBe(mockResponse);

		const requests = interceptor.getRequests();
		expect(requests).toHaveLength(1);

		const req = requests[0];
		expect(req.url).toBe("https://api.example.com/data");
		expect(req.method).toBe("POST");
		expect(req.status).toBe(200);
		expect(req.duration).toBeGreaterThanOrEqual(0);
		expect(req.endTime).toBeDefined();
		expect(req.responseSize).toBe(11);
		expect(req.error).toBeUndefined();

		interceptor.stop();
		globalThis.fetch = originalFetch;
	});

	test("handles fetch errors gracefully", async () => {
		setMockFetch(async () => {
			throw new Error("Network failure");
		});

		interceptor.start();

		let threw = false;
		try {
			await globalThis.fetch("https://api.example.com/fail");
		} catch (err) {
			threw = true;
			expect((err as Error).message).toBe("Network failure");
		}

		expect(threw).toBe(true);

		const requests = interceptor.getRequests();
		expect(requests).toHaveLength(1);
		expect(requests[0].error).toBe("Network failure");
		expect(requests[0].endTime).toBeDefined();
		expect(requests[0].duration).toBeGreaterThanOrEqual(0);

		interceptor.stop();
		globalThis.fetch = originalFetch;
	});

	test("tracks multiple concurrent requests independently", async () => {
		let callCount = 0;
		setMockFetch(async (input: RequestInfo | URL) => {
			callCount++;
			const url = typeof input === "string" ? input : String(input);
			return new Response(`response-${callCount}`, {
				status: url.includes("a") ? 200 : 404,
			});
		});

		interceptor.start();

		await Promise.all([
			globalThis.fetch("https://api.example.com/a"),
			globalThis.fetch("https://api.example.com/b"),
			globalThis.fetch("https://api.example.com/c"),
		]);

		const requests = interceptor.getRequests();
		expect(requests).toHaveLength(3);

		// Each request has a unique id
		const ids = new Set(requests.map((r) => r.id));
		expect(ids.size).toBe(3);

		// All completed
		for (const req of requests) {
			expect(req.endTime).toBeDefined();
			expect(req.duration).toBeGreaterThanOrEqual(0);
		}

		interceptor.stop();
		globalThis.fetch = originalFetch;
	});

	test("onRequest listener fires for start and completion", async () => {
		const events: Array<{ url: string; completed: boolean }> = [];

		setMockFetch(async () => new Response("ok", { status: 200 }));

		interceptor.start();
		interceptor.onRequest((req) => {
			events.push({ url: req.url, completed: req.endTime !== undefined });
		});

		await globalThis.fetch("https://api.example.com/test");

		// Should fire twice: once on start, once on completion
		expect(events).toHaveLength(2);
		expect(events[0].completed).toBe(false);
		expect(events[1].completed).toBe(true);

		interceptor.stop();
		globalThis.fetch = originalFetch;
	});

	test("onRequest unsubscribe stops notifications", async () => {
		const events: unknown[] = [];

		setMockFetch(async () => new Response("ok", { status: 200 }));

		interceptor.start();
		const unsub = interceptor.onRequest((req) => {
			events.push(req);
		});

		await globalThis.fetch("https://api.example.com/a");
		unsub();
		await globalThis.fetch("https://api.example.com/b");

		// First request fires start + complete = 2, second request should fire 0
		expect(events).toHaveLength(2);

		interceptor.stop();
		globalThis.fetch = originalFetch;
	});

	test("clear resets state", async () => {
		setMockFetch(async () => new Response("ok", { status: 200 }));

		interceptor.start();
		await globalThis.fetch("https://api.example.com/test");

		expect(interceptor.getRequests()).toHaveLength(1);
		interceptor.clear();
		expect(interceptor.getRequests()).toHaveLength(0);

		interceptor.stop();
		globalThis.fetch = originalFetch;
	});

	test("getActiveRequests returns only in-flight requests", async () => {
		let resolveSecond: (() => void) | undefined;
		const secondPromise = new Promise<void>((resolve) => {
			resolveSecond = resolve;
		});
		let callIndex = 0;

		setMockFetch(async () => {
			callIndex++;
			if (callIndex === 2) {
				await secondPromise;
			}
			return new Response("ok", { status: 200 });
		});

		interceptor.start();

		// First request completes immediately
		await globalThis.fetch("https://api.example.com/fast");

		// Second request will be pending
		const pendingPromise = globalThis.fetch("https://api.example.com/slow");

		// At this point the second request should be active
		const active = interceptor.getActiveRequests();
		expect(active.length).toBeGreaterThanOrEqual(1);

		// Resolve the pending request
		resolveSecond?.();
		await pendingPromise;

		// Now no requests should be active
		expect(interceptor.getActiveRequests()).toHaveLength(0);

		interceptor.stop();
		globalThis.fetch = originalFetch;
	});

	test("defaults to GET method when not specified", async () => {
		setMockFetch(async () => new Response("ok", { status: 200 }));

		interceptor.start();
		await globalThis.fetch("https://api.example.com/test");

		const requests = interceptor.getRequests();
		expect(requests[0].method).toBe("GET");

		interceptor.stop();
		globalThis.fetch = originalFetch;
	});

	test("XHR interception works", () => {
		// Verify XHR patching hooks exist and don't break when XMLHttpRequest is available
		// In Bun, XMLHttpRequest is not natively available, so we test the no-op path
		interceptor.start();
		interceptor.stop();
		// Should not throw
	});
});
