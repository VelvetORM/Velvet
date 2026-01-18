/**
 * QueryProxy
 *
 * Encapsulates static query behavior for a Model.
 * Keeps Model focused on instance behavior.
 */

import { Builder } from '../Builder'
import { Collection } from '../support/Collection'
import type { ComparisonOperator } from '../types'
import type { Model, ModelAttributesOf, ModelConstructor } from '../Model'

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

  scope(name: string, ...args: unknown[]): Builder<T> {
    const query = this.query()
    const methodName = `scope${name.charAt(0).toUpperCase()}${name.slice(1)}`

    const proto = this.modelClass.prototype
    const scopeMethod = Reflect.get(proto, methodName)

    if (typeof scopeMethod !== 'function') {
      throw new Error(`Scope '${name}' does not exist on ${this.modelClass.name}`)
    }

    const result = scopeMethod.call(proto, query, ...args)
    return result instanceof Builder ? result : query
  }
}
