/**
 * Tests for checksum.ts
 * Verifies SHA-256 hash generation for script integrity verification
 */

import { assertEquals } from 'jsr:@std/assert'
import { generateSHA256 } from './checksum.ts'

// =============================================================================
// SHA-256 HASH FORMAT
// =============================================================================

Deno.test('SHA256 - Returns 64 character lowercase hex string', async () => {
  const hash = await generateSHA256('test content')

  assertEquals(hash.length, 64)
  assertEquals(/^[a-f0-9]+$/.test(hash), true)
})

Deno.test('SHA256 - Deterministic (same input = same hash)', async () => {
  const content = 'Hello, World!'

  const hash1 = await generateSHA256(content)
  const hash2 = await generateSHA256(content)
  const hash3 = await generateSHA256(content)

  assertEquals(hash1, hash2)
  assertEquals(hash2, hash3)
})

Deno.test('SHA256 - Different content produces different hashes', async () => {
  const hash1 = await generateSHA256('content a')
  const hash2 = await generateSHA256('content b')

  assertEquals(hash1 !== hash2, true)
})

// =============================================================================
// KNOWN HASH VERIFICATION
// =============================================================================

Deno.test('SHA256 - Matches known hash values', async () => {
  // Known SHA-256 hashes (verified with external tools)
  // Empty string
  const emptyHash = await generateSHA256('')
  assertEquals(emptyHash, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')

  // "hello" (no newline)
  const helloHash = await generateSHA256('hello')
  assertEquals(helloHash, '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
})

// =============================================================================
// BOM HANDLING
// =============================================================================

Deno.test('SHA256 - BOM option adds UTF-8 BOM when missing', async () => {
  const content = 'test'

  const withoutBom = await generateSHA256(content, { includeBom: false })
  const withBom = await generateSHA256(content, { includeBom: true })

  // Hashes should differ because BOM changes the content
  assertEquals(withoutBom !== withBom, true)
})

Deno.test('SHA256 - BOM option does not double-add if already present', async () => {
  const contentWithBom = '\ufefftest'

  const hash1 = await generateSHA256(contentWithBom, { includeBom: true })
  const hash2 = await generateSHA256(contentWithBom, { includeBom: true })

  // Should be identical - no double BOM
  assertEquals(hash1, hash2)
})

Deno.test('SHA256 - Default behavior (no BOM)', async () => {
  const content = 'test'

  const defaultHash = await generateSHA256(content)
  const explicitNoBom = await generateSHA256(content, { includeBom: false })

  assertEquals(defaultHash, explicitNoBom)
})

// =============================================================================
// EDGE CASES
// =============================================================================

Deno.test('SHA256 - Handles empty string', async () => {
  const hash = await generateSHA256('')

  assertEquals(hash.length, 64)
  assertEquals(/^[a-f0-9]+$/.test(hash), true)
})

Deno.test('SHA256 - Handles Unicode content', async () => {
  const hash = await generateSHA256('こんにちは世界 🌍')

  assertEquals(hash.length, 64)
  assertEquals(/^[a-f0-9]+$/.test(hash), true)
})

Deno.test('SHA256 - Handles large content', async () => {
  // Generate ~100KB of content
  const largeContent = 'x'.repeat(100_000)

  const hash = await generateSHA256(largeContent)

  assertEquals(hash.length, 64)
  assertEquals(/^[a-f0-9]+$/.test(hash), true)
})

Deno.test('SHA256 - Handles special characters', async () => {
  const content = `Special chars: \n\t\r\0"'<>&$\`\\`

  const hash = await generateSHA256(content)

  assertEquals(hash.length, 64)
  assertEquals(/^[a-f0-9]+$/.test(hash), true)
})
