/**
 * Relation Base
 *
 * Shared behavior for all relationship types.
 * Uses ModelBase interface to avoid circular dependency with Model.
 */

import type { ModelBase, ModelBaseConstructor } from '../contracts/ModelBase'
import type { Model, ModelClass } from '../Model'
import { Builder } from '../Builder'

/**
 * Base relation class
 *
 * All relation types extend this class.
 * Uses interfaces instead of concrete Model to break circular dependency.
 */
export abstract class Relation<TRelated extends ModelBase = ModelBase> {
  protected readonly parent: ModelBase
  protected readonly relatedStatic: ModelBaseConstructor

  constructor(parent: ModelBase, related: ModelBaseConstructor) {
    this.parent = parent
    this.relatedStatic = related
  }

  /**
   * Create a new query builder for the related model
   */
  protected query(): Builder<TRelated> {
    // Relations use Builder with the related model's table and connection
    // The Builder will handle hydration when executed with a ModelClass
    return new Builder<TRelated>(
      this.relatedStatic.table || this.relatedStatic.name.toLowerCase() + 's',
      this.relatedStatic.connection
    ).setModelClass(this.relatedStatic as unknown as ModelClass<Model>)
  }

  /**
   * Get related table name
   */
  protected getRelatedTable(): string {
    return this.relatedStatic.table || this.relatedStatic.name.toLowerCase() + 's'
  }

  /**
   * Get related primary key
   */
  protected getRelatedPrimaryKey(): string {
    return this.relatedStatic.primaryKey || 'id'
  }

  /**
   * Get parent's attribute value
   */
  protected getParentAttribute(key: string): unknown {
    return this.parent.getAttribute(key)
  }

  /**
   * Eager load for many parent models
   */
  abstract eagerLoadForMany(models: ModelBase[], relationName: string): Promise<void>
}
