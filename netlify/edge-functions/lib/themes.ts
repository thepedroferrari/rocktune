/**
 * Share card themes extracted from ShareModal.svelte
 * Colors are in hex/rgba format for Satori compatibility
 */

export interface ShareCardTheme {
  accent: string
  accentSoft: string
  badgeBg: string
  badgeText: string
  bgTop: string
  bgBottom: string
  border: string
}

export const SHARE_CARD_THEMES: Record<string, ShareCardTheme> = {
  legendary: {
    accent: '#ffb24a',
    accentSoft: 'rgba(255, 178, 74, 0.25)',
    badgeBg: '#ffb24a',
    badgeText: '#1b1206',
    bgTop: '#120704',
    bgBottom: '#0b0c14',
    border: 'rgba(255, 178, 74, 0.5)',
  },
  epic: {
    accent: '#b678ff',
    accentSoft: 'rgba(182, 120, 255, 0.24)',
    badgeBg: '#b678ff',
    badgeText: '#140824',
    bgTop: '#090612',
    bgBottom: '#090c16',
    border: 'rgba(182, 120, 255, 0.5)',
  },
  rare: {
    accent: '#5dd1ff',
    accentSoft: 'rgba(93, 209, 255, 0.22)',
    badgeBg: '#5dd1ff',
    badgeText: '#061826',
    bgTop: '#06101c',
    bgBottom: '#091019',
    border: 'rgba(93, 209, 255, 0.45)',
  },
  uncommon: {
    accent: '#5cf2b0',
    accentSoft: 'rgba(92, 242, 176, 0.2)',
    badgeBg: '#5cf2b0',
    badgeText: '#062115',
    bgTop: '#04120c',
    bgBottom: '#081318',
    border: 'rgba(92, 242, 176, 0.42)',
  },
  common: {
    accent: '#a8a8a8',
    accentSoft: 'rgba(168, 168, 168, 0.2)',
    badgeBg: '#2b2b2b',
    badgeText: '#e6e6e6',
    bgTop: '#0b0b0f',
    bgBottom: '#0c0c14',
    border: 'rgba(255, 255, 255, 0.16)',
  },
}

export function getTheme(rarity?: string): ShareCardTheme {
  if (rarity && SHARE_CARD_THEMES[rarity]) {
    return SHARE_CARD_THEMES[rarity]
  }
  return SHARE_CARD_THEMES.common
}
