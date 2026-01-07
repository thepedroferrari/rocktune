import type { ConfigFile } from './config-generator'
import { downloadText } from '../utils/download'

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
    downloadText(file.content, file.filename)

    // Wait 300ms between downloads to prevent browser blocking multiple downloads
    if (i < files.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  }
}
