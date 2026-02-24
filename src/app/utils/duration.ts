/**
 * Duration helpers for session timing.
 * Source of truth is timestamps (startedAt/endedAt), not interval drift.
 */

/** Default work time per set (seconds). */
export const DEFAULT_SET_DURATION_SEC = 40;

/** Default rest between sets for solo exercises (min–max seconds). */
export const DEFAULT_REST_MIN_SEC = 60;
export const DEFAULT_REST_MAX_SEC = 150;

/** Default rest after each full round of a group (seconds). */
export const DEFAULT_GROUP_REST_SEC = 60;

/** Default transition time between exercises within a group round (seconds). */
export const DEFAULT_TRANSITION_SEC = 15;

/** Default sets per exercise when not specified (e.g. template). */
export const DEFAULT_SETS_PER_EXERCISE = 3;

/** Between-block transition (min–max minutes) between slots. */
export const BETWEEN_SLOT_TRANSITION_MIN = 3;
export const BETWEEN_SLOT_TRANSITION_MAX = 4;

export interface DurationEstimateConfig {
  setDurationSeconds?: number;
  restMinSeconds?: number;
  restMaxSeconds?: number;
  groupRestSeconds?: number;
  transitionSeconds?: number;
  defaultSetsPerExercise?: number;
}

/**
 * Estimation input: exercise or group member with optional set count.
 * groupId links exercises into a group (superset/tri-set).
 */
export interface EstimationExercise {
  setCount?: number;
  groupId?: string | null;
}

/**
 * Returns elapsed seconds from startedAt until now (or endedAt if provided).
 */
export function getElapsedSec(startedAt: number, endedAt?: number): number {
  const start = typeof startedAt === 'number' && isFinite(startedAt) ? startedAt : 0;
  const end = typeof endedAt === 'number' && isFinite(endedAt) ? endedAt : Date.now();
  if (start <= 0) return 0;
  return Math.max(0, Math.floor((end - start) / 1000));
}

/**
 * Format duration for session timing displays:
 * - Under 1 hour (< 3600 seconds): MM:SS (e.g., 04:07, 23:59)
 * - 1 hour or more (≥ 3600 seconds): HH:MM (e.g., 1:05, 2:40)
 *
 * Rules:
 * - Minutes are always zero-padded
 * - Seconds are always zero-padded (when shown)
 * - Hours are NOT zero-padded
 * - Do NOT show seconds once hours are present
 */
export function formatDuration(elapsedSec: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedSec || 0));

  // Under 1 hour: display as MM:SS
  if (totalSeconds < 3600) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

  // 1 hour or more: display as HH:MM
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const mm = minutes.toString().padStart(2, '0');
  return `${hours}:${mm}`;
}

/**
 * Compute a persisted durationSec from timestamps.
 * Uses Math.round per requirements.
 */
export function computeDurationSec(startedAt: number, endedAt: number): number {
  if (!startedAt || !endedAt) return 0;
  return Math.max(0, Math.round((endedAt - startedAt) / 1000));
}

/**
 * Format duration range for preview display:
 * - Always shows minutes (no seconds)
 * - If duration exceeds 60 minutes, shows hours+minutes range
 * - Examples: "20–30 min", "1h 05m – 1h 15m"
 */
export function formatDurationRange(minSec: number, maxSec: number): string {
  const minMinutes = Math.floor(minSec / 60);
  const maxMinutes = Math.floor(maxSec / 60);

  // If both are under 60 minutes, show simple range
  if (maxMinutes < 60) {
    return `${minMinutes}–${maxMinutes} min`;
  }

  // If max is 60+ minutes, format both as hours+minutes (even if min < 60)
  const minHours = Math.floor(minMinutes / 60);
  const minMins = minMinutes % 60;
  const maxHours = Math.floor(maxMinutes / 60);
  const maxMins = maxMinutes % 60;

  // Format: if hours > 0, show "Xh YYm", otherwise just "YYm"
  const minStr =
    minHours > 0 ? `${minHours}h ${minMins.toString().padStart(2, '0')}m` : `${minMins}m`;
  const maxStr = `${maxHours}h ${maxMins.toString().padStart(2, '0')}m`;

  return `${minStr} – ${maxStr}`;
}

