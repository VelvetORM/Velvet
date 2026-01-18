/**
 * QueryCompiler
 *
 * Centralizes query compilation before passing to the Grammar.
 */

import type { Grammar } from './grammar/Grammar'
import type { WhereClause, JoinClause, OrderByClause } from '../types'

export interface QueryComponents {
  table: string
  columns?: string[]
  wheres?: WhereClause[]
  joins?: JoinClause[]
  orders?: OrderByClause[]
  limit?: number
  offset?: number
  distinct?: boolean
}

export interface SoftDeleteConfig {
  column?: string
  includeTrashed: boolean
  onlyTrashed: boolean
}

export class QueryCompiler {
  private readonly grammar: Grammar

  constructor(grammar: Grammar) {
    this.grammar = grammar
  }

  compileSelect(
    components: QueryComponents,
    softDelete?: SoftDeleteConfig
  ): { sql: string; bindings: unknown[] } {
    const wheres = [...(components.wheres ?? [])]

    if (softDelete?.column) {
      if (softDelete.onlyTrashed) {
        wheres.push({
          type: 'null',
          column: softDelete.column,
          boolean: 'AND',
          not: true
        })
      } else if (!softDelete.includeTrashed) {
        wheres.push({
          type: 'null',
          column: softDelete.column,
          boolean: 'AND'
        })
      }
    }

    return this.grammar.compileSelect({
      ...components,
      wheres: wheres.length > 0 ? wheres : undefined
    })
  }
}
