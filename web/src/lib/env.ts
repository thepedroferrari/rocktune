/**
 * Environment detection utilities
 *
 * Works in both Vite (browser) and Deno (test) contexts.
 */

/** Vite's import.meta.env shape */
interface ViteEnv {
  DEV?: boolean
  PROD?: boolean
  MODE?: string
  BASE_URL?: string
}

/** Type-safe access to import.meta.env (Vite-specific) */
function getViteEnv(): ViteEnv | undefined {
  try {
    // Cast to access Vite's env property without TypeScript errors in Deno
    const meta = import.meta as { env?: ViteEnv }
    return meta.env
  } catch {
    return undefined
  }
}

/**
 * Check if running in development mode.
 * Works in both Vite and Deno contexts.
 */
export function isDev(): boolean {
  const viteEnv = getViteEnv()
  if (viteEnv?.DEV !== undefined) {
    return viteEnv.DEV
  }
  // In Deno test context, treat as non-DEV (suppress warnings)
  return false
}

/**
 * Get the base URL for the application.
 * Works in both Vite and Deno contexts.
 */
export function getBaseUrl(): string {
  const viteEnv = getViteEnv()
  return viteEnv?.BASE_URL ?? '/'
}
