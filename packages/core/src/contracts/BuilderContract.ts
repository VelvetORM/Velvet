/**
 * Builder Contract
 *
 * Public interface for query builders.
 */

import type { ComparisonOperator, SortDirection, PaginatedResult } from '../types'
import type { Collection } from '../support/Collection'

export interface BuilderContract<T = unknown> {
  where(column: string, value: unknown): this
  where(column: string, operator: ComparisonOperator, value: unknown): this
  whereIn(column: string, values: unknown[]): this
  whereNotIn(column: string, values: unknown[]): this
  whereNull(column: string): this
  whereNotNull(column: string): this
  whereBetween(column: string, values: [unknown, unknown]): this
  whereRaw(sql: string, bindings?: unknown[]): this
  orWhere(column: string, value: unknown): this
  orWhere(column: string, operator: ComparisonOperator, value: unknown): this
  orderBy(column: string, direction?: SortDirection): this
  limit(value: number): this
  offset(value: number): this
  with(...relations: string[]): this
  withTrashed(): this
  onlyTrashed(): this
  allowUnsafeRaw(): this
  unsafeWhereRaw(sql: string, bindings?: unknown[]): this

  get(): Promise<Collection<T>>
  first(): Promise<T | null>
  find(id: string | number, primaryKey?: string): Promise<T | null>
  findOrFail(id: string | number, primaryKey?: string): Promise<T>
  count(column?: string): Promise<number>
  paginate(perPage?: number, page?: number): Promise<PaginatedResult<T>>
  toSql(): { sql: string; bindings: unknown[] }
}
