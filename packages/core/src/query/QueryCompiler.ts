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
  private readonly cache: Map<string, { sql: string; bindings: unknown[] }>

  constructor(grammar: Grammar) {
    this.grammar = grammar
    this.cache = new Map()
  }

  compileSelect(
    components: QueryComponents,
    softDelete?: SoftDeleteConfig
  ): { sql: string; bindings: unknown[] } {
    const cacheKey = this.getCacheKey(components, softDelete)
    const cached = this.cache.get(cacheKey)
    if (cached) {
      return cached
    }

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

    const compiled = this.grammar.compileSelect({
      ...components,
      wheres: wheres.length > 0 ? wheres : undefined
    })

    this.cache.set(cacheKey, compiled)
    return compiled
  }

  private getCacheKey(
    components: QueryComponents,
    softDelete?: SoftDeleteConfig
  ): string {
    const base = {
      table: components.table,
      columns: components.columns ?? [],
      wheres: components.wheres ?? [],
      joins: components.joins ?? [],
      orders: components.orders ?? [],
      limit: components.limit ?? null,
      offset: components.offset ?? null,
      distinct: components.distinct ?? false,
      softDelete: softDelete ?? null
    }

    return JSON.stringify(base)
  }
}
