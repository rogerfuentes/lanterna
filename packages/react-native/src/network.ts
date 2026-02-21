/** Network request data captured by the interceptor. */
export interface NetworkRequest {
	/** Unique request identifier. */
	id: string;
	/** Request URL. */
	url: string;
	/** HTTP method (GET, POST, etc.). */
	method: string;
	/** Timestamp when the request started (ms since epoch). */
	startTime: number;
	/** Timestamp when the request completed, or undefined if still in-flight. */
	endTime?: number;
	/** Duration in milliseconds, or undefined if still in-flight. */
	duration?: number;
	/** HTTP status code, or undefined if still in-flight or errored. */
	status?: number;
	/** Response size in bytes (from Content-Length or body), or undefined if unknown. */
	responseSize?: number;
	/** Error message if the request failed. */
	error?: string;
}

/** Listener invoked when a network request starts or completes. */
export type NetworkRequestListener = (request: NetworkRequest) => void;

let requestCounter = 0;

function generateRequestId(): string {
	requestCounter++;
	return `net-${Date.now()}-${requestCounter}`;
}

/**
 * Network interceptor that monkey-patches `fetch` and `XMLHttpRequest`
 * to capture request timing, status, and size data.
 *
 * Designed for React Native environments where network visibility
 * is needed without native-side instrumentation.
 */
export class NetworkInterceptor {
	private requests = new Map<string, NetworkRequest>();
	// biome-ignore lint/suspicious/noExplicitAny: fetch type varies across runtimes
	private originalFetch: any | null = null;
	private listeners = new Set<NetworkRequestListener>();
	private active = false;

	// XHR originals
	private originalXhrOpen: typeof XMLHttpRequest.prototype.open | null = null;
	private originalXhrSend: typeof XMLHttpRequest.prototype.send | null = null;

	/**
	 * Start intercepting network requests.
	 * Patches `globalThis.fetch` and `XMLHttpRequest`.
	 */
	start(): void {
		if (this.active) return;
		this.active = true;
		this.patchFetch();
		this.patchXhr();
	}

	/**
	 * Stop intercepting and restore original `fetch` and `XMLHttpRequest`.
	 */
	stop(): void {
		if (!this.active) return;
		this.active = false;
		this.restoreFetch();
		this.restoreXhr();
	}

	/** Get all captured requests (both completed and in-flight). */
	getRequests(): NetworkRequest[] {
		return [...this.requests.values()];
	}

	/** Get only in-flight (active) requests. */
	getActiveRequests(): NetworkRequest[] {
		return [...this.requests.values()].filter((r) => r.endTime === undefined);
	}

	/** Clear all captured request data. */
	clear(): void {
		this.requests.clear();
	}

