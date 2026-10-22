import { execFileSync } from 'node:child_process'
import { defineConfig } from 'vite'
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { visualizer } from 'rollup-plugin-visualizer'

function getGitInfo() {
  try {
    const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
    const date = execFileSync('git', ['log', '-1', '--format=%cd', '--date=short'], {
      encoding: 'utf8',
    }).trim()

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
    // Bundle report only on request (pnpm analyze); never published with dist
    ...(process.env.ANALYZE
      ? [
          visualizer({
            filename: 'stats.html',
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : []),
  ],
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules\/(svelte|zod)\//.test(id)) return 'vendor'
          if (/node_modules\/diff\//.test(id)) return 'diff'
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
