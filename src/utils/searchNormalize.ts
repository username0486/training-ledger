/**
 * Text normalization and matching utilities for search
 * Fast, forgiving text matching without heavy ML
 */

/**
 * Normalize text for comparison
 * - lowercase
 * - trim
 * - collapse whitespace
 * - remove punctuation/special chars (optional)
 */
export function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // collapse whitespace
    .replace(/[^\w\s]/g, ''); // remove punctuation (optional: can be more lenient)
}

/**
 * Tokenize normalized text
 * Split on space and drop empty tokens
 */
export function tokenize(normalizedText: string): string[] {
  return normalizedText.split(/\s+/).filter(Boolean);
}

/**
 * Compute string match score using cheap signals
 * Returns score 0..1
 */
export function stringMatchScore(query: string, candidate: string): number {
  const normalizedQuery = normalize(query);
  const normalizedCandidate = normalize(candidate);
  
  // Exact match
  if (normalizedCandidate === normalizedQuery) {
    return 1.0;
  }
  
  // Prefix match
  if (normalizedCandidate.startsWith(normalizedQuery)) {
    return 0.8;
  }
  
  // Substring match
  if (normalizedCandidate.includes(normalizedQuery)) {
    return 0.5;
  }
  
  // Token overlap (Jaccard-like)
  const queryTokens = tokenize(normalizedQuery);
  const candidateTokens = tokenize(normalizedCandidate);
  
  if (queryTokens.length === 0 || candidateTokens.length === 0) {
    return 0;
  }
  
  const intersection = queryTokens.filter(t => candidateTokens.includes(t));
  const union = new Set([...queryTokens, ...candidateTokens]);
  const tokenOverlap = intersection.length / union.size;
  
  // Edit distance for typos (bounded, small max distance)
  const editDistanceScore = computeEditDistanceScore(normalizedQuery, normalizedCandidate);
  
  return Math.max(tokenOverlap, editDistanceScore);
}

/**
 * Compute edit distance score (Levenshtein-like)
 * Bounded to small distances for performance
 * Returns score 0..0.6 (never higher than substring match)
 */
function computeEditDistanceScore(query: string, candidate: string): number {
  const maxDistance = 3; // Only consider small typos
  const distance = levenshteinDistance(query, candidate);
  
  if (distance > maxDistance) {
    return 0;
  }
  
  // Score decreases with distance
  // distance 0 = 1.0 (exact), distance 1 = 0.6, distance 2 = 0.4, distance 3 = 0.2
  return Math.max(0, 0.6 - (distance * 0.2));
}

/**
 * Levenshtein distance (bounded for performance)
 * Only computes if strings are similar length
 */
function levenshteinDistance(str1: string, str2: string): number {
  // Quick check: if length difference is too large, skip
  if (Math.abs(str1.length - str2.length) > 3) {
    return 999; // Too different
  }
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Create matrix
  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Check if query matches any alias
 * Returns best match score
 */
export function aliasMatchScore(query: string, aliases: string[]): number {
  if (!aliases || aliases.length === 0) {
    return 0;
  }
  
  let bestScore = 0;
  for (const alias of aliases) {
    const score = stringMatchScore(query, alias);
    bestScore = Math.max(bestScore, score);
  }
  
  return bestScore;
}

