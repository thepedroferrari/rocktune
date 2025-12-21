// DOM utility functions

export function $(selector: string): HTMLElement | null {
  return document.querySelector(selector)
}

export function $$(selector: string): NodeListOf<HTMLElement> {
  return document.querySelectorAll(selector)
}

export function $id(id: string): HTMLElement | null {
  return document.getElementById(id)
}

export function announce(message: string): void {
  const announcer = $id('sr-announce')
  if (announcer) {
    announcer.textContent = message
  }
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: number | undefined
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = window.setTimeout(() => fn(...args), delay)
  }
}
