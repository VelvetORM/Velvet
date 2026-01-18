/**
 * HasMany Relation
 *
 * Represents a one-to-many relationship.
 */

import type { ModelBase, ModelBaseConstructor, ModelBaseStatic } from '../contracts/ModelBase'
import { Collection } from '../support/Collection'
import { Relation } from './Relation'

/**
 * HasMany relation
 *
 * Example: User hasMany Posts
 */
export class HasMany<TRelated extends ModelBase = ModelBase> extends Relation<TRelated> {
  private readonly foreignKey: string
  private readonly localKey: string
  private readonly parentStatic: ModelBaseStatic

  constructor(
    parent: ModelBase,
    parentStatic: ModelBaseStatic,
    related: ModelBaseConstructor,
    foreignKey?: string,
    localKey?: string
  ) {
    super(parent, related)
    this.parentStatic = parentStatic
    this.foreignKey = foreignKey || this.guessForeignKey()
    this.localKey = localKey || parentStatic.primaryKey
  }

  /**
   * Guess foreign key name based on parent model
   */
  private guessForeignKey(): string {
    const parentName = this.parentStatic.name.toLowerCase()
    return `${parentName}_id`
  }

  /**
   * Get related models
   */
  async get(): Promise<Collection<TRelated>> {
    const parentId = this.getParentAttribute(this.localKey)
    return this.query().whereColumn(this.foreignKey, parentId).get()
  }

  /**
   * Create a new related model
   */
  async create(attributes: Record<string, unknown>): Promise<TRelated> {
    const instance = new this.relatedStatic() as TRelated
    const parentId = this.getParentAttribute(this.localKey)

    // Set all attributes
    for (const [key, value] of Object.entries(attributes)) {
      instance.setAttribute(key, value)
    }
    // Set foreign key
    instance.setAttribute(this.foreignKey, parentId)

    await instance.save()
    return instance
  }

  /**
   * Eager load for multiple parent models
   */
  async eagerLoadForMany(models: ModelBase[], relationName: string): Promise<void> {
    if (models.length === 0) return

    // Collect all parent IDs
    const ids = models.map((model) => model.getAttribute(this.localKey))

    // Query all related models at once
    const results = await this.query().whereInColumn(this.foreignKey, ids).get()

    // Group by foreign key
    const grouped = new Map<unknown, TRelated[]>()
    for (const result of results) {
      const fk = result.getAttribute(this.foreignKey)
      const list = grouped.get(fk) || []
      list.push(result)
      grouped.set(fk, list)
    }

    // Assign to each parent
    for (const model of models) {
      const id = model.getAttribute(this.localKey)
      model.setRelation(relationName, grouped.get(id) || [])
    }
  }
}
