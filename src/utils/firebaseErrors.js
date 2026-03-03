/**
 * Firebase Error Code Mapper
 * Converts Firebase error codes to user-friendly messages
 */

export const firebaseErrorMessages = {
  // Authentication errors
  'auth/user-not-found': 'Email not registered. Please sign up first.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-email': 'Invalid email address. Please check and try again.',
  'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
  'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
  'auth/operation-not-allowed': 'This operation is not allowed. Please contact support.',
  'auth/too-many-requests': 'Too many login attempts. Please try again later.',
  'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
  'auth/invalid-credential': 'Invalid credentials. Please check your email and password.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/network-request-failed': 'Network error. Please check your internet connection.',
  'auth/internal-error': 'An internal error occurred. Please try again.',

  // Firestore errors
  'permission-denied': 'You do not have permission to perform this action.',
  'not-found': 'The requested item was not found.',
  'already-exists': 'This item already exists.',
  'failed-precondition': 'The operation failed due to a precondition. Please try again.',
  'aborted': 'The operation was aborted. Please try again.',
  'out-of-range': 'The value is out of range.',
  'unimplemented': 'This feature is not yet implemented.',
  'internal': 'An internal server error occurred. Please try again later.',
  'unavailable': 'The service is temporarily unavailable. Please try again later.',
  'data-loss': 'Unrecoverable data loss or corruption.',
  'unauthenticated': 'You must be signed in to perform this action.',

  // Storage errors
  'storage/object-not-found': 'The file was not found.',
  'storage/bucket-not-found': 'The storage bucket was not found.',
  'storage/project-not-found': 'The project was not found.',
  'storage/quota-exceeded': 'Storage quota exceeded. Please delete some files.',
  'storage/unauthenticated': 'You must be signed in to upload files.',
  'storage/unauthorized': 'You do not have permission to upload files.',
  'storage/retry-limit-exceeded': 'Upload failed after multiple attempts. Please try again.',
  'storage/invalid-argument': 'Invalid upload parameters.',
  'storage/server-file-wrong-size': 'The uploaded file size does not match.',

  // Custom errors
  'network-error': 'Network connection failed. Please check your internet.',
  'timeout': 'Request timed out. Please try again.',
  'invalid-input': 'Invalid input. Please check your data.',
  'file-too-large': 'File is too large. Maximum size is 5MB.',
  'invalid-file-type': 'Invalid file type. Only images and PDFs are allowed.',
  'circular-not-found': 'Circular not found. It may have been deleted.',
  'user-not-found': 'User not found.',
  'profile-not-found': 'User profile not found.',
};

/**
 * Get user-friendly error message
 * @param {Error|string} error - Firebase error or error code
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error) => {
  if (!error) return 'An unknown error occurred.';

  // Handle error objects
  if (error instanceof Error) {
    // Firebase error with code
    if (error.code) {
      return firebaseErrorMessages[error.code] || error.message || 'An error occurred.';
    }
    return error.message || 'An error occurred.';
  }

  // Handle error strings (error codes)
  if (typeof error === 'string') {
    return firebaseErrorMessages[error] || error || 'An error occurred.';
  }

  return 'An unknown error occurred.';
};

/**
 * Get error code from error object
 * @param {Error|string} error - Firebase error or error code
 * @returns {string} Error code
 */
export const getErrorCode = (error) => {
  if (!error) return 'unknown-error';
  if (typeof error === 'string') return error;
  if (error.code) return error.code;
  return 'unknown-error';
};

/**
 * Check if error is a network error
 * @param {Error} error - Error object
 * @returns {boolean} True if network error
 */
export const isNetworkError = (error) => {
  if (!error) return false;
  const code = error.code || '';
  return (
    code.includes('network') ||
    code.includes('timeout') ||
    code === 'auth/network-request-failed' ||
    error.message?.includes('network') ||
    error.message?.includes('offline')
  );
};

/**
 * Check if error is a permission error
 * @param {Error} error - Error object
 * @returns {boolean} True if permission error
 */
export const isPermissionError = (error) => {
  if (!error) return false;
  const code = error.code || '';
  return (
    code.includes('permission') ||
    code.includes('unauthorized') ||
    code.includes('unauthenticated')
  );
};

/**
 * Check if error is retryable
 * @param {Error} error - Error object
 * @returns {boolean} True if error is retryable
 */
export const isRetryableError = (error) => {
  if (!error) return false;
  const code = error.code || '';
  return (
    code.includes('timeout') ||
    code.includes('unavailable') ||
    code.includes('aborted') ||
    code.includes('network') ||
    code === 'internal'
  );
};

export default {
  firebaseErrorMessages,
  getErrorMessage,
  getErrorCode,
  isNetworkError,
  isPermissionError,
  isRetryableError,
};
