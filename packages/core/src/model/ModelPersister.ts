/**
 * ModelPersister
 *
 * Handles persistence and SQL generation for a model.
 * Keeps Model focused on behavior and coordination.
 */

import type { Attributes, ModelConfiguration } from '../contracts/ModelContract'
import { Database } from '../Database'
import { QuerySanitizer } from '../support/QuerySanitizer'
import type { AttributeBag } from './AttributeBag'

export class ModelPersister<TAttributes extends Attributes = Attributes> {
  private readonly getConfig: () => ModelConfiguration
  private readonly attributes: AttributeBag<TAttributes>

  constructor(
    getConfig: () => ModelConfiguration,
    attributes: AttributeBag<TAttributes>
  ) {
    this.getConfig = getConfig
    this.attributes = attributes
  }

  async insert(): Promise<number | string | bigint> {
    const config = this.getConfig()
    const attributes = this.getInsertAttributes(config)

    const safeTable = QuerySanitizer.sanitizeTableName(config.table)
    const columns = Object.keys(attributes)
    const safeColumns = QuerySanitizer.sanitizeIdentifiers(columns, 'column name')
    const placeholders = safeColumns.map(() => '?').join(', ')
    const columnsList = safeColumns.map((c) => `"${c}"`).join(', ')

    const sql = `INSERT INTO "${safeTable}" (${columnsList}) VALUES (${placeholders})`
    const bindings = Object.values(attributes)

    return Database.insert(sql, bindings, config.connection)
  }

  async update(primaryKeyValue: unknown): Promise<number> {
    const config = this.getConfig()
    const attributes = this.getUpdateAttributes(config)

    if (Object.keys(attributes).length === 0) {
      return 0
    }

    const safeTable = QuerySanitizer.sanitizeTableName(config.table)
    const safePrimaryKey = QuerySanitizer.sanitizeColumnName(config.primaryKey)

    const sets = Object.keys(attributes)
      .map((key) => `"${QuerySanitizer.sanitizeColumnName(key)}" = ?`)
      .join(', ')

    const sql = `UPDATE "${safeTable}" SET ${sets} WHERE "${safePrimaryKey}" = ?`
    const bindings = [...Object.values(attributes), primaryKeyValue]

    return Database.update(sql, bindings, config.connection)
  }

  async delete(primaryKeyValue: unknown): Promise<number> {
    const config = this.getConfig()

    const safeTable = QuerySanitizer.sanitizeTableName(config.table)
    const safePrimaryKey = QuerySanitizer.sanitizeColumnName(config.primaryKey)

    const sql = `DELETE FROM "${safeTable}" WHERE "${safePrimaryKey}" = ?`
    return Database.delete(sql, [primaryKeyValue], config.connection)
  }

  private getInsertAttributes(config: ModelConfiguration): Record<string, unknown> {
    const attributes: Record<string, unknown> = { ...this.attributes.allRaw() }

    if (config.timestamps) {
      const now = new Date().toISOString()
      attributes[config.createdAtColumn] = now
      attributes[config.updatedAtColumn] = now
    }

    return attributes
  }

  private getUpdateAttributes(config: ModelConfiguration): Record<string, unknown> {
    const dirty = this.attributes.getDirty() as Record<string, unknown>

    if (config.timestamps) {
      dirty[config.updatedAtColumn] = new Date().toISOString()
    }

    return dirty
  }
}
