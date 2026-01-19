/**
 * Repository Contract
 *
 * Public interface for repositories.
 * Provides a clean, testable API for data access.
 */

import type { ComparisonOperator } from '../types'
import type { Builder } from '../Builder'
import type { Collection } from '../support/Collection'
import type { ModelAttributesOf, Model } from '../Model'

/**
 * Repository Contract
 *
 * Defines the interface for data access repositories.
 * Repositories abstract away persistence details and provide
 * a clean API for working with models.
 */
export interface RepositoryContract<T extends Model = Model> {
  // ==========================================
  // QUERY BUILDING
  // ==========================================

  /** Begin a new query */
  query(): Builder<T>

  /** Add a WHERE clause */
  where(column: string, value: unknown): Builder<T>
  where(column: string, operator: ComparisonOperator, value: unknown): Builder<T>

  /** Eager load relationships */
  with(...relations: string[]): Builder<T>

  /** Order by column */
  orderBy(column: string, direction?: 'asc' | 'desc'): Builder<T>

  /** Order by DESC */
  latest(column?: string): Builder<T>

  /** Order by ASC */
  oldest(column?: string): Builder<T>

  /** Limit results */
  limit(value: number): Builder<T>

  /** Alias for limit */
  take(value: number): Builder<T>

  /** Include soft deleted */
  withTrashed(): Builder<T>

  /** Only soft deleted */
  onlyTrashed(): Builder<T>

  /** Apply a scope */
  scope(name: string, ...args: unknown[]): Builder<T>

  // ==========================================
  // READ OPERATIONS
  // ==========================================

  /** Find by ID */
  find(id: string | number): Promise<T | null>

  /** Find by ID or throw */
  findOrFail(id: string | number): Promise<T>

  /** Find multiple by IDs */
  findMany(ids: Array<string | number>): Promise<Collection<T>>

  /** Get first result */
  first(): Promise<T | null>

  /** Get first or throw */
  firstOrFail(): Promise<T>

  /** Get all records */
  all(): Promise<Collection<T>>

  /** Alias for all */
  get(): Promise<Collection<T>>

  /** Count records */
  count(): Promise<number>

  /** Check if any records exist */
  exists(): Promise<boolean>

  // ==========================================
  // WRITE OPERATIONS
  // ==========================================

  /** Create and persist a new model */
  create(attributes: Partial<ModelAttributesOf<T>>): Promise<T>

  /** Create multiple models */
  createMany(records: Array<Partial<ModelAttributesOf<T>>>): Promise<Collection<T>>

  /** Update a model by ID */
  update(id: string | number, attributes: Partial<ModelAttributesOf<T>>): Promise<T | null>

  /** Update or create */
  updateOrCreate(
    search: Partial<ModelAttributesOf<T>>,
    attributes: Partial<ModelAttributesOf<T>>
  ): Promise<T>

  /** Delete by ID */
  delete(id: string | number): Promise<boolean>

  /** Delete multiple by IDs */
  deleteMany(ids: Array<string | number>): Promise<number>

  /** Save a model instance */
  save(model: T): Promise<boolean>
}
