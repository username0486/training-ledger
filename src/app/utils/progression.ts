import { Workout } from '../types';
import { getRecentSessionsForExercise } from './storage';

export type UserFeeling = 'strong' | 'recovered' | 'fatigued';
export type SuggestionType = 'increase' | 'hold' | 'deload';

export interface ExerciseSuggestion {
  type: SuggestionType;
  label: string;
  weight: number;
  reps: number;
  rationale: string;
}

// Identify working weight from a session (heaviest weight used for majority of sets)
function getWorkingWeight(sets: Array<{ weight: number; reps: number }>): { weight: number; avgReps: number; volume: number } | null {
  if (sets.length === 0) return null;
  
  // Group sets by weight
  const weightGroups = new Map<number, number[]>();
  sets.forEach(set => {
    if (!weightGroups.has(set.weight)) {
      weightGroups.set(set.weight, []);
    }
    weightGroups.get(set.weight)!.push(set.reps);
  });
  
  // Find the heaviest weight used for at least 2 sets (or 1 if only 1 set total)
  let workingWeight = 0;
  let workingReps: number[] = [];
  
  for (const [weight, reps] of weightGroups.entries()) {
    if (weight > workingWeight && (reps.length >= 2 || sets.length === 1)) {
      workingWeight = weight;
      workingReps = reps;
    }
  }
  
  // If no weight had 2+ sets, use the heaviest weight used
  if (workingWeight === 0) {
    workingWeight = Math.max(...sets.map(s => s.weight));
    workingReps = sets.filter(s => s.weight === workingWeight).map(s => s.reps);
  }
  
  const avgReps = workingReps.reduce((sum, r) => sum + r, 0) / workingReps.length;
  const volume = sets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
  
  return { weight: workingWeight, avgReps: Math.round(avgReps), volume };
}

// Analyze recent session patterns
function analyzeRecentSessions(sessions: Array<{ sets: Array<{ weight: number; reps: number }> }>) {
  if (sessions.length === 0) {
    return { isInconsistent: false, isModerate: false, isHeavy: false, avgVolume: 0 };
  }

  const sessionData = sessions.map(session => {
    const working = getWorkingWeight(session.sets);
    if (!working) return null;
    return {
      weight: working.weight,
      avgReps: working.avgReps,
      volume: working.volume,
    };
  }).filter((s): s is { weight: number; avgReps: number; volume: number } => s !== null);

  if (sessionData.length === 0) {
    return { isInconsistent: false, isModerate: false, isHeavy: false, avgVolume: 0 };
  }

  // Check for inconsistency (weight varies by >5kg or reps vary by >3)
  const weights = sessionData.map(s => s.weight);
  const reps = sessionData.map(s => s.avgReps);
  const weightRange = Math.max(...weights) - Math.min(...weights);
  const repsRange = Math.max(...reps) - Math.min(...reps);
  const isInconsistent = weightRange > 5 || repsRange > 3;

  // Calculate average volume
  const avgVolume = sessionData.reduce((sum, s) => sum + s.volume, 0) / sessionData.length;

  // Determine if sessions are heavy (high volume/weight) or moderate
  // Using last session as baseline
  const lastSession = sessionData[0];
  const avgWeight = sessionData.reduce((sum, s) => sum + s.weight, 0) / sessionData.length;
  const isHeavy = lastSession.weight >= avgWeight + 2.5 && lastSession.volume > avgVolume * 0.9;
  const isModerate = !isHeavy && weightRange <= 2.5 && repsRange <= 1;

  return { isInconsistent, isModerate, isHeavy, avgVolume };
}

/**
 * Calculate exercise suggestions based on user feeling and recent session history
 */
export function calculateExerciseSuggestions(
  exerciseName: string,
  feeling: UserFeeling,
  allWorkouts: Workout[],
  defaultWeight: number = 20
): ExerciseSuggestion[] {
  const recentSessions = getRecentSessionsForExercise(exerciseName, allWorkouts, 3);
  
  // No history: suggest starting weight
  if (recentSessions.length === 0) {
    return [{
      type: 'hold',
      label: 'Start',
      weight: defaultWeight,
      reps: 8,
      rationale: 'Starting weight',
    }];
  }

  // Analyze recent sessions
  const analysis = analyzeRecentSessions(recentSessions);
  const lastSession = getWorkingWeight(recentSessions[0].sets);
  
  if (!lastSession) {
    return [{
      type: 'hold',
      label: 'Hold',
      weight: defaultWeight,
      reps: 8,
      rationale: 'No valid session data',
    }];
  }

  const lastWeight = lastSession.weight;
  const lastReps = lastSession.avgReps;
  const suggestions: ExerciseSuggestion[] = [];

  // Hybrid logic based on feeling + recent performance
  if (feeling === 'strong') {
    if (analysis.isModerate && !analysis.isInconsistent) {
      // Strong + recent moderate/stable → Increase
      suggestions.push({
        type: 'increase',
        label: 'Feeling Strong',
        weight: lastWeight + 2.5,
        reps: lastReps,
        rationale: 'Strong feeling + stable sessions',
      });
    } else if (analysis.isHeavy) {
      // Strong + recent heavy → Hold
      suggestions.push({
        type: 'hold',
        label: 'Hold',
        weight: lastWeight,
        reps: lastReps,
        rationale: 'Strong feeling but recent heavy sessions',
      });
    } else {
      // Default for strong: small increase or hold
      suggestions.push({
        type: 'increase',
        label: 'Feeling Strong',
        weight: lastWeight + 2.5,
        reps: lastReps,
        rationale: 'Feeling strong',
      });
    }
  } else if (feeling === 'recovered') {
    // Recovered → Hold / Small Increase
    if (analysis.isModerate && !analysis.isInconsistent) {
      suggestions.push({
        type: 'increase',
        label: 'Recovered',
        weight: lastWeight + 2.5,
        reps: lastReps,
        rationale: 'Recovered + stable sessions',
      });
    } else {
      suggestions.push({
        type: 'hold',
        label: 'Hold',
        weight: lastWeight,
        reps: lastReps,
        rationale: 'Recovered',
      });
    }
  } else if (feeling === 'fatigued') {
    // Fatigued → Deload
    suggestions.push({
      type: 'deload',
      label: 'Deload',
      weight: Math.max(lastWeight - 5, defaultWeight * 0.5),
      reps: lastReps,
      rationale: 'Feeling fatigued - reduce load',
    });
  }

  // If recent performance is inconsistent, always suggest Hold regardless of feeling
  if (analysis.isInconsistent) {
    return [{
      type: 'hold',
      label: 'Hold',
      weight: lastWeight,
      reps: lastReps,
      rationale: 'Recent inconsistent performance',
    }];
  }

  // Always provide at least one suggestion
  if (suggestions.length === 0) {
    suggestions.push({
      type: 'hold',
      label: 'Hold',
      weight: lastWeight,
      reps: lastReps,
      rationale: 'Match your last performance',
    });
  }

  return suggestions;
}







