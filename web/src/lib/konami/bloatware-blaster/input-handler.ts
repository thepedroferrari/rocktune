/**
 * Input Handler
 * Keyboard input management for game controls
 */

export type GameMode = "normal" | "rocktunned";

export class InputHandler {
  private keys = new Set<string>();
  private lastShootTime = 0;
  private shootCooldown: number;

  constructor(mode: GameMode = "normal") {
    // Normal: 500ms cooldown (classic Space Invaders)
    // Rocktunned: 100ms cooldown (machine gun mode!)
    this.shootCooldown = mode === "rocktunned" ? 100 : 500;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  start(): void {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  stop(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.keys.clear();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (["ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
      this.keys.add(e.code);
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  isPressed(key: string): boolean {
    return this.keys.has(key);
  }

  getKeys(): Set<string> {
    return this.keys;
  }

  canShoot(): boolean {
    const now = Date.now();
    if (now - this.lastShootTime >= this.shootCooldown) {
      this.lastShootTime = now;
      return true;
    }
    return false;
  }
}
