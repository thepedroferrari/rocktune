/**
 * Bloatware Blaster Game Engine
 * Core game loop, entity management, collision detection, win/lose conditions
 */

import {
  playEnemyShoot,
  playExplosion,
  playGameOver,
  playHit,
  playShoot,
} from "../audio/retro-sounds";
import { getBloatwareType } from "./bloatware-data";
import { rectsIntersect } from "./collision";
import { Bullet, Invader, Player, Shield } from "./entities";
import type { GameMode, InputHandler } from "./input-handler";
import type { Renderer } from "./renderer";

const INVADER_ROWS = 5;
const INVADER_COLS = 11;
const INVADER_START_X = 100;
const INVADER_START_Y = 50;
const INVADER_SPACING_X = 60;
const INVADER_SPACING_Y = 40;
const INVADER_BASE_SPEED = 6; // px/s (5x slower for better gameplay)
const INVADER_SPEED_INCREASE = 0.15; // 15% increase per row destroyed
const INVADER_MOVE_DELAY = 20; // frames (smoother movement)
const INVADER_DROP_DISTANCE = 20;
const MAX_PLAYER_BULLETS = 10;
const MAX_ENEMY_BULLETS = 20;
const ENEMY_SHOOT_DELAY = 60; // frames
const ENEMY_SHOOT_CHANCE = 0.01; // 1% per frame
const SHIELD_COUNT = 4;
const SHIELD_START_X = 150;
const SHIELD_Y = 450;
const SHIELD_SPACING = 150;
const PLAYER_START_LIVES = 3;

