/**
 * SVG Share Card Generator for Edge Functions
 *
 * Ported from ShareModal.svelte to be reusable in Netlify Edge Functions.
 * Generates a 1200×630 SVG card for OpenGraph sharing.
 */

import type { DecodedBuildData } from './decode-build.ts'
import { SHARE_CARD_THEMES } from './themes.ts'

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function trimText(value: string, max: number): string {
  if (value.length <= max) return value
  return `${value.slice(0, Math.max(0, max - 3))}...`
}

function shortenUrl(value: string): string {
  const normalized = value.replace(/^https?:\/\//, '')
  return trimText(normalized, 42)
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

  const personaLabel = escapeSvgText(build.presetLabel)
  const badgeLabel = escapeSvgText(build.presetLabel)
  const subtitle = escapeSvgText(build.presetSubtitle)
  const highlights = build.highlights.slice(0, 3)
  const displayUrl = escapeSvgText(shortenUrl(shareUrl))
  const statsLine = escapeSvgText(
    `${build.optimizationCount} optimizations · ${build.packageCount} apps`,
  )
  const hardwareLine = escapeSvgText(`${build.cpu} + ${build.gpu}`)
  const badgeX = width - 330
  const badgeY = 90
  const badgeW = 236
  const badgeH = 52
  const badgeNotch = 18

  const highlightLines = highlights.map((highlight, index) => {
    const y = 392 + index * 32
    return `
  <circle cx="98" cy="${y - 6}" r="4" fill="${theme.accent}" />
  <text x="112" y="${y}" fill="#d7dbe6" font-size="22">${escapeSvgText(highlight)}</text>`
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="share-bg" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${theme.bgTop}" />
      <stop offset="100%" stop-color="${theme.bgBottom}" />
    </linearGradient>
    <linearGradient id="share-panel" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.18" />
      <stop offset="55%" stop-color="${theme.accent}" stop-opacity="0.04" />
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0.28" />
    </linearGradient>
    <linearGradient id="share-accent" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.15" />
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0.45" />
    </linearGradient>
    <radialGradient id="share-glow" cx="0.12" cy="0.1" r="0.6">
      <stop offset="0%" stop-color="${theme.accent}" stop-opacity="0.6" />
      <stop offset="60%" stop-color="${theme.accent}" stop-opacity="0.12" />
      <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0" />
    </radialGradient>
    <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.06)" stroke-width="1" />
    </pattern>
    <pattern id="scanlines" width="5" height="5" patternUnits="userSpaceOnUse">
      <rect width="5" height="1" fill="rgba(255, 255, 255, 0.08)" />
    </pattern>
    <pattern id="diagonals" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
      <line x1="0" y1="0" x2="0" y2="20" stroke="rgba(255, 255, 255, 0.08)" stroke-width="2" />
    </pattern>
    <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="14" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" rx="32" fill="url(#share-bg)" />
  <rect width="${width}" height="${height}" rx="32" fill="url(#share-glow)" />
  <rect width="${width}" height="${height}" rx="32" fill="url(#grid)" opacity="0.35" />
  <rect width="${width}" height="${height}" rx="32" fill="url(#scanlines)" opacity="0.16" />

  <rect x="26" y="26" width="${width - 52}" height="${height - 52}" rx="28" fill="none" stroke="${theme.border}" stroke-width="2" />
  <rect x="58" y="58" width="${width - 116}" height="150" rx="22" fill="url(#share-panel)" />
  <polygon points="70,70 1008,70 1140,160 1140,208 70,208" fill="rgba(8, 8, 16, 0.5)" />
  <rect x="${width - 232}" y="58" width="174" height="150" fill="url(#diagonals)" opacity="0.5" />

  <text x="84" y="116" fill="#f3f4f8" font-family="JetBrains Mono, monospace" font-size="30" letter-spacing="3">ROCKTUNE</text>
  <text x="84" y="154" fill="${theme.accent}" font-family="JetBrains Mono, monospace" font-size="22">${subtitle}</text>
  <text x="84" y="190" fill="#c8cedc" font-family="JetBrains Mono, monospace" font-size="16" letter-spacing="2">CS2-READY LOADOUT</text>
  <path d="M 84 210 H 360" stroke="${theme.accent}" stroke-width="3" stroke-linecap="round" fill="none" />

  <path d="M ${badgeX + badgeNotch} ${badgeY} H ${badgeX + badgeW} L ${badgeX + badgeW + badgeNotch} ${badgeY + badgeH / 2} L ${badgeX + badgeW} ${badgeY + badgeH} H ${badgeX + badgeNotch} L ${badgeX} ${badgeY + badgeH / 2} Z" fill="${theme.badgeBg}" filter="url(#soft-glow)" />
  <text x="${badgeX + badgeW / 2 + badgeNotch / 2}" y="${badgeY + 34}" fill="${theme.badgeText}" font-family="JetBrains Mono, monospace" font-size="16" text-anchor="middle" letter-spacing="1">${badgeLabel}</text>

  <text x="84" y="272" fill="#f3f4f8" font-family="JetBrains Mono, monospace" font-size="40">${personaLabel}</text>
  <text x="84" y="314" fill="#b9bfcd" font-family="JetBrains Mono, monospace" font-size="24">${hardwareLine}</text>
  <text x="84" y="350" fill="#b9bfcd" font-family="JetBrains Mono, monospace" font-size="20">${statsLine}</text>

  <text x="84" y="382" fill="#f3f4f8" font-family="JetBrains Mono, monospace" font-size="19" letter-spacing="2">PERFORMANCE HIGHLIGHTS</text>
  ${highlightLines.join('\n')}

  <rect x="58" y="${height - 120}" width="${width - 116}" height="78" rx="18" fill="rgba(10, 12, 20, 0.72)" stroke="rgba(255, 255, 255, 0.08)" />
  <path d="M 96 ${height - 82} H 220" stroke="${theme.accent}" stroke-width="2" stroke-linecap="round" fill="none" />
  <text x="84" y="${height - 70}" fill="#cbd1dd" font-family="JetBrains Mono, monospace" font-size="18" letter-spacing="1">SHARE LINK</text>
  <text x="240" y="${height - 70}" fill="${theme.accent}" font-family="JetBrains Mono, monospace" font-size="20">${displayUrl}</text>
  <path d="M ${width - 160} ${height - 96} L ${width - 110} ${height - 96} L ${width - 80} ${height - 66}" stroke="${theme.accent}" stroke-width="2" fill="none" />
</svg>`
}
