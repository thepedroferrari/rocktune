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
    this.ctx.fillStyle = "oklch(0.92 0.25 195)"; // Brighter neon-cyan
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
    const centerX = x + size / 2;
    const centerY = y + size / 2;

    this.ctx.save();

    switch (type) {
      case "telemetry": // 📡 Satellite dish
        // Draw antenna
        this.ctx.strokeStyle = "oklch(0.8 0.2 20)"; // Bright orange
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, size * 0.3, Math.PI, 0); // Dish arc
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY);
        this.ctx.lineTo(centerX, centerY + size * 0.4); // Pole
        this.ctx.stroke();
        // Draw signal waves
        this.ctx.lineWidth = 2;
        for (let i = 1; i <= 3; i++) {
          this.ctx.beginPath();
          this.ctx.arc(
            centerX,
            centerY - size * 0.15,
            size * 0.15 * i,
            -Math.PI * 0.3,
            -Math.PI * 0.7,
            true,
          );
          this.ctx.stroke();
        }
        break;

      case "cortana": // 🎤 Microphone
        this.ctx.fillStyle = "oklch(0.75 0.25 250)"; // Bright purple
        // Mic capsule
        this.ctx.beginPath();
        this.ctx.ellipse(
          centerX,
          centerY - size * 0.15,
          size * 0.2,
          size * 0.3,
          0,
          0,
          Math.PI * 2,
        );
        this.ctx.fill();
        // Mic stand
        this.ctx.fillRect(
          centerX - size * 0.05,
          centerY + size * 0.15,
          size * 0.1,
          size * 0.2,
        );
        // Base
        this.ctx.beginPath();
        this.ctx.arc(
          centerX,
          centerY + size * 0.35,
          size * 0.15,
          0,
          Math.PI * 2,
        );
        this.ctx.fill();
        break;

      case "onedrive": // ☁️ Cloud
        this.ctx.fillStyle = "oklch(0.9 0.15 210)"; // Bright blue
        // Cloud shape (3 overlapping circles)
        this.ctx.beginPath();
        this.ctx.arc(
          centerX - size * 0.15,
          centerY,
          size * 0.2,
          0,
          Math.PI * 2,
        );
        this.ctx.arc(
          centerX,
          centerY - size * 0.1,
          size * 0.25,
          0,
          Math.PI * 2,
        );
        this.ctx.arc(
          centerX + size * 0.15,
          centerY,
          size * 0.2,
          0,
          Math.PI * 2,
        );
        this.ctx.fill();
        break;

      case "search": // 🔍 Magnifying glass
        this.ctx.strokeStyle = "oklch(0.85 0.3 330)"; // Bright magenta
        this.ctx.lineWidth = 3;
        // Glass circle
        this.ctx.beginPath();
        this.ctx.arc(
          centerX - size * 0.1,
          centerY - size * 0.1,
          size * 0.25,
          0,
          Math.PI * 2,
        );
        this.ctx.stroke();
        // Handle
        this.ctx.beginPath();
        this.ctx.moveTo(centerX + size * 0.1, centerY + size * 0.1);
        this.ctx.lineTo(centerX + size * 0.3, centerY + size * 0.3);
        this.ctx.stroke();
        break;

      case "xbox": // 🎮 Game controller
        this.ctx.fillStyle = "oklch(0.8 0.2 160)"; // Bright teal
        // Controller body
        this.ctx.beginPath();
        this.ctx.roundRect(
          centerX - size * 0.3,
          centerY - size * 0.15,
          size * 0.6,
          size * 0.3,
          size * 0.1,
        );
        this.ctx.fill();
        // D-pad (left)
        this.ctx.fillStyle = "oklch(0.3 0.05 160)";
        this.ctx.fillRect(
          centerX - size * 0.2,
          centerY - size * 0.05,
          size * 0.1,
          size * 0.1,
        );
        // Buttons (right)
        this.ctx.beginPath();
        this.ctx.arc(
          centerX + size * 0.15,
          centerY,
          size * 0.05,
          0,
          Math.PI * 2,
        );
        this.ctx.fill();
        break;
    }

    this.ctx.restore();
  }

  drawShield(shield: Shield): void {
    if (shield.isDestroyed()) return;

    const opacity = shield.getOpacity();
    this.ctx.fillStyle = `oklch(0.92 0.25 195 / ${opacity})`; // Brighter neon-cyan with opacity
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
