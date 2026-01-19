/**
 * Utility Types
 *
 * Type-safe utilities to eliminate unsafe type assertions.
 */

/**
 * Makes all properties of T mutable (removes readonly)
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}

/**
 * Extract keys that are strings
 */
export type StringKeys<T> = Extract<keyof T, string>

/**
 * A record that can be indexed with string keys
 * Used to safely cast objects for dynamic property access
 */
export type StringIndexable<T = unknown> = { [key: string]: T }

/**
 * Safely cast a generic object to allow string indexing
 * This is type-safe because we're explicitly allowing any string key
 */
export function asIndexable<T extends object>(obj: T): T & StringIndexable<unknown> {
  return obj as T & StringIndexable<unknown>
}

/**
 * Check if a value has a specific property
 */
export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is { [P in K]: unknown } {
  return typeof obj === 'object' && obj !== null && key in obj
}

/**
 * Check if a value has a specific method
 */
export function hasMethod<K extends string>(
  obj: unknown,
  key: K
): obj is { [P in K]: (...args: unknown[]) => unknown } {
  return hasProperty(obj, key) && typeof (obj as Record<K, unknown>)[key] === 'function'
}

/**
 * Check if value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && value.constructor === Object
}

/**
 * Check if value is a constructor function
 */
export function isConstructor<T>(
  value: unknown
): value is new (...args: unknown[]) => T {
  return typeof value === 'function' && 'prototype' in value
}

/**
 * Safely get a property from an object
 * Returns undefined if property doesn't exist
 */
export function safeGet<T, K extends keyof T>(obj: T, key: K): T[K]
export function safeGet<T>(obj: T, key: string): unknown
export function safeGet(obj: unknown, key: string): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return undefined
  }
  return (obj as Record<string, unknown>)[key]
}

/**
 * Safely set a property on an object
 * Uses type assertion internally but provides a clean API
 */
export function safeSet<T extends object>(
  obj: T,
  key: string,
  value: unknown
): void {
  (obj as Record<string, unknown>)[key] = value
}

/**
 * Type guard for checking if a value matches a record shape
 */
export function isRecordOf<T>(
  value: unknown,
  predicate: (v: unknown) => v is T
): value is Record<string, T> {
  if (!isPlainObject(value)) return false
  return Object.values(value).every(predicate)
}

/**
 * Create a typed empty object that can be filled dynamically
 */
export function createTypedRecord<T extends Record<string, unknown>>(): T {
  return {} as T
}

/**
 * Merge objects with type inference
 */
export function merge<T extends object, U extends object>(target: T, source: U): T & U {
  return { ...target, ...source }
}

/**
 * Pick properties from an object (type-safe)
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key]
    }
  }
  return result
}

/**
 * Omit properties from an object (type-safe)
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[]
): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) {
    delete (result as Record<string | number | symbol, unknown>)[key]
  }
  return result as Omit<T, K>
}

/**
 * Assert that a value is not null or undefined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message = 'Value is null or undefined'
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message)
  }
}

/**
 * Assert that a condition is true
 */
export function assert(
  condition: boolean,
  message = 'Assertion failed'
): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

/**
 * Narrow a union type to exclude null and undefined
 */
export type NonNullable<T> = T extends null | undefined ? never : T

/**
 * Extract the element type from an array
 */
export type ArrayElement<T> = T extends readonly (infer E)[] ? E : never

/**
 * Make specific properties required
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>

/**
 * Make specific properties optional
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Function type with typed arguments
 */
export type TypedFunction<TArgs extends unknown[], TReturn> = (...args: TArgs) => TReturn

/**
 * Constructor type with typed arguments
 * (Note: basic Constructor is in utils.ts)
 */
export type TypedConstructor<T = unknown, TArgs extends unknown[] = unknown[]> = new (
  ...args: TArgs
) => T

/**
 * Extract constructor arguments
 */
export type ConstructorArgs<T> = T extends new (...args: infer A) => unknown ? A : never

/**
 * Extract instance type from constructor
 * (Note: basic InstanceType is in utils.ts)
 */
export type InstanceOf<T> = T extends new (...args: unknown[]) => infer I ? I : never
