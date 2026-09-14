import { describe, it, expect, vi, afterEach } from 'vitest';
import { isTransientError, retryWithBackoff, RetryCancelledError } from '../retry';

describe('isTransientError', () => {
  it('treats network-level errors (no response) as transient', () => {
    expect(isTransientError({ code: 'ECONNREFUSED' })).toBe(true);
    expect(isTransientError({ message: 'Network Error', request: {} })).toBe(true);
    expect(isTransientError(new TypeError('fetch failed'))).toBe(true);
  });

  it('treats 5xx responses as transient', () => {
    expect(isTransientError({ response: { status: 500 } })).toBe(true);
    expect(isTransientError({ response: { status: 502 } })).toBe(true);
    expect(isTransientError({ response: { status: 503 } })).toBe(true);
  });

  it('treats 4xx responses as permanent', () => {
    expect(isTransientError({ response: { status: 401 } })).toBe(false);
    expect(isTransientError({ response: { status: 404 } })).toBe(false);
    expect(isTransientError({ response: { status: 400 } })).toBe(false);
  });
});

describe('retryWithBackoff', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves immediately when the call succeeds on the first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(retryWithBackoff(fn, { attempts: 3, baseDelayMs: 5 })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries transient failures until the call succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockRejectedValueOnce({ code: 'ECONNREFUSED' })
      .mockResolvedValue('recovered');

    await expect(retryWithBackoff(fn, { attempts: 5, baseDelayMs: 1, maxDelayMs: 5 })).resolves.toBe(
      'recovered',
    );
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('gives up after exhausting attempts and rethrows the last error', async () => {
    const lastError = { response: { status: 500 } };
    const fn = vi.fn().mockRejectedValue(lastError);

    await expect(retryWithBackoff(fn, { attempts: 3, baseDelayMs: 1, maxDelayMs: 5 })).rejects.toBe(
      lastError,
    );
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-transient (4xx) failures', async () => {
    const error = { response: { status: 404 } };
    const fn = vi.fn().mockRejectedValue(error);

    await expect(retryWithBackoff(fn, { attempts: 5, baseDelayMs: 1 })).rejects.toBe(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('honors a custom shouldRetry predicate', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce('boom')
      .mockResolvedValue('ok');

    await expect(
      retryWithBackoff(fn, { attempts: 3, baseDelayMs: 1, maxDelayMs: 5, shouldRetry: () => true }),
    ).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('uses real timers by default (delay between attempts is respected)', async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockResolvedValue('ok');

    const promise = retryWithBackoff(fn, { attempts: 3, baseDelayMs: 100, maxDelayMs: 100 });
    await vi.advanceTimersByTimeAsync(100);
    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('stops retrying when isCancelled reports true and throws RetryCancelledError', async () => {
    vi.useFakeTimers();
    let cancelled = false;
    const fn = vi.fn().mockRejectedValue({ response: { status: 503 } });

    const promise = retryWithBackoff(fn, {
      attempts: 5,
      baseDelayMs: 100,
      maxDelayMs: 100,
      isCancelled: () => cancelled,
    });

    // Attach the rejection handler first so the cancellation isn't reported as
    // an unhandled rejection when timers advance.
    const assertion = expect(promise).rejects.toBeInstanceOf(RetryCancelledError);

    // First attempt fails synchronously; cancel during the backoff sleep.
    await vi.advanceTimersByTimeAsync(0);
    cancelled = true;
    await vi.advanceTimersByTimeAsync(100);

    await assertion;
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('succeeds when isCancelled stays false across retries', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockResolvedValue('ok');

    await expect(
      retryWithBackoff(fn, { attempts: 3, baseDelayMs: 1, maxDelayMs: 5, isCancelled: () => false }),
    ).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('still runs fn once when attempts is less than 1', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(retryWithBackoff(fn, { attempts: 0 })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
