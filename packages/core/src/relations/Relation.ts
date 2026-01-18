/**
 * Relation Base
 *
 * Shared behavior for all relationship types.
 */

import { Model, type ModelClass } from '../Model'
import { Builder } from '../Builder'

export abstract class Relation<T extends Model> {
  protected parent: Model
  protected related: ModelClass<T>

  constructor(parent: Model, related: ModelClass<T>) {
    this.parent = parent
    this.related = related
  }

  /**
   * Create a new query builder for the related model
   */
  protected query(): Builder<T> {
    return new Builder<T>(this.related, this.related.connection)
  }

  /**
   * Get related table name
   */
  protected getRelatedTable(): string {
    return this.related.table || this.related.name.toLowerCase() + 's'
  }

  /**
   * Get related primary key
   */
  protected getRelatedPrimaryKey(): string {
    return this.related.primaryKey || 'id'
  }

  /**
   * Eager load for many parent models
   */
  abstract eagerLoadForMany(models: Model[], relationName: string): Promise<void>
}
