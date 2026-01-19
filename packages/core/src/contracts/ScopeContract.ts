/**
 * Scope Contract
 *
 * Type-safe scope definitions for Models.
 * Eliminates string-based scope calls in favor of typed registry.
 */

import type { Builder } from '../Builder'

/**
 * A scope function that modifies a query builder
 */
export type ScopeFunction<TBuilder, TArgs extends unknown[] = []> = (
  query: TBuilder,
  ...args: TArgs
) => TBuilder | void

/**
 * Extract scope names from a scope registry
 */
export type ScopeNames<TScopes> = TScopes extends ScopeRegistry<infer _TBuilder>
  ? Extract<keyof TScopes, string>
  : never

/**
 * Extract arguments for a specific scope
 */
export type ScopeArgs<TScopes, K extends keyof TScopes> = TScopes[K] extends ScopeFunction<
  infer _TBuilder,
  infer TArgs
>
  ? TArgs
  : never

/**
 * A registry of named scopes
 *
 * @example
 * ```typescript
 * interface UserScopes {
 *   active: ScopeFunction<Builder<User>>
 *   withRole: ScopeFunction<Builder<User>, [role: string]>
 *   olderThan: ScopeFunction<Builder<User>, [age: number]>
 * }
 *
 * class User extends Model<UserAttributes> {
 *   protected scopes: UserScopes = {
 *     active: (query) => query.where('active', true),
 *     withRole: (query, role) => query.where('role', role),
 *     olderThan: (query, age) => query.where('age', '>', age)
 *   }
 * }
 * ```
 */
export type ScopeRegistry<TBuilder> = Record<string, ScopeFunction<TBuilder, unknown[]>>

/**
 * Type-safe scope registry with known scope names
 */
export type TypedScopeRegistry<TBuilder, TScopes extends Record<string, unknown[]>> = {
  [K in keyof TScopes]: ScopeFunction<TBuilder, TScopes[K]>
}

/**
 * Helper to define scopes with proper typing
 *
 * @example
 * ```typescript
 * const userScopes = defineScopes<Builder<User>>()({
 *   active: (query) => query.where('active', true),
 *   withRole: (query, role: string) => query.where('role', role),
 * })
 * ```
 */
export function defineScopes<TBuilder>() {
  return <TScopes extends ScopeRegistry<TBuilder>>(scopes: TScopes): TScopes => scopes
}

/**
 * Scopeable interface for Models that support scopes
 */
export interface Scopeable<TBuilder, TScopes extends ScopeRegistry<TBuilder> = ScopeRegistry<TBuilder>> {
  /**
   * Registry of available scopes
   */
  readonly scopes: TScopes
}

/**
 * Static interface for Models that support scopes
 */
export interface ScopeableStatic<TBuilder> {
  /**
   * Apply a named scope (type-safe version)
   */
  scoped<K extends string>(
    this: { prototype: { scopes: Record<K, ScopeFunction<TBuilder, unknown[]>> } },
    name: K,
    ...args: unknown[]
  ): TBuilder

  /**
   * Apply a named scope (string version for backwards compatibility)
   * @deprecated Use scoped() with typed scope names
   */
  scope(name: string, ...args: unknown[]): TBuilder
}

/**
 * Infer scope registry type from a Model class
 */
export type InferScopes<TModel> = TModel extends { scopes: infer S }
  ? S extends ScopeRegistry<Builder<unknown>>
    ? S
    : never
  : never

/**
 * Infer Builder type from a Model
 */
export type InferBuilder<TModel> = TModel extends { scopes: ScopeRegistry<infer TBuilder> }
  ? TBuilder
  : Builder<unknown>
