/**
 * HasMany Relation
 */

import { Model, type ModelAttributesOf, type ModelClass } from '../Model'
import { Relation } from './Relation'

export class HasMany<T extends Model> extends Relation<T> {
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

  /**
   * Guess foreign key name
   */
  private guessForeignKey(): string {
    const parentName = this.parent.constructor.name.toLowerCase()
    return `${parentName}_id`
  }

  /**
   * Get results
   */
  async get(): Promise<T[]> {
    const parentId = this.parent.getAttribute(this.localKey)
    return this.query().whereColumn(this.foreignKey, parentId).get()
  }

  /**
   * Create related model
   */
  async create(attributes: Partial<ModelAttributesOf<T>>): Promise<T> {
    const ctor = this.related as unknown as new (attributes?: Partial<ModelAttributesOf<T>>) => T
    const instance = new ctor(attributes)
    const parentId = this.parent.getAttribute(this.localKey)
    instance.setAttribute(this.foreignKey, parentId)
    await instance.save()
    return instance
  }

  /**
   * Eager load for many parent models
   */
  async eagerLoadForMany(models: Model[], relationName: string): Promise<void> {
    if (models.length === 0) {
      return
    }

    const ids = models.map((model) => model.getAttribute(this.localKey))
    const results = await this.query().whereInColumn(this.foreignKey, ids).get()

    const grouped = new Map<unknown, T[]>()
    for (const result of results) {
      const fk = result.getAttribute(this.foreignKey)
      const list = grouped.get(fk) || []
      list.push(result)
      grouped.set(fk, list)
    }

    for (const model of models) {
      const id = model.getAttribute(this.localKey)
      model.setRelation(relationName, grouped.get(id) || [])
    }
  }
}
