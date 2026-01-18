/**
 * Repository Contract
 *
 * Public interface for repositories.
 */

import type { ComparisonOperator } from '../types'
import type { Builder } from '../Builder'
import type { Collection } from '../support/Collection'
import type { ModelAttributesOf, Model } from '../Model'

export interface RepositoryContract<T extends Model = Model> {
  query(): Builder<T>
  where(column: string, value: unknown): Builder<T>
  where(column: string, operator: ComparisonOperator, value: unknown): Builder<T>
  find(id: string | number): Promise<T | null>
  findOrFail(id: string | number): Promise<T>
  first(): Promise<T | null>
  all(): Promise<Collection<T>>
  get(): Promise<Collection<T>>
  create(attributes: Partial<ModelAttributesOf<T>>): Promise<T>
  with(...relations: string[]): Builder<T>
  orderBy(column: string, direction?: 'asc' | 'desc'): Builder<T>
  latest(column?: string): Builder<T>
  oldest(column?: string): Builder<T>
  limit(value: number): Builder<T>
  take(value: number): Builder<T>
  count(): Promise<number>
  withTrashed(): Builder<T>
  onlyTrashed(): Builder<T>
  scope(name: string, ...args: unknown[]): Builder<T>
}
