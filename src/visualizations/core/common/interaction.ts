/**
 * Universal Interaction & Transform Gizmo Core
 *
 * Provides shared timing constants, animation easing curves, zero-jump relative
 * displacement solvers, and coordinate projection math for both 2D and 3D scenes.
 */

export const FADE_DELAY_MS = 1200;
export const FADE_DURATION_MS = 500;
export const FADE_EASE_EXPONENT = 1.2;

/**
 * Computes opacity with grace period delay and power easing curve:
 * - When elapsed < delayMs: return 1.0 (full brightness stay)
 * - When elapsed in [delayMs, delayMs + durationMs]: return eased opacity (1.0 -> 0.0)
 * - When elapsed >= delayMs + durationMs: return 0.0
 */
export function computeFadeOpacity(
  elapsedMs: number,
  delayMs = FADE_DELAY_MS,
  durationMs = FADE_DURATION_MS,
): number {
  if (elapsedMs <= delayMs) return 1.0;
  if (elapsedMs >= delayMs + durationMs) return 0.0;
  const progress = (elapsedMs - delayMs) / durationMs;
  const eased =
    1.0 - Math.pow(Math.max(0, Math.min(1, progress)), FADE_EASE_EXPONENT);
  return Math.max(0, Math.min(1, eased));
}

/**
 * Projects a 2D delta displacement onto a unit direction vector:
 *   deltaProj = (delta . dir) * dir
 */
export function projectDeltaToDirection2D(
  deltaX: number,
  deltaY: number,
  dirX: number,
  dirY: number,
): { dx: number; dy: number } {
  const len = Math.hypot(dirX, dirY);
  if (len < 1e-6) return { dx: 0, dy: 0 };
  const uX = dirX / len;
  const uY = dirY / len;
  const dot = deltaX * uX + deltaY * uY;
  return { dx: dot * uX, dy: dot * uY };
}
