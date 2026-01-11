/**
 * Collision Detection
 * AABB (Axis-Aligned Bounding Box) collision detection
 */

import type { Rect } from "./entities";

/**
 * Check if two rectangles intersect
 */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height &&
    a.y + a.height > b.y;
}