/**
 * Compute time for a solo exercise slot.
 * Time = setCount × setDuration + (setCount - 1) × rest
 */
function computeSoloSlotSec(
  setCount: number,
  setDuration: number,
  restMin: number,
  restMax: number
): { minSec: number; maxSec: number } {
  if (setCount <= 0) return { minSec: 0, maxSec: 0 };
  const workSec = setCount * setDuration;
  const restCount = Math.max(0, setCount - 1);
  return {
    minSec: workSec + restCount * restMin,
    maxSec: workSec + restCount * restMax,
  };
}

/**
 * Compute time for a group (superset/tri-set) slot.
 * - Rounds = max(setCount) among members
 * - Per round: sum(setDuration for exercises with a set) + transition between consecutive exercises
 * - Group rest after each round except the final
 */
function computeGroupSlotSec(
  members: { setCount: number }[],
  setDuration: number,
  groupRest: number,
  transition: number,
  restMin: number,
  restMax: number
): { minSec: number; maxSec: number } {
  if (members.length === 0) return { minSec: 0, maxSec: 0 };
  if (members.length === 1) {
    return computeSoloSlotSec(members[0].setCount, setDuration, restMin, restMax);
  }

  const rounds = Math.max(...members.map((m) => m.setCount), 0);
  if (rounds === 0) return { minSec: 0, maxSec: 0 };

  let totalMinSec = 0;
  let totalMaxSec = 0;

  for (let r = 0; r < rounds; r++) {
    const exercisesInRound = members
      .map((m, idx) => ({ setCount: m.setCount, idx }))
      .filter((x) => x.setCount > r)
      .sort((a, b) => a.idx - b.idx);

    if (exercisesInRound.length === 0) continue;

    const workSec = exercisesInRound.length * setDuration;
    const transitionCount = Math.max(0, exercisesInRound.length - 1);
    const roundSec = workSec + transitionCount * transition;

    totalMinSec += roundSec;
    totalMaxSec += roundSec;
  }

  const restCount = Math.max(0, rounds - 1);
  totalMinSec += restCount * groupRest;
  totalMaxSec += restCount * groupRest;

  return { minSec: totalMinSec, maxSec: totalMaxSec };
}

/**
 * Convert flat exercises (with groupId) into slots for estimation.
 * Assumes group members are contiguous. Each slot is either a solo exercise or a group.
 */
function exercisesToSlots(
  exercises: EstimationExercise[],
  defaultSets: number
): Array<{ type: 'solo'; setCount: number } | { type: 'group'; members: { setCount: number }[] }> {
  const slots: Array<
    { type: 'solo'; setCount: number } | { type: 'group'; members: { setCount: number }[] }
  > = [];
  let i = 0;

  while (i < exercises.length) {
    const ex = exercises[i];
    const setCount = ex.setCount ?? defaultSets;

    if (!ex.groupId) {
      slots.push({ type: 'solo', setCount });
      i++;
    } else {
      const members: { setCount: number }[] = [];
      const gid = ex.groupId;
      while (i < exercises.length && exercises[i].groupId === gid) {
        members.push({ setCount: exercises[i].setCount ?? defaultSets });
        i++;
      }
      slots.push({ type: 'group', members });
    }
  }

  return slots;
}

/**
 * Estimate total duration from slots using config.
 */
