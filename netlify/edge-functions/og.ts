/**
 * Netlify Edge Function: Dynamic OG Image Generator
 *
 * Generates Open Graph images for RockTune build shares.
 * URL format: /og?b=1.{compressed_build_data}
 *
 * Uses direct SVG generation + resvg-wasm for SVG→PNG conversion.
 */

import { render } from 'https://deno.land/x/resvg_wasm@0.2.0/mod.ts'
import { decodeBuildFromQuery } from './lib/decode-build.ts'
import { buildShareCardSvg } from './lib/build-svg.ts'

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
    console.log(
      `[OG] Generating image for: ${build.presetLabel} (${build.cpu} + ${build.gpu})`,
    )

    // Build share URL for display
    const shareUrl = url.origin + '/?b=' + encodeURIComponent(buildParam)

    // Generate SVG string
    const svgString = buildShareCardSvg(build, shareUrl)

    // Convert SVG to PNG using resvg-wasm
    const pngBuffer = await render(svgString)

    console.log(`[OG] Success: Generated ${pngBuffer.byteLength} byte PNG`)

    // Return PNG with aggressive caching headers
    // Cast to Uint8Array to satisfy TypeScript (resvg_wasm returns Uint8Array<ArrayBufferLike>)
    return new Response(new Uint8Array(pngBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control':
          'public, max-age=86400, stale-while-revalidate=604800',
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
