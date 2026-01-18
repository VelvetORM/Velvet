/**
 * BelongsToMany Relation
 */

import { Model, type ModelClass } from '../Model'
import type { DatabaseRow } from '../types'
import { Relation } from './Relation'
import { Builder } from '../Builder'

export class BelongsToMany<T extends Model> extends Relation<T> {
  private pivotTable: string
  private foreignPivotKey: string
  private relatedPivotKey: string
  private relatedKey: string
  private localKey: string
  private connectionName: string

  constructor(
    parent: Model,
    related: ModelClass<T>,
    pivotTable?: string,
    foreignPivotKey?: string,
    relatedPivotKey?: string,
    relatedKey?: string,
    localKey?: string
  ) {
    super(parent, related as ModelClass<T>)

    const parentTable = (parent.constructor as typeof Model).table
    const relatedTable = this.getRelatedTable()

    this.pivotTable = pivotTable || `${parentTable}_${relatedTable}`
    this.foreignPivotKey = foreignPivotKey || `${parent.constructor.name.toLowerCase()}_id`
    this.relatedPivotKey = relatedPivotKey || `${this.related.name.toLowerCase()}_id`
    this.relatedKey = relatedKey || this.getRelatedPrimaryKey()
    this.localKey = localKey || (parent.constructor as typeof Model).primaryKey
    this.connectionName = (parent.constructor as typeof Model).connection
  }

  /**
   * Get results
   */
  async get(): Promise<T[]> {
    const parentId = this.parent.getAttribute(this.localKey)
    return this.queryRelatedForParents([parentId])
  }

  /**
   * Eager load for many parent models
   */
  async eagerLoadForMany(models: Model[], relationName: string): Promise<void> {
    if (models.length === 0) {
      return
    }

    const ids = models.map((model) => model.getAttribute(this.localKey))
    const related = await this.queryRelatedForParents(ids)

    const relatedMap = new Map<unknown, T>()
    for (const model of related) {
      relatedMap.set(model.getAttribute(this.relatedKey), model)
    }

    const pivotMap = await this.getPivotMap(ids)

    for (const model of models) {
      const id = model.getAttribute(this.localKey)
      const relatedIds = pivotMap.get(id) || []
      const results = relatedIds
        .map((relatedId) => relatedMap.get(relatedId))
        .filter((item): item is T => Boolean(item))
      model.setRelation(relationName, results)
    }
  }

  private async queryRelatedForParents(parentIds: unknown[]): Promise<T[]> {
    const pivotRows = await new Builder<DatabaseRow>(this.pivotTable, this.connectionName)
      .whereInColumn(this.foreignPivotKey, parentIds)
      .get()

    const relatedIds = pivotRows
      .map((row) => row[this.relatedPivotKey])
      .filter((id) => id !== null && id !== undefined)

    if (relatedIds.length === 0) {
      return []
    }

    return this.query().whereInColumn(this.relatedKey, relatedIds).get()
  }

  private async getPivotMap(parentIds: unknown[]): Promise<Map<unknown, unknown[]>> {
    const pivotRows = await new Builder<DatabaseRow>(this.pivotTable, this.connectionName)
      .whereInColumn(this.foreignPivotKey, parentIds)
      .get()

    const map = new Map<unknown, unknown[]>()
    for (const row of pivotRows) {
      const parentId = row[this.foreignPivotKey]
      const relatedId = row[this.relatedPivotKey]
      if (parentId === undefined || relatedId === undefined) {
        continue
      }
      const list = map.get(parentId) || []
      list.push(relatedId)
      map.set(parentId, list)
    }

    return map
  }
}
