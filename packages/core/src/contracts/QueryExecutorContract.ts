/**
 * QueryExecutor Contract
 *
 * Public interface for query execution.
 */

import type { DatabaseRow } from '../types'

export interface QueryExecutorContract {
  select<TRow extends DatabaseRow = DatabaseRow>(
    sql: string,
    bindings: unknown[]
  ): Promise<TRow[]>
}
