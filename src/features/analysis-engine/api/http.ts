// ---------------------------------------------------------------------------
// Generic HTTP Client
// Features: typed responses, cancellation, timeout, retry with backoff
// ---------------------------------------------------------------------------

import {
  ApiError,
  HttpError,
  NetworkError,
  RetryError,
  TimeoutError,
} from "./errors";

// ─── Options & Config ─────────────────────────────────────────────────────

export interface RequestOptions {
  readonly signal?: AbortSignal;
  readonly timeout?: number;
  readonly headers?: Record<string, string>;
}

export interface HttpClientConfig {
  readonly baseUrl?: string;
  readonly headers?: Record<string, string>;
  readonly timeout?: number;
  readonly retryCount?: number;
  readonly retryBaseDelayMs?: number;
}

interface RetryableError {
  readonly shouldRetry: boolean;
  readonly error: ApiError;
}

// ─── HTTP Client ──────────────────────────────────────────────────────────

export class HttpClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly defaultTimeout: number;
  private readonly retryCount: number;
  private readonly retryBaseDelayMs: number;

  constructor(config: HttpClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? "";
    this.defaultHeaders = config.headers ?? {};
    this.defaultTimeout = config.timeout ?? 15_000;
    this.retryCount = config.retryCount ?? 2;
    this.retryBaseDelayMs = config.retryBaseDelayMs ?? 500;
  }

  // ─── Public methods ──────────────────────────────────────────────────

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", path, undefined, options);
  }

  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", path, body, options);
  }

  async put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PUT", path, body, options);
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", path, undefined, options);
  }

  // ─── Core request ────────────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    const url = this.resolveUrl(path);
    const timeout = options?.timeout ?? this.defaultTimeout;
    const headers = this.mergeHeaders(options?.headers);
    const signal = options?.signal;

    let lastError: ApiError;

    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      try {
        const result = await this.executeWithTimeout<T>(
          url,
          method,
          headers,
          body,
          signal,
          timeout,
        );
        return result;
      } catch (err) {
        lastError = this.normaliseError(err);
        const verdict = this.isRetryable(lastError, attempt);

        if (!verdict.shouldRetry) {
          throw verdict.error;
        }

        // Wait with exponential backoff + jitter before retrying
        const delay = this.backoffDelay(attempt);
        await this.sleep(delay, signal);
      }
    }

    throw new RetryError(this.retryCount, lastError!);
  }

  // ─── Fetch with timeout ──────────────────────────────────────────────

  private async executeWithTimeout<T>(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: unknown | undefined,
    userSignal: AbortSignal | undefined,
    timeoutMs: number,
  ): Promise<T> {
    const controller = new AbortController();
    const combinedSignal = this.combineSignals(controller, userSignal);

    // Timeout timer
    const timerId = setTimeout(() => {
      controller.abort(new TimeoutError(timeoutMs));
    }, timeoutMs);

    try {
      const init: RequestInit = {
        method,
        headers: this.buildFetchHeaders(headers, body),
        signal: combinedSignal,
      };

      if (body !== undefined && method !== "GET" && method !== "DELETE") {
        init.body = JSON.stringify(body);
      }

      let response: Response;
      try {
        response = await fetch(url, init);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          if (controller.signal.reason instanceof TimeoutError) {
            throw controller.signal.reason;
          }
          throw err;
        }
        throw new NetworkError(err instanceof Error ? err : new Error(String(err)));
      }

      if (!response.ok) {
        const bodyText = await this.safeReadBody(response);
        throw new HttpError(response.status, response.statusText, bodyText);
      }

      const text = await response.text();
      if (text.length === 0) {
        return undefined as T;
      }

      return JSON.parse(text) as T;
    } finally {
      clearTimeout(timerId);
    }
  }

  // ─── Signal composition ──────────────────────────────────────────────

  private combineSignals(
    controller: AbortController,
    userSignal?: AbortSignal,
  ): AbortSignal {
    // If the user already aborted, abort immediately
    if (userSignal?.aborted === true) {
      if (userSignal.reason !== undefined) {
        controller.abort(userSignal.reason);
      } else {
        controller.abort();
      }
      return controller.signal;
    }

    // Forward user's abort into our controller
    if (userSignal !== undefined) {
      const onUserAbort = (): void => {
        controller.abort(userSignal.reason);
      };
      userSignal.addEventListener("abort", onUserAbort, { once: true });
    }

    return controller.signal;
  }

  // ─── Retry logic ─────────────────────────────────────────────────────

  private isRetryable(err: ApiError, attempt: number): RetryableError {
    // Exhausted attempts
    if (attempt >= this.retryCount) {
      return { shouldRetry: false, error: err };
    }

    // Network errors are retryable
    if (err instanceof NetworkError) {
      return { shouldRetry: true, error: err };
    }

    // Timeout is retryable
    if (err instanceof TimeoutError) {
      return { shouldRetry: true, error: err };
    }

    // HTTP 5xx and 429 are retryable
    if (err instanceof HttpError) {
      if (err.isServerError || err.isRateLimited) {
        return { shouldRetry: true, error: err };
      }
    }

    // Everything else: not retryable
    return { shouldRetry: false, error: err };
  }

  private backoffDelay(attempt: number): number {
    const base = this.retryBaseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * base * 0.3;
    return Math.min(base + jitter, 10_000);
  }

  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted === true) {
        reject(new ApiError("Operation cancelled during retry delay"));
        return;
      }

      const timer = setTimeout(resolve, ms);

      const onAbort = (): void => {
        clearTimeout(timer);
        reject(new ApiError("Operation cancelled during retry delay"));
      };

      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  private resolveUrl(path: string): string {
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    return `${this.baseUrl}${path}`;
  }

  private mergeHeaders(
    extra?: Record<string, string>,
  ): Record<string, string> {
    return { ...this.defaultHeaders, ...extra };
  }

  private buildFetchHeaders(
    headers: Record<string, string>,
    body?: unknown,
  ): Record<string, string> {
    const h: Record<string, string> = { ...headers };
    if (body !== undefined && !("content-type" in headers) && !("Content-Type" in headers)) {
      h["Content-Type"] = "application/json";
    }
    return h;
  }

  private async safeReadBody(response: Response): Promise<string | null> {
    try {
      return await response.text();
    } catch {
      return null;
    }
  }

  private normaliseError(err: unknown): ApiError {
    if (err instanceof ApiError) return err;
    if (err instanceof DOMException && err.name === "AbortError") {
      return new TimeoutError(this.defaultTimeout);
    }
    if (err instanceof TypeError && err.message.includes("fetch")) {
      return new NetworkError(err);
    }
    return new ApiError(err instanceof Error ? err.message : String(err));
  }
}
