/**
 * Get period of day from a timestamp
 * Morning: 05:00–11:59
 * Afternoon: 12:00–16:59
 * Evening: 17:00–22:59
 * Late night (23:00–04:59): defaults to "Evening"
 */
export function getPeriodOfDay(timestamp: number): 'morning' | 'afternoon' | 'evening' {
  const date = new Date(timestamp);
  const hours = date.getHours();
  
  if (hours >= 5 && hours < 12) {
    return 'morning';
  } else if (hours >= 12 && hours < 17) {
    return 'afternoon';
  } else {
    // Evening (17:00–22:59) or late night (23:00–04:59)
    return 'evening';
  }
}

/**
 * Format period of day as a workout title
 * Examples: "Morning workout", "Afternoon workout", "Evening workout"
 */
export function formatWorkoutTitle(timestamp: number): string {
  const period = getPeriodOfDay(timestamp);
  const periodLabels = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
  };
  return `${periodLabels[period]} workout`;
}
