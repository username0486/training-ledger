/**
 * Weight formatting and conversion utilities
 * Handles display and parsing of weights based on unit preference
 */

import { getUnitSystem, UnitSystem } from './preferences';

// Conversion constants
const KG_TO_LB = 2.20462;
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
export function formatWeight(weightKg: number, decimals: number = 1): string {
  const unitSystem = getUnitSystem();
  
  if (unitSystem === 'imperial') {
    const lb = kgToLb(weightKg);
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
  return getUnitSystem() === 'imperial' ? 0.5 : 0.25;
}

/**
 * Get weight increment step in kg (for internal calculations)
 * @returns Step size in kilograms
 */
export function getWeightStepKg(): number {
  return getUnitSystem() === 'imperial' ? lbToKg(0.5) : 0.25;
}

