/**
 * Canvas Renderer
 * Draws all game entities to the canvas
 */

import type { Bullet, Invader, Player, Shield } from "./entities";

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2D context");
    }
    this.ctx = ctx;
  }

  clear(width: number, height: number): void {
    this.ctx.fillStyle = "oklch(0.13 0.02 285)"; // --bg-primary
    this.ctx.fillRect(0, 0, width, height);
  }

  drawPlayer(player: Player): void {
    this.ctx.fillStyle = "oklch(0.8 0.40 185)";
    this.ctx.fillRect(player.x, player.y, player.width, player.height);
  }

  drawBullet(bullet: Bullet, color: string): void {
    if (!bullet.active) return;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  }

  drawInvader(invader: Invader): void {
    if (!invader.alive) return;

    // Draw custom canvas icon instead of emoji
    this.drawBloatwareIcon(
      invader.type.id,
      invader.x,
      invader.y,
      invader.width,
    );
  }

  private drawBloatwareIcon(
    type: string,
    x: number,
    y: number,
    size: number,
  ): void {
    const gap = size * 0.04; // 4% gap between panes
    const paneWidth = (size - gap) / 2;
    const paneHeight = (size - gap) / 2;

    this.ctx.save();

    // TOP-LEFT: Red/Orange pane (with evil eyes)
    this.ctx.fillStyle = "oklch(0.70 0.40 30)";
    this.ctx.fillRect(x, y, paneWidth, paneHeight);

    // TOP-RIGHT: Green pane
    this.ctx.fillStyle = "oklch(0.70 0.35 145)";
    this.ctx.fillRect(x + paneWidth + gap, y, paneWidth, paneHeight);

    // BOTTOM-LEFT: Blue pane
    this.ctx.fillStyle = "oklch(0.65 0.35 245)";
    this.ctx.fillRect(x, y + paneHeight + gap, paneWidth, paneHeight);

    // BOTTOM-RIGHT: Yellow pane
    this.ctx.fillStyle = "oklch(0.85 0.35 95)";
    this.ctx.fillRect(
      x + paneWidth + gap,
      y + paneHeight + gap,
      paneWidth,
      paneHeight,
    );

    // Draw evil eyes in TOP-LEFT red pane
    const eyeRadius = paneWidth * 0.15;
    const eyeSpacing = paneWidth * 0.4;
    const eyeCenterY = y + paneHeight / 2;
    const leftEyeX = x + paneWidth / 2 - eyeSpacing / 2;
    const rightEyeX = x + paneWidth / 2 + eyeSpacing / 2;

    // Left eye
    this.ctx.fillStyle = "oklch(0.60 0.40 10)";
    this.ctx.beginPath();
    this.ctx.arc(leftEyeX, eyeCenterY, eyeRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Left eye glow
    this.ctx.shadowBlur = size * 0.15;
    this.ctx.shadowColor = "oklch(0.80 0.45 10)";
    this.ctx.fillStyle = "oklch(0.80 0.45 10)";
    this.ctx.beginPath();
    this.ctx.arc(leftEyeX, eyeCenterY, eyeRadius * 0.6, 0, Math.PI * 2);
    this.ctx.fill();

    // Right eye
    this.ctx.fillStyle = "oklch(0.60 0.40 10)";
    this.ctx.beginPath();
    this.ctx.arc(rightEyeX, eyeCenterY, eyeRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Right eye glow
    this.ctx.fillStyle = "oklch(0.80 0.45 10)";
    this.ctx.beginPath();
    this.ctx.arc(rightEyeX, eyeCenterY, eyeRadius * 0.6, 0, Math.PI * 2);
    this.ctx.fill();

    // Reset shadow
    this.ctx.shadowBlur = 0;

    this.ctx.restore();
  }

  drawShield(shield: Shield): void {
    if (shield.isDestroyed()) return;

    const opacity = shield.getOpacity();
    this.ctx.fillStyle = `oklch(0.92 0.40 195 / ${opacity})`; // Brighter neon-cyan with opacity
    const rect = shield.getRect();
    this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  drawText(
    text: string,
    x: number,
    y: number,
    options: { size?: number; color?: string; align?: CanvasTextAlign } = {},
  ): void {
    const { size = 20, color = "#fff", align = "left" } = options;
    this.ctx.font = `${size}px monospace`;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = align;
    this.ctx.fillText(text, x, y);
  }
}
