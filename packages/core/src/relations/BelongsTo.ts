/**
 * BelongsTo Relation
 *
 * Represents an inverse one-to-one or one-to-many relationship.
 */

import type { ModelBase, ModelBaseConstructor } from '../contracts/ModelBase'
import { Relation } from './Relation'

/**
 * BelongsTo relation
 *
 * Example: Post belongsTo User
 */
export class BelongsTo<TRelated extends ModelBase = ModelBase> extends Relation<TRelated> {
  private readonly foreignKey: string
  private readonly ownerKey: string

  constructor(
    parent: ModelBase,
    related: ModelBaseConstructor,
    foreignKey?: string,
    ownerKey?: string
  ) {
    super(parent, related)
    this.foreignKey = foreignKey || this.guessForeignKey()
    this.ownerKey = ownerKey || this.getRelatedPrimaryKey()
  }

  /**
   * Guess foreign key name based on related model
   */
  private guessForeignKey(): string {
    const relatedName = this.relatedStatic.name.toLowerCase()
    return `${relatedName}_id`
  }

  /**
   * Get the related model
   */
  async get(): Promise<TRelated | null> {
    const foreignId = this.getParentAttribute(this.foreignKey)
    return this.query().whereColumn(this.ownerKey, foreignId).first()
  }

  /**
   * Associate a model
   */
  associate(model: TRelated): void {
    const ownerValue = model.getAttribute(this.ownerKey)
    this.parent.setAttribute(this.foreignKey, ownerValue)
  }

  /**
   * Dissociate the relation
   */
  dissociate(): void {
    this.parent.setAttribute(this.foreignKey, null)
  }

  /**
   * Eager load for multiple parent models
   */
  async eagerLoadForMany(models: ModelBase[], relationName: string): Promise<void> {
    if (models.length === 0) return

    // Collect all foreign key values
    const ids = models
      .map((model) => model.getAttribute(this.foreignKey))
      .filter((id) => id !== null && id !== undefined)

    if (ids.length === 0) {
      for (const model of models) {
        model.setRelation(relationName, null)
      }
      return
    }

    // Query all related models at once
    const results = await this.query().whereInColumn(this.ownerKey, ids).get()

    // Map by owner key
    const resultMap = new Map<unknown, TRelated>()
    for (const result of results) {
      const key = result.getAttribute(this.ownerKey)
      resultMap.set(key, result)
    }

    // Assign to each parent
    for (const model of models) {
      const foreignId = model.getAttribute(this.foreignKey)
      model.setRelation(relationName, resultMap.get(foreignId) || null)
    }
  }
}
