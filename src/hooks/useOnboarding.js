/**
 * useOnboarding - Persistent onboarding state manager
 * Stores progress in localStorage so users can resume where they left off.
 */

const STORAGE_KEY_STEP = 'onboarding_step';
const STORAGE_KEY_DATA = 'onboarding_data';
const STORAGE_KEY_STATUS = 'onboarding_status'; // 'in_progress' | 'complete'

export const ONBOARDING_STATUS = {
  IN_PROGRESS: 'in_progress',
  COMPLETE: 'complete',
};

/** Read persisted onboarding step (defaults to 0) */
export function getPersistedStep() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STEP);
    const step = parseInt(raw, 10);
    return isNaN(step) ? 0 : step;
  } catch (err) { 
    console.error('Error reading persisted step:', err);
    return 0; 
  }
}

/** Read persisted partial form data */
export function getPersistedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DATA);
    return raw ? JSON.parse(raw) : {};
  } catch (err) { 
    console.error('Error reading persisted data:', err);
    return {}; 
  }
}

/** Check if onboarding was already completed */
export function isOnboardingComplete() {
  try {
    return localStorage.getItem(STORAGE_KEY_STATUS) === ONBOARDING_STATUS.COMPLETE;
  } catch (err) { 
    console.error('Error checking onboarding status:', err);
    return false; 
  }
}

/** Save current step */
export function persistStep(step) {
  try {
    localStorage.setItem(STORAGE_KEY_STEP, String(step));
    localStorage.setItem(STORAGE_KEY_STATUS, ONBOARDING_STATUS.IN_PROGRESS);
  } catch (err) {
    console.error('Error persisting onboarding step:', err);
  }
}

/** Save partial form data */
export function persistData(data) {
  try {
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
  } catch (err) {
    console.error('Error persisting onboarding data:', err);
  }
}

/** Mark onboarding as complete and clear persisted progress */
export function completeOnboarding() {
  try {
    localStorage.setItem(STORAGE_KEY_STATUS, ONBOARDING_STATUS.COMPLETE);
    localStorage.removeItem(STORAGE_KEY_STEP);
    localStorage.removeItem(STORAGE_KEY_DATA);
  } catch (err) {
    console.error('Error completing onboarding:', err);
  }
}

/** Clear all onboarding state (e.g. on sign-out) */
export function clearOnboarding() {
  try {
    localStorage.removeItem(STORAGE_KEY_STEP);
    localStorage.removeItem(STORAGE_KEY_DATA);
    localStorage.removeItem(STORAGE_KEY_STATUS);
  } catch (err) {
    console.error('Error clearing onboarding state:', err);
  }
}
