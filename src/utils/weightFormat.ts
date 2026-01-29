/**
 * Weight formatting and conversion utilities
 * Handles display and parsing of weights based on unit preference
 */

import { getUnitSystem, UnitSystem } from './preferences';

// Conversion constants (precise conversion factor)
const KG_TO_LB = 2.2046226218;
const LB_TO_KG = 1 / KG_TO_LB;

/**
 * Convert kg to lb
 */
export function kgToLb(kg: number): number {
  return kg * KG_TO_LB;
}

/**
 * Convert lb to kg
 */
export function lbToKg(lb: number): number {
  return lb * LB_TO_KG;
}

/**
 * Format weight for display based on current unit preference
 * @param weightKg - Weight in kilograms (internal storage format)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string with unit (e.g., "100.0 kg" or "220.5 lb")
 */
export function formatWeight(weightKg: number | null | undefined, decimals: number = 1): string {
  // Handle null/undefined values and ensure it's a valid number
  if (weightKg === null || weightKg === undefined || typeof weightKg !== 'number' || isNaN(weightKg) || !isFinite(weightKg)) {
    return '—';
  }
  
  const unitSystem = getUnitSystem();
  
  if (unitSystem === 'imperial') {
    const lb = kgToLb(weightKg);
    // Double-check the converted value is valid
    if (lb === null || lb === undefined || isNaN(lb) || !isFinite(lb)) {
      return '—';
    }
    return `${lb.toFixed(decimals)} lb`;
  }
  
  return `${weightKg.toFixed(decimals)} kg`;
}

/**
 * Format weight without unit label (for compact display)
 * @param weightKg - Weight in kilograms
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted number string
 */
export function formatWeightValue(weightKg: number, decimals: number = 1): string {
  const unitSystem = getUnitSystem();
  
  if (unitSystem === 'imperial') {
    const lb = kgToLb(weightKg);
    return lb.toFixed(decimals);
  }
  
  return weightKg.toFixed(decimals);
}

/**
 * Format weight for display without decimals for whole numbers
 * Removes unnecessary decimal places (e.g., 50.0 → 50, but 52.5 → 52.5)
 * Used in set chips and since-last-set displays
 * @param weightKg - Weight in kilograms (internal storage format)
 * @returns Formatted number string without unit, with decimals only if needed
 */
export function formatWeightForDisplay(weightKg: number | null | undefined): string {
  // Handle null/undefined values
  if (weightKg === null || weightKg === undefined || typeof weightKg !== 'number' || isNaN(weightKg) || !isFinite(weightKg)) {
    return '—';
  }
  
  const unitSystem = getUnitSystem();
  let displayValue: number;
  
  if (unitSystem === 'imperial') {
    displayValue = kgToLb(weightKg);
    // Double-check the converted value is valid
    if (displayValue === null || displayValue === undefined || isNaN(displayValue) || !isFinite(displayValue)) {
      return '—';
    }
  } else {
    displayValue = weightKg;
  }
  
  // If it's a whole number, return as integer string
  if (Number.isInteger(displayValue)) {
    return displayValue.toString();
  }
  
  // Otherwise, format with decimals and trim trailing zeros
  // Use toFixed to ensure proper decimal formatting, then remove trailing zeros
  const formatted = displayValue.toFixed(2);
  return formatted.replace(/\.?0+$/, '');
}

/**
 * Get the unit label for current preference
 */
export function getWeightUnit(): string {
  return getUnitSystem() === 'imperial' ? 'lb' : 'kg';
}

/**
 * Parse weight input from user (handles both kg and lb input based on preference)
 * Converts to kg for internal storage
 * @param input - User input string
 * @returns Weight in kilograms, or NaN if invalid
 */
export function parseWeightInput(input: string): number {
  const value = parseFloat(input.trim());
  if (isNaN(value) || value < 0) return NaN;
  
  const unitSystem = getUnitSystem();
  
  // If user enters a value, assume it's in their preferred unit
  // Convert to kg for internal storage
  if (unitSystem === 'imperial') {
    return lbToKg(value);
  }
  
  return value;
}

/**
 * Get weight increment step based on current unit preference
 * @returns Step size in the current unit system
 */
export function getWeightStep(): number {
  return getUnitSystem() === 'imperial' ? 1 : 0.5;
}

/**
 * Get weight increment step in kg (for internal calculations)
 * @returns Step size in kilograms
 */
export function getWeightStepKg(): number {
  return getUnitSystem() === 'imperial' ? lbToKg(1) : 0.5;
}

/**
 * Convert weight from kg (canonical) to display unit
 * @param weightKg - Weight in kilograms (canonical storage format)
 * @returns Weight in the current display unit
 */
export function convertKgToDisplay(weightKg: number): number {
  const unitSystem = getUnitSystem();
  if (unitSystem === 'imperial') {
    return kgToLb(weightKg);
  }
  return weightKg;
}

/**
 * Convert weight from display unit to kg (canonical)
 * @param weightDisplay - Weight in the current display unit
 * @returns Weight in kilograms (canonical storage format)
 */
export function convertDisplayToKg(weightDisplay: number): number {
  const unitSystem = getUnitSystem();
  if (unitSystem === 'imperial') {
    return lbToKg(weightDisplay);
  }
  return weightDisplay;
}

