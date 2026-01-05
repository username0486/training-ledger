/**
 * User preferences storage and management
 * Stores preferences locally (offline-first)
 */

export type UnitSystem = 'metric' | 'imperial';
export type Appearance = 'light' | 'dark';

const PREFERENCES_KEY = 'training-ledger-preferences';

interface Preferences {
  unitSystem: UnitSystem;
  appearance: Appearance;
}

const DEFAULT_PREFERENCES: Preferences = {
  unitSystem: 'metric',
  appearance: 'light',
};

/**
 * Load preferences from localStorage
 */
export function loadPreferences(): Preferences {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        unitSystem: parsed.unitSystem || DEFAULT_PREFERENCES.unitSystem,
        appearance: parsed.appearance || DEFAULT_PREFERENCES.appearance,
      };
    }
  } catch (error) {
    console.warn('Failed to load preferences:', error);
  }
  return { ...DEFAULT_PREFERENCES };
}

/**
 * Save preferences to localStorage
 */
export function savePreferences(prefs: Partial<Preferences>): void {
  try {
    const current = loadPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save preferences:', error);
  }
}

/**
 * Get current unit system
 */
export function getUnitSystem(): UnitSystem {
  return loadPreferences().unitSystem;
}

/**
 * Get current appearance
 */
export function getAppearance(): Appearance {
  return loadPreferences().appearance;
}

/**
 * Set unit system
 */
export function setUnitSystem(unit: UnitSystem): void {
  savePreferences({ unitSystem: unit });
}

/**
 * Set appearance
 */
export function setAppearance(appearance: Appearance): void {
  savePreferences({ appearance });
}

