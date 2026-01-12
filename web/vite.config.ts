import { defineConfig } from 'vite'
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { visualizer } from 'rollup-plugin-visualizer'

/**
 * Converts render-blocking <link rel="stylesheet"> to non-blocking preload pattern.
 * Critical CSS is already inlined in index.html, so this defers the full stylesheet.
 */
function deferCssPlugin() {
  return {
    name: 'defer-css',
    enforce: 'post' as const,
    transformIndexHtml(html: string) {
      return html.replace(
        /<link\s+rel="stylesheet"\s+(?:crossorigin\s+)?href="([^"]+)"[^>]*>/g,
        (_, href) =>
          `<link rel="preload" href="${href}" as="style" onload="this.onload=null;this.rel='stylesheet'">\n    <noscript><link rel="stylesheet" href="${href}"></noscript>`,
      )
    },
  }
}

function getGitInfo() {
  try {
    const commitCmd = new Deno.Command('git', { args: ['rev-parse', '--short', 'HEAD'] })
    const commitResult = commitCmd.outputSync()
    const commit = new TextDecoder().decode(commitResult.stdout).trim()

    const dateCmd = new Deno.Command('git', { args: ['log', '-1', '--format=%cd', '--date=short'] })
    const dateResult = dateCmd.outputSync()
    const date = new TextDecoder().decode(dateResult.stdout).trim()

    return { commit, date }
  } catch {
    return { commit: 'dev', date: new Date().toISOString().split('T')[0] }
  }
}

const gitInfo = getGitInfo()

export default defineConfig({
  plugins: [
    svelte({
      preprocess: vitePreprocess(),
      compilerOptions: {
        runes: true,
      },
    }),
    deferCssPlugin(),
    visualizer({
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['svelte', 'zod'],
          diff: ['diff'],
        },
      },
    },
  },
  server: {
    port: 9010,
  },
  resolve: {
    alias: {
      '$lib': '/src/lib',
    },
  },
  define: {
    __BUILD_COMMIT__: JSON.stringify(gitInfo.commit),
    __BUILD_DATE__: JSON.stringify(gitInfo.date),
  },
})
