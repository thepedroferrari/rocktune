/**
 * String utilities following Matt Pocock TypeScript patterns
 */

/**
 * Capitalize first letter of a string
 * Uses TypeScript's built-in Capitalize<T> for type-safe return
 *
 * @example
 * capitalize('hello') // 'Hello' (type: 'Hello')
 * capitalize('DNS')   // 'DNS' (type: 'DNS')
 */
export const capitalize = <T extends string>(s: T): Capitalize<T> =>
  (s.charAt(0).toUpperCase() + s.slice(1)) as Capitalize<T>
