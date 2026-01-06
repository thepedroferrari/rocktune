/**
 * Netlify Edge Function: Dynamic OG Image Generator
 *
 * Generates Open Graph images for RockTune build shares.
 * URL format: /og?b=1.{compressed_build_data}
 *
 * Uses og_edge (Deno-native Satori wrapper) to render JSX to PNG
 */

import React from 'https://esm.sh/react@18.2.0'
import { ImageResponse } from 'https://deno.land/x/og_edge@0.0.6/mod.ts'
import { decodeBuildFromQuery } from './lib/decode-build.ts'
import { OGCard } from './lib/og-card.tsx'

export default async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url)
    const buildParam = url.searchParams.get('b')

    // No build param - redirect to fallback static image
    if (!buildParam) {
      console.log('[OG] No build param, redirecting to fallback')
      return Response.redirect(new URL('/og/default.png', req.url).href, 302)
    }

    // Decode build data
    const result = decodeBuildFromQuery(buildParam)
    if (!result.success) {
      console.log(`[OG] Decode failed: ${result.error}`)
      return Response.redirect(new URL('/og/default.png', req.url).href, 302)
    }

    const build = result.data
    console.log(`[OG] Generating image for: ${build.presetLabel} (${build.cpu} + ${build.gpu})`)

    // Load JetBrains Mono font
    const fontUrl = new URL('/fonts/jetbrains-mono-latin.woff2', req.url)
    const fontResponse = await fetch(fontUrl)

    if (!fontResponse.ok) {
      console.log('[OG] Font load failed, using fallback')
      return Response.redirect(new URL('/og/default.png', req.url).href, 302)
    }

    const fontData = await fontResponse.arrayBuffer()

    // Generate image
    const shareUrl = url.origin + '/?b=' + encodeURIComponent(buildParam)

    return new ImageResponse(<OGCard build={build} shareUrl={shareUrl} />, {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'JetBrains Mono',
          data: fontData,
          weight: 400,
          style: 'normal',
        },
        {
          name: 'JetBrains Mono',
          data: fontData,
          weight: 700,
          style: 'normal',
        },
      ],
      headers: {
        // Aggressive caching - build data in URL is deterministic
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'CDN-Cache-Control': 'public, max-age=604800',
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error(`[OG] Error: ${message}`)
    return Response.redirect(new URL('/og/default.png', req.url).href, 302)
  }
}

export const config = { path: '/og' }
