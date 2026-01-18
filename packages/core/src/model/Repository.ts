/**
 * Repository
 *
 * Optional repository wrapper that keeps query logic outside Model.
 * Provides a familiar API without forcing users away from User.query().
 */

import type { ComparisonOperator } from '../types'
import { QueryProxy } from './QueryProxy'
import type { Model, ModelAttributesOf, ModelConstructor } from '../Model'
import type { RepositoryContract } from '../contracts/RepositoryContract'

export class Repository<T extends Model = Model> implements RepositoryContract<T> {
  private readonly proxy: QueryProxy<T>

  constructor(modelClass: ModelConstructor<T>) {
    this.proxy = new QueryProxy<T>(modelClass)
  }

  query() {
    return this.proxy.query()
  }

  where(column: string, value: unknown): ReturnType<QueryProxy<T>['where']>
  where(column: string, operator: ComparisonOperator, value: unknown): ReturnType<QueryProxy<T>['where']>
  where(
    column: string,
    operatorOrValue: ComparisonOperator | unknown,
    value?: unknown
  ): ReturnType<QueryProxy<T>['where']> {
    if (arguments.length === 2) {
      return this.proxy.where(column, operatorOrValue)
    }
    return this.proxy.where(column, operatorOrValue as ComparisonOperator, value)
  }

  find(id: string | number) {
    return this.proxy.find(id)
  }

  findOrFail(id: string | number) {
    return this.proxy.findOrFail(id)
  }

  first() {
    return this.proxy.first()
  }

  all() {
    return this.proxy.all()
  }

  get() {
    return this.proxy.get()
  }

  create(attributes: Partial<ModelAttributesOf<T>>) {
    return this.proxy.create(attributes)
  }

  with(...relations: string[]) {
    return this.proxy.with(...relations)
  }

  orderBy(column: string, direction?: 'asc' | 'desc') {
    return this.proxy.orderBy(column, direction)
  }

  latest(column?: string) {
    return this.proxy.latest(column)
  }

  oldest(column?: string) {
    return this.proxy.oldest(column)
  }

  limit(value: number) {
    return this.proxy.limit(value)
  }

  take(value: number) {
    return this.proxy.take(value)
  }

  count() {
    return this.proxy.count()
  }

  withTrashed() {
    return this.proxy.withTrashed()
  }

  onlyTrashed() {
    return this.proxy.onlyTrashed()
  }

  scope(name: string, ...args: unknown[]) {
    return this.proxy.scope(name, ...args)
  }
}
