/**
 * The assert helpers the tests use, on top of node:assert.
 * Names and argument order match the Deno @std/assert helpers the tests were written with.
 */

import { deepStrictEqual, ok } from 'node:assert/strict'

export function assert(expr: unknown, msg?: string): asserts expr {
  ok(expr, msg)
}

export function assertFalse(expr: unknown, msg?: string): void {
  ok(!expr, msg ?? `Expected ${String(expr)} to be falsy`)
}

export function assertEquals<T>(actual: T, expected: T, msg?: string): void {
  deepStrictEqual(actual, expected, msg)
}

export function assertExists<T>(actual: T, msg?: string): asserts actual is NonNullable<T> {
  ok(actual !== null && actual !== undefined, msg ?? `Expected a value, got ${String(actual)}`)
}

export function assertStringIncludes(actual: string, expected: string, msg?: string): void {
  ok(actual.includes(expected), msg ?? `Expected "${actual}" to include "${expected}"`)
}
