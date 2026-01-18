/**
 * QueryExecutor
 *
 * Executes compiled queries via Database facade.
 */

import { Database } from '../Database'
import type { DatabaseRow } from '../types'

export class QueryExecutor {
  private readonly connectionName?: string

  constructor(connectionName?: string) {
    this.connectionName = connectionName
  }

  async select<TRow extends DatabaseRow = DatabaseRow>(
    sql: string,
    bindings: unknown[]
  ): Promise<TRow[]> {
    return Database.select<TRow>(sql, bindings, this.connectionName)
  }
}
