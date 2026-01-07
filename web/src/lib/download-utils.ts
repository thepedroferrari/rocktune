import type { ConfigFile } from './config-generator'

/**
 * Download a single config file to user's browser
 * Creates a Blob, triggers download via temporary anchor element
 */
export function downloadConfigFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'

  document.body.appendChild(anchor)
  anchor.click()

  // Cleanup after download
  setTimeout(() => {
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }, 100)
}

/**
 * Download multiple config files sequentially
 * Each file downloads separately with a small delay between them
 */
export async function downloadConfigs(files: readonly ConfigFile[]): Promise<void> {
  if (files.length === 0) {
    throw new Error('No config files to download')
  }

  // Download each file with a small delay to prevent browser blocking
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    downloadConfigFile(file.content, file.filename)

    // Wait 300ms between downloads to prevent browser blocking multiple downloads
    if (i < files.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  }
}
