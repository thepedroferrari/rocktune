/**
 * Game Entities
 * Player, Bullet, Invader, Shield classes for Bloatware Blaster
 */

import type { BloatwareType } from "./bloatware-data";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Player ship
 */
export class Player {
  x: number;
  y: number;
  width = 40;
  height = 30;
  speed = 300; // px/s

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(dt: number, keys: Set<string>, canvasWidth: number): void {
    if (keys.has("ArrowLeft")) {
      this.x -= this.speed * dt;
    }
    if (keys.has("ArrowRight")) {
      this.x += this.speed * dt;
    }

    // Clamp to screen bounds
    this.x = Math.max(0, Math.min(canvasWidth - this.width, this.x));
  }

  getRect(): Rect {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }
}

/**
 * Player or enemy bullet
 */
export class Bullet {
  x: number;
  y: number;
  width = 3;
  height = 12;
  speed: number;
  active = false;

  constructor(x = 0, y = 0, speed = 400) {
    this.x = x;
    this.y = y;
    this.speed = speed;
  }

  update(dt: number, canvasHeight: number, direction: "up" | "down"): void {
    if (!this.active) return;

    if (direction === "up") {
      this.y -= this.speed * dt;
      if (this.y < 0) this.active = false;
    } else {
      this.y += this.speed * dt;
      if (this.y > canvasHeight) this.active = false;
    }
  }

  fire(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.active = true;
  }

  deactivate(): void {
    this.active = false;
  }

  getRect(): Rect {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }
}

/**
 * Invader (bloatware enemy)
 */
export class Invader {
  x: number;
  y: number;
  width = 50;
  height = 40;
  type: BloatwareType;
  alive = true;

  constructor(x: number, y: number, type: BloatwareType) {
    this.x = x;
    this.y = y;
    this.type = type;
  }

  update(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  destroy(): void {
    this.alive = false;
  }

  getRect(): Rect {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }
}

/**
 * Destructible shield
 */
export class Shield {
  x: number;
  y: number;
  width = 60;
  height = 40;
  maxHealth = 10;
  health = 10;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  takeDamage(): void {
    if (this.health > 0) {
      this.health--;
    }
  }

  isDestroyed(): boolean {
    return this.health <= 0;
  }

  getOpacity(): number {
    return this.health / this.maxHealth;
  }

  getRect(): Rect {
    return { x: this.x, y: this.y, width: this.width, height: this.health * 4 };
  }
}
