/**
 * QueryState
 *
 * Holds mutable query state for Builder.
 * All boolean properties follow consistent naming without "Flag" suffix.
 */

import type { WhereClause, JoinClause, OrderByClause } from '../types'

export class QueryState {
  /** Columns to select */
  columns: string[] = []

  /** WHERE clauses */
  wheres: WhereClause[] = []

  /** JOIN clauses */
  joins: JoinClause[] = []

  /** ORDER BY clauses */
  orders: OrderByClause[] = []

  /** LIMIT value */
  limit?: number

  /** OFFSET value */
  offset?: number

  /** Whether to use DISTINCT */
  distinct: boolean = false

  /** Relations to eager load */
  eagerLoad: string[] = []

  /** Soft delete column name (if model uses soft deletes) */
  softDeleteColumn?: string

  /** Include soft deleted records */
  includeTrashed: boolean = false

  /** Only return soft deleted records */
  onlyTrashed: boolean = false

  /** Allow raw SQL (unsafe) */
  allowUnsafeRaw: boolean = false

  /**
   * Clone the query state
   */
  clone(): QueryState {
    const cloned = new QueryState()
    cloned.columns = [...this.columns]
    cloned.wheres = [...this.wheres]
    cloned.joins = [...this.joins]
    cloned.orders = [...this.orders]
    cloned.limit = this.limit
    cloned.offset = this.offset
    cloned.distinct = this.distinct
    cloned.eagerLoad = [...this.eagerLoad]
    cloned.softDeleteColumn = this.softDeleteColumn
    cloned.includeTrashed = this.includeTrashed
    cloned.onlyTrashed = this.onlyTrashed
    cloned.allowUnsafeRaw = this.allowUnsafeRaw
    return cloned
  }
}
