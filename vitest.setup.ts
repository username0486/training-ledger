/**
 * Vitest setup - polyfill localStorage when missing (e.g. Node 25+)
 * Extend expect with @testing-library/jest-dom matchers
 */
import '@testing-library/jest-dom/vitest';
const storage: Record<string, string> = {};
const localStoragePolyfill = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => {
    storage[key] = value;
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
  clear: () => {
    for (const key of Object.keys(storage)) delete storage[key];
  },
  length: 0,
  key: () => null,
};

if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.setItem !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', { value: localStoragePolyfill, writable: true });
}
