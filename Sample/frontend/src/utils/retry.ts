/** Thrown by `retryWithBackoff` when `isCancelled` reports true before an attempt. */
export class RetryCancelledError extends Error {
  constructor() {
    super('Retry cancelled');
    this.name = 'RetryCancelledError';
  }
}

export interface RetryOptions {
  /** Total number of attempts including the first (default: 8). */
  attempts?: number;
  /** Initial backoff delay in ms — doubles each attempt (default: 1000). */
  baseDelayMs?: number;
  /** Cap on the backoff delay in ms (default: 15000). */
  maxDelayMs?: number;
  /** Predicate deciding whether a failure is retryable (default: network errors & 5xx). */
  shouldRetry?: (error: unknown) => boolean;
  /**
   * Checked before each attempt; when it returns true, retrying stops and a
   * `RetryCancelledError` is thrown (e.g. the component unmounted).
   */
  isCancelled?: () => boolean;
}

type ResponseError = { response?: { status?: number } };

function isResponseError(error: unknown): error is ResponseError {
  return typeof error === 'object' && error !== null && 'response' in error;
}

/**
 * Returns true for failures worth retrying:
 * - requests that never reached the server (e.g. ECONNREFUSED while the
 *   backend is still booting on `pnpm dev`), or
 * - HTTP 5xx responses (the Vite proxy surfaces a down backend as a 500).
 *
 * 4xx responses (auth, validation) are treated as permanent and not retried.
 */
export function isTransientError(error: unknown): boolean {
  if (isResponseError(error)) {
    const status = error.response?.status;
    if (typeof status === 'number') {
      return status >= 500;
    }
  }
  return true;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retries `fn` with exponential backoff while failures are transient.
 * Resolves with the first successful result; rethrows the last error once
 * `attempts` are exhausted or a non-transient failure occurs.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    attempts = 8,
    baseDelayMs = 1000,
    maxDelayMs = 15000,
    shouldRetry = isTransientError,
    isCancelled,
  } = options;

  if (attempts < 1) {
    return fn();
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (isCancelled?.()) {
      throw new RetryCancelledError();
    }
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !shouldRetry(error)) {
        throw error;
      }
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      await sleep(delay);
    }
  }
  throw lastError;
}