function estimateFromSlots(
  slots: Array<{ type: 'solo'; setCount: number } | { type: 'group'; members: { setCount: number }[] }>,
  config: Required<DurationEstimateConfig>
): { minSec: number; maxSec: number } {
  const {
    setDurationSeconds,
    restMinSeconds,
    restMaxSeconds,
    groupRestSeconds,
    transitionSeconds,
  } = config;

  let totalMinSec = 0;
  let totalMaxSec = 0;

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    let slotMin: number;
    let slotMax: number;

    if (slot.type === 'solo') {
      const result = computeSoloSlotSec(
        slot.setCount,
        setDurationSeconds,
        restMinSeconds,
        restMaxSeconds
      );
      slotMin = result.minSec;
      slotMax = result.maxSec;
    } else {
      const result = computeGroupSlotSec(
        slot.members,
        setDurationSeconds,
        groupRestSeconds,
        transitionSeconds,
        restMinSeconds,
        restMaxSeconds
      );
      slotMin = result.minSec;
      slotMax = result.maxSec;
    }

    totalMinSec += slotMin;
    totalMaxSec += slotMax;

    if (i < slots.length - 1) {
      totalMinSec += BETWEEN_SLOT_TRANSITION_MIN * 60;
      totalMaxSec += BETWEEN_SLOT_TRANSITION_MAX * 60;
    }
  }

  return { minSec: totalMinSec, maxSec: totalMaxSec };
}

/**
 * Estimate workout duration range for preview.
 * - If prior completion exists: use last duration ±5 min
 * - Otherwise: slot-based heuristic with group-aware logic
 *
 * Groups (supersets/tri-sets): estimated as rounds with rest after each full round.
 * Solo exercises: rest after each set as usual.
 *
 * @param templateId - For prior-workout lookup
 * @param exerciseCountOrExercises - Legacy: number of solo exercises. New: array with groupId/setCount
 * @param completedWorkouts - For prior duration
 * @param config - Optional tuning (setDuration, rest, groupRest, transition)
 */
export function estimateWorkoutDuration(
  templateId: string,
  exerciseCountOrExercises: number | EstimationExercise[],
  completedWorkouts: Array<{ templateId?: string; durationSec?: number; endedAt?: number }>,
  config?: DurationEstimateConfig
): { minSec: number; maxSec: number } | null {
  const cfg: Required<DurationEstimateConfig> = {
    setDurationSeconds: config?.setDurationSeconds ?? DEFAULT_SET_DURATION_SEC,
    restMinSeconds: config?.restMinSeconds ?? DEFAULT_REST_MIN_SEC,
    restMaxSeconds: config?.restMaxSeconds ?? DEFAULT_REST_MAX_SEC,
    groupRestSeconds: config?.groupRestSeconds ?? DEFAULT_GROUP_REST_SEC,
    transitionSeconds: config?.transitionSeconds ?? DEFAULT_TRANSITION_SEC,
    defaultSetsPerExercise: config?.defaultSetsPerExercise ?? DEFAULT_SETS_PER_EXERCISE,
  };

  let slots: Array<
    { type: 'solo'; setCount: number } | { type: 'group'; members: { setCount: number }[] }
  >;

  if (typeof exerciseCountOrExercises === 'number') {
    const count = exerciseCountOrExercises;
    if (count <= 0) return null;
    slots = Array.from({ length: count }, () => ({
      type: 'solo' as const,
      setCount: cfg.defaultSetsPerExercise,
    }));
  } else {
    const exercises = exerciseCountOrExercises;
    if (exercises.length === 0) return null;
    slots = exercisesToSlots(exercises, cfg.defaultSetsPerExercise);
  }

  if (slots.length === 0) return null;

  const priorWorkouts = completedWorkouts
    .filter((w) => w.templateId === templateId && w.durationSec !== undefined && w.durationSec > 0)
    .sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));

  if (priorWorkouts.length > 0 && priorWorkouts[0].durationSec !== undefined) {
    const baseSec = priorWorkouts[0].durationSec;
    const baseMin = Math.round(baseSec / 60);
    const minMin = Math.max(5, baseMin - 5);
    const maxMin = baseMin + 5;
    return {
      minSec: minMin * 60,
      maxSec: maxMin * 60,
    };
  }

  const result = estimateFromSlots(slots, cfg);
  return {
    minSec: Math.ceil(result.minSec / 60) * 60,
    maxSec: Math.ceil(result.maxSec / 60) * 60,
  };
}
