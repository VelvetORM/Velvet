/**
 * Utility Type Definitions
 *
 * Helper types for improved TypeScript inference and DX.
 */

/**
 * Make specific keys optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Make specific keys required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

/**
 * Deep partial (makes all nested properties optional)
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Extract promise type
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T

/**
 * Constructor type
 */
export type Constructor<T = any> = new (...args: any[]) => T

/**
 * Extract instance type from constructor
 */
export type InstanceType<T> = T extends Constructor<infer U> ? U : never

/**
 * Callback function type
 */
export type Callback<T = void> = (value: T) => void | Promise<void>

/**
 * Nullable type
 */
export type Nullable<T> = T | null

/**
 * Maybe type (null or undefined)
 */
export type Maybe<T> = T | null | undefined

/**
 * Plain object type
 */
export type PlainObject<T = any> = Record<string, T>

/**
 * Primitive types
 */
export type Primitive = string | number | boolean | null | undefined | symbol | bigint

/**
 * Get keys of T that are of type U
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never
}[keyof T]

/**
 * Omit properties of type U from T
 */
export type OmitByType<T, U> = Pick<T, { [K in keyof T]: T[K] extends U ? never : K }[keyof T]>

/**
 * Extract function property names
 */
export type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? K : never
}[keyof T]

/**
 * Exclude function properties
 */
export type NonFunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? never : K
}[keyof T]
