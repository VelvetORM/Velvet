/**
 * BelongsToMany Relation
 *
 * Represents a many-to-many relationship via a pivot table.
 */

import type { ModelBase, ModelBaseConstructor, ModelBaseStatic } from '../contracts/ModelBase'
import { Collection } from '../support/Collection'
import type { DatabaseRow } from '../types'
import { Relation } from './Relation'
import { Builder } from '../Builder'
import { Database } from '../Database'
import { QuerySanitizer } from '../support/QuerySanitizer'

/**
 * BelongsToMany relation
 *
 * Example: User belongsToMany Roles
 */
export class BelongsToMany<TRelated extends ModelBase = ModelBase> extends Relation<TRelated> {
  private readonly pivotTable: string
  private readonly foreignPivotKey: string
  private readonly relatedPivotKey: string
  private readonly relatedKey: string
  private readonly localKey: string
  private readonly connectionName: string
  constructor(
    parent: ModelBase,
    parentStatic: ModelBaseStatic,
    related: ModelBaseConstructor,
    pivotTable?: string,
    foreignPivotKey?: string,
    relatedPivotKey?: string,
    relatedKey?: string,
    localKey?: string
  ) {
    super(parent, related)

    const parentTable = parentStatic.table || parentStatic.name.toLowerCase() + 's'
    const relatedTable = this.getRelatedTable()

    this.pivotTable = pivotTable || this.buildPivotTableName(parentTable, relatedTable)
    this.foreignPivotKey = foreignPivotKey || `${parentStatic.name.toLowerCase()}_id`
    this.relatedPivotKey = relatedPivotKey || `${related.name.toLowerCase()}_id`
    this.relatedKey = relatedKey || this.getRelatedPrimaryKey()
    this.localKey = localKey || parentStatic.primaryKey
    this.connectionName = parentStatic.connection
  }

  /**
   * Build pivot table name from two table names (alphabetically sorted)
   */
  private buildPivotTableName(table1: string, table2: string): string {
    // Convention: alphabetical order, singular form
    const singular1 = this.singularize(table1)
    const singular2 = this.singularize(table2)
    const sorted = [singular1, singular2].sort()
    return `${sorted[0]}_${sorted[1]}`
  }

  /**
   * Simple singularize (removes trailing 's')
   */
  private singularize(word: string): string {
    return word.endsWith('s') ? word.slice(0, -1) : word
  }

  /**
   * Get results
   */
  async get(): Promise<Collection<TRelated>> {
    const parentId = this.getParentAttribute(this.localKey)
    return this.queryRelatedForParents([parentId])
  }

  /**
   * Eager load for many parent models
   */
  async eagerLoadForMany(models: ModelBase[], relationName: string): Promise<void> {
    if (models.length === 0) {
      return
    }

    const ids = models.map((model) => model.getAttribute(this.localKey))
    const related = await this.queryRelatedForParents(ids)

    const relatedMap = new Map<unknown, TRelated>()
    for (const model of related) {
      relatedMap.set(model.getAttribute(this.relatedKey), model)
    }

    const pivotMap = await this.getPivotMap(ids)

    for (const model of models) {
      const id = model.getAttribute(this.localKey)
      const relatedIds = pivotMap.get(id) || []
      const results = relatedIds
        .map((relatedId) => relatedMap.get(relatedId))
        .filter((item): item is TRelated => Boolean(item))
      model.setRelation(relationName, results)
    }
  }

  /**
   * Attach related models
   */
  async attach(ids: unknown | unknown[], attributes?: Record<string, unknown>): Promise<void> {
    const parentId = this.getParentAttribute(this.localKey)
    const idsArray = Array.isArray(ids) ? ids : [ids]

    for (const relatedId of idsArray) {
      const pivotData: Record<string, unknown> = {
        [this.foreignPivotKey]: parentId,
        [this.relatedPivotKey]: relatedId,
        ...attributes
      }

      const columns = Object.keys(pivotData)
      const safeTable = QuerySanitizer.sanitizeTableName(this.pivotTable)
      const safeColumns = QuerySanitizer.sanitizeIdentifiers(columns, 'pivot column')
      const placeholders = safeColumns.map(() => '?').join(', ')
      const columnsList = safeColumns.map((c) => `"${c}"`).join(', ')

      const sql = `INSERT INTO "${safeTable}" (${columnsList}) VALUES (${placeholders})`
      await Database.insert(sql, Object.values(pivotData), this.connectionName)
    }
  }

  /**
   * Detach related models
   */
  async detach(ids?: unknown | unknown[]): Promise<void> {
    const parentId = this.getParentAttribute(this.localKey)

    if (ids === undefined) {
      // Detach all
      const safeTable = QuerySanitizer.sanitizeTableName(this.pivotTable)
      const safeForeignKey = QuerySanitizer.sanitizeColumnName(this.foreignPivotKey)
      const sql = `DELETE FROM "${safeTable}" WHERE "${safeForeignKey}" = ?`
      await Database.delete(sql, [parentId], this.connectionName)
    } else {
      const idsArray = Array.isArray(ids) ? ids : [ids]
      const placeholders = idsArray.map(() => '?').join(', ')
      const safeTable = QuerySanitizer.sanitizeTableName(this.pivotTable)
      const safeForeignKey = QuerySanitizer.sanitizeColumnName(this.foreignPivotKey)
      const safeRelatedKey = QuerySanitizer.sanitizeColumnName(this.relatedPivotKey)
      const sql = `DELETE FROM "${safeTable}" WHERE "${safeForeignKey}" = ? AND "${safeRelatedKey}" IN (${placeholders})`
      await Database.delete(sql, [parentId, ...idsArray], this.connectionName)
    }
  }

  /**
   * Sync related models
   */
  async sync(ids: unknown[]): Promise<void> {
    await this.detach()
    await this.attach(ids)
  }

  private async queryRelatedForParents(parentIds: unknown[]): Promise<Collection<TRelated>> {
    const pivotRows = await new Builder<DatabaseRow>(this.pivotTable, this.connectionName)
      .whereInColumn(this.foreignPivotKey, parentIds)
      .get()

    const relatedIds = pivotRows
      .map((row) => row[this.relatedPivotKey])
      .filter((id) => id !== null && id !== undefined)
      .toArray()

    if (relatedIds.length === 0) {
      return new Collection<TRelated>()
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
