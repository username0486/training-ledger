/**
 * Session classification and naming utilities
 * Handles automatic classification and default naming for "Start logging" sessions
 */

import { AdHocLoggingSession, Workout } from '../types';

/**
 * Classify a session as 'exercise' (1 exercise) or 'workout' (2+ exercises)
 */
export function classifySession(exerciseCount: number): 'exercise' | 'workout' {
  return exerciseCount === 1 ? 'exercise' : 'workout';
}

/**
 * Get time-of-day label based on hour
 * Morning: 04:00-11:59
 * Afternoon: 12:00-16:59
 * Evening: 17:00-03:59
 */
export function getTimeOfDayLabel(hour: number): string {
  if (hour >= 4 && hour < 12) {
    return 'Morning workout';
  } else if (hour >= 12 && hour < 17) {
    return 'Afternoon workout';
  } else {
    return 'Evening workout';
  }
}

/**
 * Generate default name for a session based on classification and content
 */
export function generateDefaultSessionName(
  session: AdHocLoggingSession | Workout,
  exerciseCount: number
): string {
  const sessionType = classifySession(exerciseCount);
  
  if (sessionType === 'exercise') {
    // Single exercise: use exercise name
    const exercise = session.exercises[0];
    return exercise?.name || 'Exercise';
  } else {
    // Multiple exercises: use time-of-day
    const startTime = session.startTime;
    const date = new Date(startTime);
    const hour = date.getHours();
    return getTimeOfDayLabel(hour);
  }
}

/**
 * Update session classification and name if needed
 * Only updates if user hasn't manually named the session
 */
export function updateSessionClassificationAndName(
  session: AdHocLoggingSession | Workout,
  exerciseCount: number
): AdHocLoggingSession | Workout {
  const newSessionType = classifySession(exerciseCount);
  const currentSessionType = session.sessionType;
  
  // Always update classification
  const updatedSession = {
    ...session,
    sessionType: newSessionType,
  };
  
  // Only update name if user hasn't manually named it
  if (!session.isUserNamed) {
    const needsReclassification = currentSessionType !== newSessionType;
    const nameNeedsUpdate = !session.name || 
      (newSessionType === 'exercise' && session.name !== session.exercises[0]?.name) ||
      (newSessionType === 'workout' && !session.name.includes('workout'));
    
    if (needsReclassification || nameNeedsUpdate) {
      updatedSession.name = generateDefaultSessionName(updatedSession, exerciseCount);
    }
  }
  
  return updatedSession;
}
