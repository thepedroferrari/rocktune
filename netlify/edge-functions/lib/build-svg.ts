/**
 * SVG Share Card Generator for Edge Functions
 *
 * Generates a 1200×630 OG image with RockTune's cyberpunk aesthetic.
 * Redesigned to match the app's design system - cyber corners, neon glows, proper hierarchy.
 */

import type { DecodedBuildData } from './decode-build.ts'
import { SHARE_CARD_THEMES } from './themes.ts'

// Meme taglines per preset
const PRESET_TAGLINES: Record<string, string> = {
  'Pro Gamer': 'Download more frags',
  'Streamer': 'Download more viewers',
  'Casual': 'Download more fps',
  'Minimal': 'Download more peace',
  'Benchmark': 'Download more scores',
  'Privacy First': 'Download more privacy',
  'Ludicrous': 'Download more chaos',
  'Custom Build': 'Download more fps',
}

function getTagline(presetLabel: string): string {
  return PRESET_TAGLINES[presetLabel] ?? PRESET_TAGLINES['Custom Build']
}

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function buildShareCardSvg(
  build: DecodedBuildData,
  shareUrl: string,
): string {
  const width = 1200
  const height = 630

  // Get theme based on rarity
  const theme =
    build.presetRarity && SHARE_CARD_THEMES[build.presetRarity]
      ? SHARE_CARD_THEMES[build.presetRarity]
      : SHARE_CARD_THEMES.common

  // Design system colors
  const bgDark = '#1a1a24'
  const bgCard = '#1f1f2e'
  const textPrimary = '#f3f4f8'
  const textSecondary = '#b9bfcd'
  const textMuted = '#6b7280'
  const border = '#2d2d3d'
  const cyberYellow = '#f0d95c'

  // Content
  const presetLabel = escapeSvgText(build.presetLabel)
  const tagline = escapeSvgText(getTagline(build.presetLabel))
  const hardwareLine = escapeSvgText(`${build.cpu} + ${build.gpu}`)
  const statsLine = escapeSvgText(
    `${build.optimizationCount} optimizations · ${build.packageCount} ${build.packageCount === 1 ? 'app' : 'apps'}`,
  )
  const highlights = build.highlights.slice(0, 3)

  // Cyber clip-path coordinates (24px cuts on corners)
  const outerPoints = '24,0 1176,0 1200,24 1200,606 1176,630 24,630 0,606 0,24'
  const innerPoints = '40,16 1160,16 1184,40 1184,590 1160,614 40,614 16,590 16,40'

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <!-- Background gradient -->
    <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${bgDark}" />
      <stop offset="100%" stop-color="${bgCard}" />
    </linearGradient>

    <!-- Radial glow (top-left accent glow) -->
    <radialGradient id="glow" cx="0.15" cy="0.15" r="0.5">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.2" />
      <stop offset="60%" stop-color="${theme.accent}" stop-opacity="0.05" />
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0" />
    </radialGradient>

    <!-- Subtle grid pattern -->
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.03)" stroke-width="1" />
    </pattern>

    <!-- Scanline pattern -->
    <pattern id="scanlines" width="1" height="4" patternUnits="userSpaceOnUse">
      <rect width="1" height="1" y="0" fill="rgba(255, 255, 255, 0.02)" />
    </pattern>

    <!-- Neon glow filter -->
    <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Stronger glow for logo -->
    <filter id="strong-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Background with cyber corners -->
  <polygon points="${outerPoints}" fill="url(#bg)" />

  <!-- Radial accent glow -->
  <polygon points="${outerPoints}" fill="url(#glow)" />

  <!-- Grid overlay -->
  <polygon points="${outerPoints}" fill="url(#grid)" />

  <!-- Scanlines overlay -->
  <polygon points="${outerPoints}" fill="url(#scanlines)" />

  <!-- Inner border with cyber corners -->
  <polygon points="${innerPoints}" fill="none" stroke="${theme.accent}" stroke-width="2" stroke-opacity="0.3" />

  <!-- Corner accent triangles -->
  <polygon points="0,0 24,0 0,24" fill="${theme.accent}" opacity="0.12" />
  <polygon points="1176,630 1200,630 1200,606" fill="${theme.accent}" opacity="0.12" />

  <!-- ROCKTUNE logo (cyber-yellow with glow) -->
  <text x="64" y="85" fill="${cyberYellow}" font-family="JetBrains Mono, monospace" font-size="32" font-weight="700" letter-spacing="0.12em" filter="url(#strong-glow)">ROCKTUNE</text>

  <!-- Meme tagline (accent color) -->
  <text x="64" y="120" fill="${theme.accent}" font-family="JetBrains Mono, monospace" font-size="20" letter-spacing="0.02em">${tagline}</text>

  <!-- Accent underline under tagline -->
  <line x1="64" y1="135" x2="320" y2="135" stroke="${theme.accent}" stroke-width="2" stroke-opacity="0.4" stroke-linecap="round" />

  <!-- Large preset name (main focus) -->
  <text x="64" y="230" fill="${textPrimary}" font-family="JetBrains Mono, monospace" font-size="52" font-weight="700" letter-spacing="-0.02em">${presetLabel}</text>

  <!-- Hardware line -->
  <text x="64" y="280" fill="${textSecondary}" font-family="JetBrains Mono, monospace" font-size="20">${hardwareLine}</text>

  <!-- Stats line -->
  <text x="64" y="315" fill="${textMuted}" font-family="JetBrains Mono, monospace" font-size="18">${statsLine}</text>

  <!-- Accent divider -->
  <line x1="64" y1="345" x2="520" y2="345" stroke="${theme.accent}" stroke-width="2" stroke-opacity="0.3" stroke-linecap="round" />

  <!-- Highlights section -->
  <g id="highlights" transform="translate(64, 385)">
    ${highlights
      .map(
        (highlight, index) => {
          const y = index * 40
          return `
    <!-- Highlight ${index + 1} -->
    <circle cx="10" cy="${y}" r="6" fill="${theme.accent}" opacity="0.8" filter="url(#neon-glow)" />
    <text x="32" y="${y + 6}" fill="${textSecondary}" font-family="JetBrains Mono, monospace" font-size="20">${escapeSvgText(highlight)}</text>`
        },
      )
      .join('')}
  </g>

  <!-- Decorative corner lines (cyber aesthetic) -->
  <path d="M 1136 16 L 1184 16 L 1184 64" stroke="${theme.accent}" stroke-width="2" stroke-opacity="0.2" fill="none" />
  <path d="M 16 566 L 16 614 L 64 614" stroke="${theme.accent}" stroke-width="2" stroke-opacity="0.2" fill="none" />
</svg>`
}