export type GameStatus = "playing" | "won" | "lost";

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private input: InputHandler;

  // Game entities
  private player: Player;
  private bullets: Bullet[] = [];
  private enemyBullets: Bullet[] = [];
  private invaders: Invader[] = [];
  private shields: Shield[] = [];

  // Game state
  private score = 0;
  private lives = PLAYER_START_LIVES;
  private status: GameStatus = "playing";
  private invaderDirection = 1; // 1 = right, -1 = left
  private invaderSpeed = INVADER_BASE_SPEED;
  private moveTimer = 0;
  private enemyShootTimer = 0;

  // Animation loop
  private lastTime = 0;
  private animationFrame: number | null = null;

  // Callbacks
  private onScoreChange?: (score: number) => void;
  private onLivesChange?: (lives: number) => void;
  private onStatusChange?: (status: GameStatus) => void;

  constructor(
    canvas: HTMLCanvasElement,
    renderer: Renderer,
    input: InputHandler,
    private mode: GameMode = "normal",
  ) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.input = input;

    // Initialize player
    const playerX = canvas.width / 2 - 20;
    const playerY = canvas.height - 60;
    this.player = new Player(playerX, playerY);

    // Initialize bullets
    for (let i = 0; i < MAX_PLAYER_BULLETS; i++) {
      this.bullets.push(new Bullet());
    }
    for (let i = 0; i < MAX_ENEMY_BULLETS; i++) {
      this.enemyBullets.push(new Bullet(0, 0, 200));
    }

    // Initialize shields
    for (let i = 0; i < SHIELD_COUNT; i++) {
      const x = SHIELD_START_X + i * SHIELD_SPACING;
      this.shields.push(new Shield(x, SHIELD_Y));
    }

    // Initialize invaders
    for (let row = 0; row < INVADER_ROWS; row++) {
      for (let col = 0; col < INVADER_COLS; col++) {
        const x = INVADER_START_X + col * INVADER_SPACING_X;
        const y = INVADER_START_Y + row * INVADER_SPACING_Y;
        const type = getBloatwareType(row);
        this.invaders.push(new Invader(x, y, type));
      }
    }
  }

  setCallbacks(callbacks: {
    onScoreChange?: (score: number) => void;
    onLivesChange?: (lives: number) => void;
    onStatusChange?: (status: GameStatus) => void;
  }): void {
    this.onScoreChange = callbacks.onScoreChange;
    this.onLivesChange = callbacks.onLivesChange;
    this.onStatusChange = callbacks.onStatusChange;
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  getScore(): number {
    return this.score;
  }

  getLives(): number {
    return this.lives;
  }

  getStatus(): GameStatus {
    return this.status;
  }

  private loop = (now: number): void => {
    const dt = Math.min((now - this.lastTime) / 1000, 0.1); // Cap at 100ms
    this.lastTime = now;

    this.update(dt);
    this.render();

    if (this.status === "playing") {
      this.animationFrame = requestAnimationFrame(this.loop);
    }
  };

  private update(dt: number): void {
    // Update player
    this.player.update(dt, this.input.getKeys(), this.canvas.width);

    // Player shooting
    if (this.input.isPressed("Space") && this.input.canShoot()) {
      for (const bullet of this.bullets) {
        if (!bullet.active) {
          bullet.fire(
            this.player.x + this.player.width / 2 - bullet.width / 2,
            this.player.y,
          );
          playShoot();
          break;
        }
      }
    }

    // Update bullets
    for (const bullet of this.bullets) {
      bullet.update(dt, this.canvas.height, "up");
    }
    for (const bullet of this.enemyBullets) {
      bullet.update(dt, this.canvas.height, "down");
    }

    // Check bullet collisions with invaders
    for (const bullet of this.bullets) {
      if (bullet.active) {
        for (const invader of this.invaders) {
          if (
            invader.alive && rectsIntersect(bullet.getRect(), invader.getRect())
          ) {
            bullet.deactivate();
            invader.destroy();
            this.score += 10;
            this.onScoreChange?.(this.score);
            playExplosion();
            break;
          }
        }

        // Check bullet collisions with shields
        for (const shield of this.shields) {
          if (
            !shield.isDestroyed() &&
            rectsIntersect(bullet.getRect(), shield.getRect())
          ) {
            bullet.deactivate();
            shield.takeDamage();
            playHit();
            break;
          }
        }
      }
    }

    // Check enemy bullet collisions with player
    for (const bullet of this.enemyBullets) {
      if (
        bullet.active && rectsIntersect(bullet.getRect(), this.player.getRect())
      ) {
        bullet.deactivate();
        this.loseLife();
        break;
      }
    }

    // Check enemy bullet collisions with shields
    for (const bullet of this.enemyBullets) {
      if (bullet.active) {
        for (const shield of this.shields) {
          if (
            !shield.isDestroyed() &&
            rectsIntersect(bullet.getRect(), shield.getRect())
          ) {
            bullet.deactivate();
            shield.takeDamage();
            playHit();
            break;
          }
        }
      }
    }

    // Enemy shooting
    this.enemyShootTimer++;
    if (this.enemyShootTimer >= ENEMY_SHOOT_DELAY) {
      this.enemyShootTimer = 0;
      const aliveInvaders = this.invaders.filter((inv) => inv.alive);

      if (aliveInvaders.length > 0 && Math.random() < ENEMY_SHOOT_CHANCE) {
        const shooter =
          aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];

        for (const bullet of this.enemyBullets) {
          if (!bullet.active) {
            bullet.fire(
              shooter.x + shooter.width / 2 - bullet.width / 2,
              shooter.y + shooter.height,
            );
            playEnemyShoot();
            break;
          }
        }
      }
    }

    // Move invaders
    this.moveTimer++;
    if (this.moveTimer >= INVADER_MOVE_DELAY) {
      this.moveTimer = 0;
      this.moveInvaders(dt);
    }

    // Check win/lose conditions
    this.checkWinLose();
  }

  private moveInvaders(dt: number): void {
    const aliveInvaders = this.invaders.filter((inv) => inv.alive);
    if (aliveInvaders.length === 0) return;

    // Check if any invader hit the edge
    let hitEdge = false;
    for (const invader of aliveInvaders) {
      const nextX = invader.x +
        this.invaderSpeed * this.invaderDirection * dt * 60;
      if (nextX < 0 || nextX + invader.width > this.canvas.width) {
        hitEdge = true;
        break;
      }
    }

    if (hitEdge) {
      // Reverse direction and drop down
      this.invaderDirection *= -1;
      for (const invader of this.invaders) {
        invader.update(0, INVADER_DROP_DISTANCE);
      }
    } else {
      // Move horizontally
      const dx = this.invaderSpeed * this.invaderDirection * dt * 60;
      for (const invader of this.invaders) {
        invader.update(dx, 0);
      }
    }

    // Update speed based on remaining invaders (classic Space Invaders)
    const percentRemaining = aliveInvaders.length /
      (INVADER_ROWS * INVADER_COLS);
    this.invaderSpeed = INVADER_BASE_SPEED *
      (1 + (1 - percentRemaining) * INVADER_SPEED_INCREASE * 5);
  }

  private checkWinLose(): void {
    // Check if all invaders destroyed (win)
    const aliveCount = this.invaders.filter((inv) => inv.alive).length;
    if (aliveCount === 0) {
      this.status = "won";
      this.onStatusChange?.(this.status);
      this.stop();
      return;
    }

    // Check if any invader reached player Y (lose)
    for (const invader of this.invaders) {
      if (invader.alive && invader.y + invader.height >= this.player.y) {
        this.status = "lost";
        this.onStatusChange?.(this.status);
        this.stop();
        playGameOver();
        return;
      }
    }
  }

  private loseLife(): void {
    this.lives--;
    this.onLivesChange?.(this.lives);
    playHit();

    if (this.lives <= 0) {
      this.status = "lost";
      this.onStatusChange?.(this.status);
      this.stop();
      playGameOver();
    }
  }

  private render(): void {
    this.renderer.clear(this.canvas.width, this.canvas.height);

    // Draw shields
    for (const shield of this.shields) {
      this.renderer.drawShield(shield);
    }

    // Draw invaders
    for (const invader of this.invaders) {
      this.renderer.drawInvader(invader);
    }

    // Draw player
    this.renderer.drawPlayer(this.player);

    // Draw bullets
    for (const bullet of this.bullets) {
      this.renderer.drawBullet(bullet, "oklch(0.92 0.2 100)"); // --neon-yellow
    }
    for (const bullet of this.enemyBullets) {
      this.renderer.drawBullet(bullet, "oklch(0.72 0.18 10)"); // --risky (red)
    }
  }
}
