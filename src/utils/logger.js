/**
 * Safe logging utility that masks sensitive data
 */

const SENSITIVE_KEYS = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'privateKey',
    'private_key',
    'creditCard',
    'ssn',
    'pin'
];

/**
 * Mask sensitive values in objects
 */
const maskSensitiveData = (data) => {
    if (!data || typeof data !== 'object') {
        return data;
    }

    // Handle Error objects specially
    if (data instanceof Error) {
        return {
            name: data.name,
            message: data.message,
            stack: data.stack
        };
    }

    if (Array.isArray(data)) {
        return data.map(item => maskSensitiveData(item));
    }

    const masked = {};
    for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = SENSITIVE_KEYS.some(sensitiveKey => 
            lowerKey.includes(sensitiveKey.toLowerCase())
        );

        if (isSensitive && typeof value === 'string') {
            // Mask the value
            masked[key] = '***' + value.slice(-4);
        } else if (typeof value === 'object' && value !== null) {
            // Recursively mask nested objects
            masked[key] = maskSensitiveData(value);
        } else {
            masked[key] = value;
        }
    }

    return masked;
};

/**
 * Safe console.log that masks sensitive data
 */
export const safeLog = (...args) => {
    const maskedArgs = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
            return maskSensitiveData(arg);
        }
        return arg;
    });
    console.log(...maskedArgs);
};

/**
 * Safe console.error that masks sensitive data
 */
export const safeError = (...args) => {
    const maskedArgs = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
            return maskSensitiveData(arg);
        }
        return arg;
    });
    console.error(...maskedArgs);
};

/**
 * Safe console.warn that masks sensitive data
 */
export const safeWarn = (...args) => {
    const maskedArgs = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
            return maskSensitiveData(arg);
        }
        return arg;
    });
    console.warn(...maskedArgs);
};

/**
 * Safe console.group that masks sensitive data
 */
export const safeGroup = (label, data) => {
    console.group(label);
    if (data) {
        safeLog(data);
    }
};

/**
 * Safe console.groupEnd
 */
export const safeGroupEnd = () => {
    console.groupEnd();
};

// Export default logger object
export default {
    log: safeLog,
    error: safeError,
    warn: safeWarn,
    group: safeGroup,
    groupEnd: safeGroupEnd,
    maskSensitiveData
};
