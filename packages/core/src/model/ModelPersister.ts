/**
 * ModelPersister
 *
 * Handles persistence and SQL generation for a model.
 * Keeps Model focused on behavior and coordination.
 * Uses injectable connection resolver for testability.
 */

import type { Attributes, ModelConfiguration } from '../contracts/ModelContract'
import { resolveConnection } from '../testing/ConnectionResolver'
import { GrammarFactory } from '../query/grammar/GrammarFactory'
import type { WhereClause } from '../types'
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

    const grammar = GrammarFactory.create(config.connection)
    const compiled = grammar.compileInsert(config.table, attributes)
    const connection = resolveConnection(config.connection)
    return connection.insert(compiled.sql, compiled.bindings)
  }

  async update(primaryKeyValue: unknown): Promise<number> {
    const config = this.getConfig()
    const attributes = this.getUpdateAttributes(config)

    if (Object.keys(attributes).length === 0) {
      return 0
    }

    const grammar = GrammarFactory.create(config.connection)
    const wheres: WhereClause[] = [{
      type: 'basic',
      column: config.primaryKey,
      operator: '=',
      value: primaryKeyValue,
      boolean: 'AND'
    }]
    const compiled = grammar.compileUpdate(config.table, attributes, wheres)
    const connection = resolveConnection(config.connection)
    return connection.update(compiled.sql, compiled.bindings)
  }

  async delete(primaryKeyValue: unknown): Promise<number> {
    const config = this.getConfig()

    const grammar = GrammarFactory.create(config.connection)
    const wheres: WhereClause[] = [{
      type: 'basic',
      column: config.primaryKey,
      operator: '=',
      value: primaryKeyValue,
      boolean: 'AND'
    }]
    const compiled = grammar.compileDelete(config.table, wheres)
    const connection = resolveConnection(config.connection)
    return connection.delete(compiled.sql, compiled.bindings)
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
