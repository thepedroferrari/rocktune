#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'node:fs/promises'

// Source SVGs live outside public/ so only the built sprite ships to production
const ICONS_DIR = new URL('../assets/icons-src', import.meta.url).pathname
const OUTPUT_FILE = new URL('../public/icons/sprite.svg', import.meta.url).pathname

const svgFiles: string[] = []
for (const entry of await readdir(ICONS_DIR, { withFileTypes: true })) {
  if (
    entry.isFile() &&
    entry.name.endsWith('.svg') &&
    entry.name !== 'sprite.svg' &&
    entry.name !== 'ui-sprite.svg'
  ) {
    svgFiles.push(entry.name)
  }
}
svgFiles.sort()

console.log(`Found ${svgFiles.length} SVG files`)

const symbols: string[] = []

for (const file of svgFiles) {
  const id = file.replace('.svg', '')
  const content = await readFile(`${ICONS_DIR}/${file}`, 'utf8')

  const viewBoxMatch = content.match(/viewBox="([^"]+)"/)
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 48 48'

  const innerMatch = content.match(/<svg[^>]*>([\s\S]*)<\/svg>/i)
  const inner = innerMatch ? innerMatch[1].trim() : ''

  if (inner) {
    symbols.push(`  <symbol id="${id}" viewBox="${viewBox}">\n    ${inner}\n  </symbol>`)
    console.log(`  ✓ ${id}`)
  } else {
    console.log(`  ✗ ${id} (empty or invalid)`)
  }
}

const sprite = `<svg xmlns="http://www.w3.org/2000/svg">
${symbols.join('\n')}
</svg>
`

await writeFile(OUTPUT_FILE, sprite)
console.log(`\n✅ Created sprite.svg with ${svgFiles.length} icons`)
