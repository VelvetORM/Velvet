/**
 * SchemaRegistry
 *
 * Stores schema blueprints for model/type generation.
 */

import type { Blueprint } from '../Schema'

export class SchemaRegistry {
  private readonly tables: Map<string, Blueprint> = new Map()

  register(blueprint: Blueprint): void {
    this.tables.set(blueprint.tableName, blueprint)
  }

  get(tableName: string): Blueprint | undefined {
    return this.tables.get(tableName)
  }

  list(): Blueprint[] {
    return Array.from(this.tables.values())
  }
}
