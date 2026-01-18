/**
 * HasOne Relation
 *
 * Represents a one-to-one relationship.
 */

import type { ModelBase, ModelBaseConstructor, ModelBaseStatic } from '../contracts/ModelBase'
import { Relation } from './Relation'

/**
 * HasOne relation
 *
 * Example: User hasOne Profile
 */
export class HasOne<TRelated extends ModelBase = ModelBase> extends Relation<TRelated> {
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
   * Get the related model
   */
  async get(): Promise<TRelated | null> {
    const parentId = this.getParentAttribute(this.localKey)
    return this.query().whereColumn(this.foreignKey, parentId).first()
  }

  /**
   * Create a new related model
   */
  async create(attributes: Record<string, unknown>): Promise<TRelated> {
    const instance = new this.relatedStatic() as TRelated
    const parentId = this.getParentAttribute(this.localKey)

    for (const [key, value] of Object.entries(attributes)) {
      instance.setAttribute(key, value)
    }
    instance.setAttribute(this.foreignKey, parentId)

    await instance.save()
    return instance
  }

  /**
   * Eager load for multiple parent models
   */
  async eagerLoadForMany(models: ModelBase[], relationName: string): Promise<void> {
    if (models.length === 0) return

    const ids = models.map((model) => model.getAttribute(this.localKey))
    const results = await this.query().whereInColumn(this.foreignKey, ids).get()

    // Map by foreign key
    const resultMap = new Map<unknown, TRelated>()
    for (const result of results) {
      const fk = result.getAttribute(this.foreignKey)
      resultMap.set(fk, result)
    }

    // Assign to each parent
    for (const model of models) {
      const id = model.getAttribute(this.localKey)
      model.setRelation(relationName, resultMap.get(id) || null)
    }
  }
}
