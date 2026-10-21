import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(scriptDir, '..', '..')
const publicDir = join(repoRoot, 'web', 'public')

/** Root scripts served as hosted one-liners: source file -> public file name. */
const HOSTED_SCRIPTS = [
  { source: 'benchmark-setup.ps1', target: 'benchmark.ps1' },
  { source: 'rig-check.ps1', target: 'check.ps1' },
  { source: 'play-snapshot.ps1', target: 'snapshot.ps1' },
] as const

await Deno.mkdir(publicDir, { recursive: true })

for (const { source, target } of HOSTED_SCRIPTS) {
  const sourcePath = join(repoRoot, source)
  const targetPath = join(publicDir, target)

  try {
    await Deno.stat(sourcePath)
  } catch {
    console.error(`[sync-benchmark] Missing source file: ${sourcePath}`)
    Deno.exit(1)
  }

  await Deno.copyFile(sourcePath, targetPath)
  console.log(`[sync-benchmark] Synced ${sourcePath} -> ${targetPath}`)
}
