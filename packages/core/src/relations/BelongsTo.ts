/**
 * BelongsTo Relation
 */

import { Model, type ModelClass } from '../Model'
import { Relation } from './Relation'

export class BelongsTo<T extends Model> extends Relation<T> {
  private foreignKey: string
  private ownerKey: string

  constructor(
    parent: Model,
    related: ModelClass<T>,
    foreignKey?: string,
    ownerKey?: string
  ) {
    super(parent, related as ModelClass<T>)
    this.foreignKey = foreignKey || this.guessForeignKey()
    this.ownerKey = ownerKey || this.getRelatedPrimaryKey()
  }

  private guessForeignKey(): string {
    const relatedName = this.related.name.toLowerCase()
    return `${relatedName}_id`
  }

  async get(): Promise<T | null> {
    const foreignId = this.parent.getAttribute(this.foreignKey)
    return this.query().whereColumn(this.ownerKey, foreignId).first()
  }

  async eagerLoadForMany(models: Model[], relationName: string): Promise<void> {
    if (models.length === 0) {
      return
    }

    const ids = models
      .map((model) => model.getAttribute(this.foreignKey))
      .filter((id) => id !== null && id !== undefined)

    if (ids.length === 0) {
      for (const model of models) {
        model.setRelation(relationName, null)
      }
      return
    }

    const results = await this.query().whereInColumn(this.ownerKey, ids).get()

    const grouped = new Map<unknown, T>()
    for (const result of results) {
      const key = result.getAttribute(this.ownerKey)
      grouped.set(key, result)
    }

    for (const model of models) {
      const foreignId = model.getAttribute(this.foreignKey)
      model.setRelation(relationName, grouped.get(foreignId) || null)
    }
  }
}
