// ---------------------------------------------------------------------------
// API Error Hierarchy
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number | null = null,
    public readonly cause: Error | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NetworkError extends ApiError {
  constructor(cause: Error) {
    super(`Network error: ${cause.message}`, null, cause);
    this.name = "NetworkError";
  }
}

export class TimeoutError extends ApiError {
  constructor(public readonly timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = "TimeoutError";
  }
}

export class HttpError extends ApiError {
  constructor(
    statusCode: number,
    statusText: string,
    public readonly body: string | null = null,
  ) {
    super(`HTTP ${statusCode}: ${statusText}`, statusCode);
    this.name = "HttpError";
  }

  get isClientError(): boolean {
    return this.statusCode !== null && this.statusCode >= 400 && this.statusCode < 500;
  }

  get isServerError(): boolean {
    return this.statusCode !== null && this.statusCode >= 500;
  }

  get isNotFound(): boolean {
    return this.statusCode === 404;
  }

  get isRateLimited(): boolean {
    return this.statusCode === 429;
  }
}

export class RetryError extends ApiError {
  constructor(
    public readonly attempts: number,
    public readonly lastError: ApiError,
  ) {
    super(`Request failed after ${attempts} retries. Last error: ${lastError.message}`, lastError.statusCode, lastError);
    this.name = "RetryError";
  }
}

export class InvalidResponseError extends ApiError {
  constructor(expected: string, received: string) {
    super(`Invalid response: expected ${expected}, received: ${received}`);
    this.name = "InvalidResponseError";
  }
}
