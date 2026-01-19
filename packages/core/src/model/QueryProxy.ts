/**
 * QueryProxy
 *
 * Encapsulates static query behavior for a Model.
 * Keeps Model focused on instance behavior.
 *
 * Supports type-safe scopes via the `scoped()` method.
 */

import { Builder } from '../Builder'
import { Collection } from '../support/Collection'
import type { ComparisonOperator } from '../types'
import type { Model, ModelAttributesOf, ModelConstructor } from '../Model'
import type { ScopeFunction, ScopeRegistry } from '../contracts/ScopeContract'

export class QueryProxy<T extends Model = Model> {
  private readonly modelClass: ModelConstructor<T>

  constructor(modelClass: ModelConstructor<T>) {
    this.modelClass = modelClass
  }

  query(): Builder<T> {
    return new Builder<T>(this.modelClass, this.modelClass.connection)
  }

  where(column: string, value: unknown): Builder<T>
  where(column: string, operator: ComparisonOperator, value: unknown): Builder<T>
  where(
    column: string,
    operatorOrValue?: ComparisonOperator | unknown,
    value?: unknown
  ): Builder<T> {
    if (arguments.length === 2) {
      return this.query().where(column, operatorOrValue)
    }
    return this.query().where(column, operatorOrValue as ComparisonOperator, value)
  }

  async find(id: string | number): Promise<T | null> {
    return this.query().find(id, this.modelClass.primaryKey)
  }

  async findOrFail(id: string | number): Promise<T> {
    return this.query().findOrFail(id, this.modelClass.primaryKey)
  }

  async first(): Promise<T | null> {
    return this.query().first()
  }

  async all(): Promise<Collection<T>> {
    return this.query().get()
  }

  async get(): Promise<Collection<T>> {
    return this.all()
  }

  async create(attributes: Partial<ModelAttributesOf<T>>): Promise<T> {
    const ModelClass = this.modelClass as new (attrs?: Partial<ModelAttributesOf<T>>) => T
    const instance = new ModelClass(attributes)
    await instance.save()
    return instance
  }

  with(...relations: string[]): Builder<T> {
    return this.query().with(...relations)
  }

  orderBy(column: string, direction?: 'asc' | 'desc'): Builder<T> {
    return this.query().orderBy(column, direction)
  }

  latest(column?: string): Builder<T> {
    return this.query().latest(column)
  }

  oldest(column?: string): Builder<T> {
    return this.query().oldest(column)
  }

  limit(value: number): Builder<T> {
    return this.query().limit(value)
  }

  take(value: number): Builder<T> {
    return this.limit(value)
  }

  async count(): Promise<number> {
    return this.query().count()
  }

  withTrashed(): Builder<T> {
    const builder = this.query()
    if (this.modelClass.softDeletes) {
      builder.withTrashed()
    }
    return builder
  }

  onlyTrashed(): Builder<T> {
    const builder = this.query()
    if (this.modelClass.softDeletes) {
      builder.onlyTrashed()
    }
    return builder
  }

  /**
   * Apply a named scope using the scopes registry (type-safe).
   *
   * @example
   * ```typescript
   * // In Model:
   * protected scopes = {
   *   active: (query) => query.where('active', true),
   *   withRole: (query, role: string) => query.where('role', role),
   * }
   *
   * // Usage:
   * User.queryProxy().scoped('active').get()
   * User.queryProxy().scoped('withRole', 'admin').get()
   * ```
   */
  scoped(name: string, ...args: unknown[]): Builder<T> {
    const query = this.query()

    // Try registry-based scopes first
    const proto = this.modelClass.prototype as { scopes?: ScopeRegistry<Builder<T>> }
    const scopes = proto.scopes

    if (scopes && typeof scopes[name] === 'function') {
      const scopeFn = scopes[name] as ScopeFunction<Builder<T>, unknown[]>
      const result = scopeFn(query, ...args)
      return result instanceof Builder ? result : query
    }

    // Fallback to method-based scope
    return this.scope(name, ...args)
  }

  /**
   * Apply a named scope (string-based, for backwards compatibility).
   *
   * Prefer `scoped()` for type-safe scope calls.
   *
   * @deprecated Use `scoped()` for type-safe scope calls
   */
  scope(name: string, ...args: unknown[]): Builder<T> {
    const query = this.query()

    // Try registry-based scopes first
    const proto = this.modelClass.prototype as { scopes?: ScopeRegistry<Builder<T>> }
    const scopes = proto.scopes

    if (scopes && typeof scopes[name] === 'function') {
      const scopeFn = scopes[name] as ScopeFunction<Builder<T>, unknown[]>
      const result = scopeFn(query, ...args)
      return result instanceof Builder ? result : query
    }

    // Fallback to method-based scope (scopeXxx pattern)
    const methodName = `scope${name.charAt(0).toUpperCase()}${name.slice(1)}`
    const scopeMethod = Reflect.get(proto, methodName) as
      | ScopeFunction<Builder<T>, unknown[]>
      | undefined

    if (typeof scopeMethod !== 'function') {
      throw new Error(`Scope '${name}' does not exist on ${this.modelClass.name}`)
    }

    const result = scopeMethod.call(proto, query, ...args)
    return result instanceof Builder ? result : query
  }
}
