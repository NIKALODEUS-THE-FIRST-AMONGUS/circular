/**
 * Retry with Exponential Backoff
 * Implements retry logic with exponential backoff for failed operations
 * Used by upload, API calls, and database operations
 */

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 30000)
 * @param {number} options.backoffMultiplier - Multiplier for exponential backoff (default: 2)
 * @param {Function} options.shouldRetry - Function to determine if error is retryable
 * @param {Function} options.onRetry - Callback on retry attempt
 * @returns {Promise} Result of the function
 */
export const retryWithBackoff = async (
  fn,
  {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    shouldRetry = () => true,
    onRetry = () => {},
  } = {}
) => {
  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Calculate delay with jitter to prevent thundering herd
      const jitter = Math.random() * 0.1 * delay; // 0-10% jitter
      const nextDelay = Math.min(delay + jitter, maxDelay);

      // Call retry callback
      onRetry({
        attempt: attempt + 1,
        maxRetries,
        delay: nextDelay,
        error,
      });

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, nextDelay));

      // Increase delay for next attempt
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
};

/**
 * Retry a function with linear backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Result of the function
 */
export const retryWithLinearBackoff = async (
  fn,
  {
    maxRetries = 3,
    initialDelay = 1000,
    delayIncrement = 1000,
    maxDelay = 10000,
    shouldRetry = () => true,
    onRetry = () => {},
  } = {}
) => {
  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      onRetry({
        attempt: attempt + 1,
        maxRetries,
        delay,
        error,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay + delayIncrement, maxDelay);
    }
  }

  throw lastError;
};

/**
 * Retry a function with immediate retry (no delay)
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Result of the function
 */
export const retryImmediate = async (
  fn,
  {
    maxRetries = 3,
    shouldRetry = () => true,
    onRetry = () => {},
  } = {}
) => {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      onRetry({
        attempt: attempt + 1,
        maxRetries,
        delay: 0,
        error,
      });
    }
  }

  throw lastError;
};

/**
 * Determine if error is retryable (network, timeout, server errors)
 * @param {Error} error - Error object
 * @returns {boolean} True if error is retryable
 */
export const isRetryableError = (error) => {
  if (!error) return false;

  const code = error.code || '';
  const message = error.message || '';

  // Network errors
  if (
    code.includes('network') ||
    code.includes('timeout') ||
    code === 'auth/network-request-failed' ||
    message.includes('network') ||
    message.includes('offline') ||
    message.includes('timeout')
  ) {
    return true;
  }

  // Server errors (5xx)
  if (code >= 500 && code < 600) {
    return true;
  }

  // Specific Firebase errors that are retryable
  const retryableCodes = [
    'internal',
    'unavailable',
    'aborted',
    'deadline-exceeded',
    'resource-exhausted',
  ];

  return retryableCodes.includes(code);
};

/**
 * Determine if error is a rate limit error
 * @param {Error} error - Error object
 * @returns {boolean} True if rate limit error
 */
export const isRateLimitError = (error) => {
  if (!error) return false;

  const code = error.code || '';
  const status = error.status || 0;

  return (
    code === 'resource-exhausted' ||
    status === 429 ||
    code.includes('quota') ||
    code.includes('rate-limit')
  );
};

export default {
  retryWithBackoff,
  retryWithLinearBackoff,
  retryImmediate,
  isRetryableError,
  isRateLimitError,
};
