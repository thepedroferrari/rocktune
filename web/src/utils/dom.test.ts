import { assertEquals } from 'https://deno.land/std@0.220.0/assert/mod.ts'
import { describe, it } from 'https://deno.land/std@0.220.0/testing/bdd.ts'
import { debounce, escapeHtml, sanitize } from './dom.ts'

describe('DOM Utilities', () => {
  describe('escapeHtml', () => {
    it('should escape ampersands', () => {
      assertEquals(escapeHtml('foo & bar'), 'foo &amp; bar')
    })

    it('should escape less-than signs', () => {
      assertEquals(escapeHtml('<script>'), '&lt;script&gt;')
    })

    it('should escape greater-than signs', () => {
      assertEquals(escapeHtml('a > b'), 'a &gt; b')
    })

    it('should escape double quotes', () => {
      assertEquals(escapeHtml('say "hello"'), 'say &quot;hello&quot;')
    })

    it('should escape single quotes', () => {
      assertEquals(escapeHtml("it's"), 'it&#039;s')
    })

    it('should escape multiple characters', () => {
      assertEquals(
        escapeHtml('<div onclick="alert(\'xss\')">'),
        '&lt;div onclick=&quot;alert(&#039;xss&#039;)&quot;&gt;',
      )
    })

    it('should handle empty string', () => {
      assertEquals(escapeHtml(''), '')
    })

    it('should handle text without special chars', () => {
      assertEquals(escapeHtml('Hello World'), 'Hello World')
    })
  })

  describe('sanitize', () => {
    it('should escape HTML in strings', () => {
      assertEquals(
        sanitize('<script>alert("xss")</script>'),
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
      )
    })

    it('should handle null', () => {
      assertEquals(sanitize(null), '')
    })

    it('should handle undefined', () => {
      assertEquals(sanitize(undefined), '')
    })

    it('should convert non-strings to string', () => {
      // @ts-expect-error - testing runtime behavior
      assertEquals(sanitize(123), '123')
    })
  })

  describe('debounce', () => {
    it('should delay function execution', async () => {
      let callCount = 0
      const fn = debounce(() => {
        callCount++
      }, 50)

      fn()
      fn()
      fn()

      assertEquals(callCount, 0)

      await new Promise((resolve) => setTimeout(resolve, 100))

      assertEquals(callCount, 1)
    })

    it('should reset timer on subsequent calls', async () => {
      let callCount = 0
      const fn = debounce(() => {
        callCount++
      }, 50)

      fn()
      await new Promise((resolve) => setTimeout(resolve, 30))
      fn()
      await new Promise((resolve) => setTimeout(resolve, 30))
      fn()
      await new Promise((resolve) => setTimeout(resolve, 30))

      assertEquals(callCount, 0)

      await new Promise((resolve) => setTimeout(resolve, 60))

      assertEquals(callCount, 1)
    })

    it('should pass arguments to debounced function', async () => {
      let receivedArgs: unknown[] = []
      const fn = debounce((...args: unknown[]) => {
        receivedArgs = args
      }, 50)

      fn('a', 'b', 'c')

      await new Promise((resolve) => setTimeout(resolve, 100))

      assertEquals(receivedArgs, ['a', 'b', 'c'])
    })
  })
})
