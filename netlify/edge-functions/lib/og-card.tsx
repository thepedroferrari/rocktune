/**
 * OG Card JSX Component (Satori-compatible)
 * Converted from ShareModal.svelte buildShareCardSvg()
 *
 * Satori limitations:
 * - Only display: flex (no Grid)
 * - Only hex/rgb colors (no oklch)
 * - Limited CSS properties
 */

import React from 'https://esm.sh/react@18.2.0'
import type { DecodedBuildData } from './decode-build.ts'
import { getTheme } from './themes.ts'

export function OGCard({ build, shareUrl }: { build: DecodedBuildData; shareUrl: string }) {
  const theme = getTheme(build.presetRarity)
  const displayUrl = shortenUrl(shareUrl)
  const statsLine = `${build.optimizationCount} optimizations · ${build.packageCount} apps`
  const hardwareLine = `${build.cpu} + ${build.gpu}`

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(to bottom, ${theme.bgTop}, ${theme.bgBottom})`,
        padding: '26px',
        fontFamily: 'JetBrains Mono, monospace',
        position: 'relative',
      }}
    >
      {/* Border */}
      <div
        style={{
          position: 'absolute',
          top: '26px',
          left: '26px',
          right: '26px',
          bottom: '26px',
          border: `2px solid ${theme.border}`,
          borderRadius: '28px',
          pointerEvents: 'none',
        }}
      />

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '32px',
          flex: 1,
          position: 'relative',
        }}
      >
        {/* Header Panel */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            background: `linear-gradient(to right, ${theme.accent}30, ${theme.accent}10, ${theme.accent}40)`,
            borderRadius: '22px',
            padding: '12px 16px',
            marginBottom: '32px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '30px', color: '#f3f4f8', letterSpacing: '3px' }}>ROCKTUNE</div>
            <div style={{ fontSize: '22px', color: theme.accent }}>{build.presetSubtitle}</div>
            <div
              style={{
                fontSize: '16px',
                color: '#c8cedc',
                letterSpacing: '2px',
                marginTop: '8px',
              }}
            >
              CS2-READY LOADOUT
            </div>
            <div
              style={{
                width: '280px',
                height: '3px',
                background: theme.accent,
                borderRadius: '2px',
                marginTop: '8px',
              }}
            />
          </div>

          {/* Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: theme.badgeBg,
              color: theme.badgeText,
              padding: '12px 28px',
              fontSize: '16px',
              fontWeight: 700,
              letterSpacing: '1px',
              borderRadius: '8px',
              clipPath: 'polygon(18px 0, 100% 0, calc(100% - 18px) 100%, 0 100%)',
            }}
          >
            {build.presetLabel}
          </div>
        </div>

        {/* Build Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          <div style={{ fontSize: '40px', color: '#f3f4f8', fontWeight: 700 }}>
            {build.presetLabel}
          </div>
          <div style={{ fontSize: '24px', color: '#b9bfcd' }}>{hardwareLine}</div>
          <div style={{ fontSize: '20px', color: '#b9bfcd' }}>{statsLine}</div>
        </div>

        {/* Highlights Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '32px' }}>
          <div
            style={{
              fontSize: '19px',
              color: '#f3f4f8',
              letterSpacing: '2px',
              marginBottom: '8px',
            }}
          >
            PERFORMANCE HIGHLIGHTS
          </div>
          {build.highlights.map((highlight, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: theme.accent,
                  flexShrink: 0,
                }}
              />
              <div style={{ fontSize: '22px', color: '#d7dbe6' }}>{highlight}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: 'auto',
            background: 'rgba(10, 12, 20, 0.72)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '18px',
            padding: '16px 20px',
          }}
        >
          <div
            style={{
              width: '140px',
              height: '2px',
              background: theme.accent,
              borderRadius: '2px',
              marginBottom: '4px',
            }}
          />
          <div style={{ fontSize: '18px', color: '#cbd1dd', letterSpacing: '1px' }}>
            SHARE LINK
          </div>
          <div style={{ fontSize: '20px', color: theme.accent }}>{displayUrl}</div>
        </div>
      </div>
    </div>
  )
}

function shortenUrl(url: string): string {
  const normalized = url.replace(/^https?:\/\//, '')
  if (normalized.length <= 42) return normalized
  return `${normalized.slice(0, 39)}...`
}