	/**
	 * Subscribe to request events (start and completion).
	 * Returns an unsubscribe function.
	 */
	onRequest(listener: NetworkRequestListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notifyListeners(request: NetworkRequest): void {
		for (const listener of this.listeners) {
			try {
				listener(request);
			} catch {
				// Never throw from listener notification
			}
		}
	}

	private patchFetch(): void {
		if (typeof globalThis.fetch !== "function") return;

		this.originalFetch = globalThis.fetch;
		const self = this;

		const patchedFetch = async function patchedFetch(
			input: RequestInfo | URL,
			init?: RequestInit,
		): Promise<Response> {
			const id = generateRequestId();
			const url =
				typeof input === "string"
					? input
					: input instanceof URL
						? input.toString()
						: ((input as Request).url ?? String(input));
			const method =
				init?.method ??
				(typeof input === "object" && "method" in input ? (input as Request).method : "GET");

			const request: NetworkRequest = {
				id,
				url,
				method: method.toUpperCase(),
				startTime: Date.now(),
			};

			self.requests.set(id, request);
			self.notifyListeners(request);

			try {
				const response = await self.originalFetch?.call(globalThis, input, init);

				request.endTime = Date.now();
				request.duration = request.endTime - request.startTime;
				request.status = response.status;

				// Try to get response size from Content-Length header
				const contentLength = response.headers.get("content-length");
				if (contentLength) {
					const size = Number.parseInt(contentLength, 10);
					if (!Number.isNaN(size)) {
						request.responseSize = size;
					}
				}

				self.requests.set(id, request);
				self.notifyListeners(request);
				return response;
			} catch (err: unknown) {
				request.endTime = Date.now();
				request.duration = request.endTime - request.startTime;
				request.error = err instanceof Error ? err.message : String(err);

				self.requests.set(id, request);
				self.notifyListeners(request);
				throw err;
			}
		};

		// biome-ignore lint/suspicious/noExplicitAny: runtime fetch type varies across environments
		globalThis.fetch = patchedFetch as any;
	}

	private restoreFetch(): void {
		if (this.originalFetch) {
			globalThis.fetch = this.originalFetch;
			this.originalFetch = null;
		}
	}

	private patchXhr(): void {
		if (typeof globalThis.XMLHttpRequest === "undefined") return;

		const proto = XMLHttpRequest.prototype;
		this.originalXhrOpen = proto.open;
		this.originalXhrSend = proto.send;
		const self = this;

		// biome-ignore lint/suspicious/noExplicitAny: XHR open signature is complex
		proto.open = function patchedOpen(this: XMLHttpRequest, ...args: any[]) {
			const method = typeof args[0] === "string" ? args[0].toUpperCase() : "GET";
			const url = typeof args[1] === "string" ? args[1] : String(args[1] ?? "");

			// Store metadata on the XHR instance
			// biome-ignore lint/suspicious/noExplicitAny: attaching tracking metadata
			(this as any).__lanterna_method = method;
			// biome-ignore lint/suspicious/noExplicitAny: attaching tracking metadata
			(this as any).__lanterna_url = url;

			return self.originalXhrOpen?.apply(
				this,
				args as Parameters<typeof XMLHttpRequest.prototype.open>,
			);
		};

		// biome-ignore lint/suspicious/noExplicitAny: XHR send signature is complex
		proto.send = function patchedSend(this: XMLHttpRequest, ...args: any[]) {
			const id = generateRequestId();
			// biome-ignore lint/suspicious/noExplicitAny: reading tracking metadata
			const method = (this as any).__lanterna_method ?? "GET";
			// biome-ignore lint/suspicious/noExplicitAny: reading tracking metadata
			const url = (this as any).__lanterna_url ?? "";

			const request: NetworkRequest = {
				id,
				url,
				method,
				startTime: Date.now(),
			};

			self.requests.set(id, request);
			self.notifyListeners(request);

			const onLoadEnd = () => {
				request.endTime = Date.now();
				request.duration = request.endTime - request.startTime;
				request.status = this.status;

				const contentLength = this.getResponseHeader("content-length");
				if (contentLength) {
					const size = Number.parseInt(contentLength, 10);
					if (!Number.isNaN(size)) {
						request.responseSize = size;
					}
				}

				self.requests.set(id, request);
				self.notifyListeners(request);
			};

			const onError = () => {
				request.endTime = Date.now();
				request.duration = request.endTime - request.startTime;
				request.error = "Network request failed";

				self.requests.set(id, request);
				self.notifyListeners(request);
			};

			this.addEventListener("loadend", onLoadEnd);
			this.addEventListener("error", onError);

			return self.originalXhrSend?.apply(
				this,
				args as Parameters<typeof XMLHttpRequest.prototype.send>,
			);
		};
	}

	private restoreXhr(): void {
		if (typeof globalThis.XMLHttpRequest === "undefined") return;

		const proto = XMLHttpRequest.prototype;
		if (this.originalXhrOpen) {
			proto.open = this.originalXhrOpen;
			this.originalXhrOpen = null;
		}
		if (this.originalXhrSend) {
			proto.send = this.originalXhrSend;
			this.originalXhrSend = null;
		}
	}
}
