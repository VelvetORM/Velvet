/**
 * HasOne Relation
 */

import { Model, type ModelClass } from '../Model'
import { Relation } from './Relation'

export class HasOne<T extends Model> extends Relation<T> {
  private foreignKey: string
  private localKey: string

  constructor(
    parent: Model,
    related: ModelClass<T>,
    foreignKey?: string,
    localKey?: string
  ) {
    super(parent, related as ModelClass<T>)
    this.foreignKey = foreignKey || this.guessForeignKey()
    this.localKey = localKey || (parent.constructor as typeof Model).primaryKey
  }

  private guessForeignKey(): string {
    const parentName = this.parent.constructor.name.toLowerCase()
    return `${parentName}_id`
  }

  async get(): Promise<T | null> {
    const parentId = this.parent.getAttribute(this.localKey)
    return this.query().whereColumn(this.foreignKey, parentId).first()
  }

  async eagerLoadForMany(models: Model[], relationName: string): Promise<void> {
    if (models.length === 0) {
      return
    }

    const ids = models.map((model) => model.getAttribute(this.localKey))
    const results = await this.query().whereInColumn(this.foreignKey, ids).get()

    const grouped = new Map<unknown, T>()
    for (const result of results) {
      const fk = result.getAttribute(this.foreignKey)
      if (!grouped.has(fk)) {
        grouped.set(fk, result)
      }
    }

    for (const model of models) {
      const id = model.getAttribute(this.localKey)
      model.setRelation(relationName, grouped.get(id) || null)
    }
  }
}
