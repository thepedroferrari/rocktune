#!/usr/bin/env -S deno run --allow-read --allow-write


const ICONS_DIR = new URL('../public/icons', import.meta.url).pathname
const OUTPUT_FILE = `${ICONS_DIR}/sprite.svg`

const svgFiles: string[] = []
for await (const entry of Deno.readDir(ICONS_DIR)) {
  if (entry.isFile && entry.name.endsWith('.svg') && entry.name !== 'sprite.svg') {
    svgFiles.push(entry.name)
  }
}
svgFiles.sort()

console.log(`Found ${svgFiles.length} SVG files`)

const symbols: string[] = []

for (const file of svgFiles) {
  const id = file.replace('.svg', '')
  const content = await Deno.readTextFile(`${ICONS_DIR}/${file}`)

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

const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
${symbols.join('\n')}
</svg>
`

await Deno.writeTextFile(OUTPUT_FILE, sprite)
console.log(`\n✅ Created sprite.svg with ${svgFiles.length} icons`)
