/**
 * QueryState
 *
 * Holds mutable query state for Builder.
 */

import type { WhereClause, JoinClause, OrderByClause } from '../types'

export class QueryState {
  columns: string[] = []
  wheres: WhereClause[] = []
  joins: JoinClause[] = []
  orders: OrderByClause[] = []
  limitValue?: number
  offsetValue?: number
  distinctFlag: boolean = false
  eagerLoad: string[] = []
  softDeleteColumn?: string
  includeTrashed: boolean = false
  onlyTrashedFlag: boolean = false

  clone(): QueryState {
    const cloned = new QueryState()
    cloned.columns = [...this.columns]
    cloned.wheres = [...this.wheres]
    cloned.joins = [...this.joins]
    cloned.orders = [...this.orders]
    cloned.limitValue = this.limitValue
    cloned.offsetValue = this.offsetValue
    cloned.distinctFlag = this.distinctFlag
    cloned.eagerLoad = [...this.eagerLoad]
    cloned.softDeleteColumn = this.softDeleteColumn
    cloned.includeTrashed = this.includeTrashed
    cloned.onlyTrashedFlag = this.onlyTrashedFlag
    return cloned
  }
}
