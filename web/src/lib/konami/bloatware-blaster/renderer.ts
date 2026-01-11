/**
 * Canvas Renderer
 * Draws all game entities to the canvas
 */

import type { Bullet, Invader, Player, Shield } from './entities'

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private invaderSprite: HTMLImageElement

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get 2D context')
    }
    this.ctx = ctx

    // Load invader sprite
    this.invaderSprite = new Image()
    this.invaderSprite.src = '/bloatware-blaster/bloatware-invader.png'
  }

  clear(width: number, height: number): void {
    this.ctx.fillStyle = 'oklch(0.13 0.02 285)' // --bg-primary
    this.ctx.fillRect(0, 0, width, height)
  }

  drawPlayer(player: Player): void {
    this.ctx.fillStyle = 'oklch(0.8 0.40 185)'
    this.ctx.fillRect(player.x, player.y, player.width, player.height)
  }

  drawBullet(bullet: Bullet, color: string): void {
    if (!bullet.active) return
    this.ctx.fillStyle = color
    this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
  }

  drawInvader(invader: Invader): void {
    if (!invader.alive) return

    // Draw sprite image (only if loaded)
    if (this.invaderSprite.complete) {
      this.ctx.drawImage(this.invaderSprite, invader.x, invader.y, invader.width, invader.height)
    }
  }

  drawShield(shield: Shield): void {
    if (shield.isDestroyed()) return

    const opacity = shield.getOpacity()
    this.ctx.fillStyle = `oklch(0.92 0.40 195 / ${opacity})` // Brighter neon-cyan with opacity
    const rect = shield.getRect()
    this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
  }

  drawText(
    text: string,
    x: number,
    y: number,
    options: { size?: number; color?: string; align?: CanvasTextAlign } = {},
  ): void {
    const { size = 20, color = '#fff', align = 'left' } = options
    this.ctx.font = `${size}px monospace`
    this.ctx.fillStyle = color
    this.ctx.textAlign = align
    this.ctx.fillText(text, x, y)
  }
}
