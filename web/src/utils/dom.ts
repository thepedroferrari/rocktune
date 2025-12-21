// =============================================================================
// DOM QUERY UTILITIES - Type-safe element selection
// =============================================================================

// Overloads for querySelector with specific element types
export function $<K extends keyof HTMLElementTagNameMap>(
  selector: K,
): HTMLElementTagNameMap[K] | null
export function $<E extends Element = HTMLElement>(selector: string): E | null
export function $(selector: string): Element | null {
  return document.querySelector(selector)
}

// Overloads for querySelectorAll
export function $$<K extends keyof HTMLElementTagNameMap>(
  selector: K,
): NodeListOf<HTMLElementTagNameMap[K]>
export function $$<E extends Element = HTMLElement>(selector: string): NodeListOf<E>
export function $$(selector: string): NodeListOf<Element> {
  return document.querySelectorAll(selector)
}

// Type-safe getElementById with narrowing
export function $id(id: string): HTMLElement | null {
  return document.getElementById(id)
}

// Strict version that throws if not found
export function $idStrict(id: string): HTMLElement {
  const element = document.getElementById(id)
  if (!element) {
    throw new Error(`Element with id "${id}" not found`)
  }
  return element
}

// =============================================================================
// ELEMENT TYPE GUARDS
// =============================================================================

export function isHTMLElement(value: unknown): value is HTMLElement {
  return value instanceof HTMLElement
}

export function isInputElement(value: unknown): value is HTMLInputElement {
  return value instanceof HTMLInputElement
}

export function isSelectElement(value: unknown): value is HTMLSelectElement {
  return value instanceof HTMLSelectElement
}

export function isButtonElement(value: unknown): value is HTMLButtonElement {
  return value instanceof HTMLButtonElement
}

export function isDialogElement(value: unknown): value is HTMLDialogElement {
  return value instanceof HTMLDialogElement
}

// =============================================================================
// ACCESSIBILITY
// =============================================================================

const SR_ANNOUNCE_ID = 'sr-announce' as const

export function announce(message: string): void {
  const announcer = $id(SR_ANNOUNCE_ID)
  if (announcer) {
    announcer.textContent = ''
    // Force reflow for screen readers
    void announcer.offsetHeight
    announcer.textContent = message
  }
}

// =============================================================================
// HTML SANITIZATION - XSS Prevention
// =============================================================================

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
} as const satisfies Record<string, string>

type EscapeChar = keyof typeof HTML_ESCAPE_MAP

const ESCAPE_REGEX = /[&<>"']/g

export function escapeHtml(text: string): string {
  return text.replace(ESCAPE_REGEX, (char) => HTML_ESCAPE_MAP[char as EscapeChar])
}

// Overloads for sanitize with better inference
export function sanitize(text: string): string
export function sanitize(text: undefined): ''
export function sanitize(text: null): ''
export function sanitize(text: string | undefined | null): string
export function sanitize(text: string | undefined | null): string {
  if (text == null) return ''
  return escapeHtml(String(text))
}

// =============================================================================
// DEBOUNCE - Type-preserving with improved signature
// =============================================================================

type AnyFunction = (...args: never[]) => unknown

export interface DebouncedFunction<T extends AnyFunction> {
  (...args: Parameters<T>): void
  cancel(): void
  flush(): void
}

export function debounce<T extends AnyFunction>(fn: T, delay: number): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let lastArgs: Parameters<T> | undefined

  const debounced = (...args: Parameters<T>): void => {
    lastArgs = args
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = undefined
      lastArgs = undefined
    }, delay)
  }

  debounced.cancel = (): void => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
      timeoutId = undefined
      lastArgs = undefined
    }
  }

  debounced.flush = (): void => {
    if (timeoutId !== undefined && lastArgs !== undefined) {
      clearTimeout(timeoutId)
      fn(...lastArgs)
      timeoutId = undefined
      lastArgs = undefined
    }
  }

  return debounced
}

// =============================================================================
// THROTTLE - Complementary to debounce
// =============================================================================

export function throttle<T extends AnyFunction>(
  fn: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let lastCall = 0

  return (...args: Parameters<T>): void => {
    const now = Date.now()
    if (now - lastCall >= limit) {
      lastCall = now
      fn(...args)
    }
  }
}

// =============================================================================
// EVENT UTILITIES
// =============================================================================

type EventHandler<E extends Event = Event> = (event: E) => void

export function onReady(callback: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true })
  } else {
    callback()
  }
}

export function onClick<E extends HTMLElement>(
  element: E | null,
  handler: EventHandler<MouseEvent>,
): (() => void) | undefined {
  if (!element) return undefined
  element.addEventListener('click', handler)
  return () => element.removeEventListener('click', handler)
}

export function onInput<E extends HTMLInputElement | HTMLTextAreaElement>(
  element: E | null,
  handler: EventHandler<Event>,
): (() => void) | undefined {
  if (!element) return undefined
  element.addEventListener('input', handler)
  return () => element.removeEventListener('input', handler)
}

// =============================================================================
// CLASS UTILITIES
// =============================================================================

export function toggleClass(
  element: HTMLElement | null,
  className: string,
  force?: boolean,
): boolean {
  if (!element) return false
  return element.classList.toggle(className, force)
}

export function addClass(element: HTMLElement | null, ...classNames: string[]): void {
  element?.classList.add(...classNames)
}

export function removeClass(element: HTMLElement | null, ...classNames: string[]): void {
  element?.classList.remove(...classNames)
}

export function hasClass(element: HTMLElement | null, className: string): boolean {
  return element?.classList.contains(className) ?? false
}
