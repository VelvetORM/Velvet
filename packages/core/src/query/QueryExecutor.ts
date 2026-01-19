/**
 * QueryExecutor
 *
 * Executes compiled queries via connection resolver.
 * Uses the injectable resolver for testability.
 */

import { resolveConnection } from '../testing/ConnectionResolver'
import type { DatabaseRow } from '../types'
import type { QueryExecutorContract } from '../contracts/QueryExecutorContract'

export class QueryExecutor implements QueryExecutorContract {
  private readonly connectionName?: string

  constructor(connectionName?: string) {
    this.connectionName = connectionName
  }

  async select<TRow extends DatabaseRow = DatabaseRow>(
    sql: string,
    bindings: unknown[]
  ): Promise<TRow[]> {
    const connection = resolveConnection(this.connectionName)
    return connection.select<TRow>(sql, bindings)
  }
}
