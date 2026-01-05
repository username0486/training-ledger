/**
 * Production-safe logging utility
 * In production builds, console logs are stripped or minimized
 */

const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

/**
 * Log only in development
 */
export function devLog(...args: any[]): void {
  if (isDev) {
    console.log(...args);
  }
}

/**
 * Warn only in development
 */
export function devWarn(...args: any[]): void {
  if (isDev) {
    console.warn(...args);
  }
}

/**
 * Error logging (always enabled, but can be filtered in production)
 */
export function logError(...args: any[]): void {
  // Errors should be logged even in production, but can be minimized
  if (isDev) {
    console.error(...args);
  } else {
    // In production, only log critical errors
    console.error(...args);
  }
}

/**
 * Info logging (only in development)
 */
export function devInfo(...args: any[]): void {
  if (isDev) {
    console.info(...args);
  }
}

