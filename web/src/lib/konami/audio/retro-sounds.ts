/**
 * Retro Sound Effects
 * 8-bit style game sounds synthesized with Web Audio API
 */

import { playFrequencySweep, playNoise, playTone } from "./audio-engine";

/**
 * Blip sound - for year countdown ticks
 */
export function playBlip(year: number): void {
  // Descending frequency based on year (800Hz → 320Hz)
  const frequency = 800 - (2026 - year) * 10;
  playTone(frequency, 0.05, "square", 0.2);
}

/**
 * Shoot sound - player fires bullet
 */
export function playShoot(): void {
  playFrequencySweep(1000, 100, 0.1, "sawtooth", 0.3);
}

/**
 * Explosion sound - invader destroyed
 */
export function playExplosion(): void {
  playNoise(0.2, 2000, 100, 0.25);
}

/**
 * Thunk sound - deep bass for screen bloop
 */
export function playThunk(): void {
  playTone(60, 0.3, "sine", 0.4);
}

/**
 * Powerup sound - countdown complete
 */
export function playPowerup(): void {
  playFrequencySweep(200, 800, 0.4, "square", 0.3);
}

/**
 * Hit sound - shield or player hit
 */
export function playHit(): void {
  playNoise(0.15, 1500, 80, 0.2);
}

/**
 * Enemy shoot sound - invader fires
 */
export function playEnemyShoot(): void {
  playFrequencySweep(800, 200, 0.12, "sawtooth", 0.2);
}

/**
 * Game over sound - sad trombone
 */
export function playGameOver(): void {
  playFrequencySweep(400, 100, 1.0, "triangle", 0.25);
}
