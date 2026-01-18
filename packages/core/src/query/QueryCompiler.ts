/**
 * QueryCompiler
 *
 * Centralizes query compilation before passing to the Grammar.
 */

import type { Grammar } from './grammar/Grammar'
import type { WhereClause, JoinClause, OrderByClause } from '../types'
import { QuerySanitizer } from '../support/QuerySanitizer'

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
    const sanitizedComponents = this.sanitizeComponents(components)
    const sanitizedSoftDelete = this.sanitizeSoftDelete(softDelete)

    const cacheKey = this.getCacheKey(sanitizedComponents, sanitizedSoftDelete)
    const cached = this.cache.get(cacheKey)
    if (cached) {
      return cached
    }

    const wheres = [...(sanitizedComponents.wheres ?? [])]

    if (sanitizedSoftDelete?.column) {
      if (sanitizedSoftDelete.onlyTrashed) {
        wheres.push({
          type: 'null',
          column: sanitizedSoftDelete.column,
          boolean: 'AND',
          not: true
        })
      } else if (!sanitizedSoftDelete.includeTrashed) {
        wheres.push({
          type: 'null',
          column: sanitizedSoftDelete.column,
          boolean: 'AND'
        })
      }
    }

    const compiled = this.grammar.compileSelect({
      ...sanitizedComponents,
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

  private sanitizeComponents(components: QueryComponents): QueryComponents {
    const sanitized: QueryComponents = {
      ...components,
      table: QuerySanitizer.sanitizeTableName(components.table)
    }

    if (components.columns) {
      sanitized.columns = QuerySanitizer.sanitizeIdentifiers(components.columns, 'column name')
    }

    if (components.joins) {
      sanitized.joins = components.joins.map((join): JoinClause => ({
        ...join,
        table: QuerySanitizer.sanitizeTableName(join.table),
        first: QuerySanitizer.sanitizeIdentifier(join.first, 'join column'),
        second: QuerySanitizer.sanitizeIdentifier(join.second, 'join column')
      }))
    }

    if (components.orders) {
      sanitized.orders = components.orders.map((order): OrderByClause => ({
        ...order,
        column: QuerySanitizer.sanitizeIdentifier(order.column, 'order column')
      }))
    }

    if (components.wheres) {
      sanitized.wheres = components.wheres.map((where): WhereClause => {
        if (!where.column) {
          return where
        }

        if (where.type === 'raw') {
          return where
        }

        return {
          ...where,
          column: QuerySanitizer.sanitizeIdentifier(where.column, 'where column')
        }
      })
    }

    return sanitized
  }

  private sanitizeSoftDelete(softDelete?: SoftDeleteConfig): SoftDeleteConfig | undefined {
    if (!softDelete) {
      return undefined
    }

    return {
      ...softDelete,
      column: softDelete.column
        ? QuerySanitizer.sanitizeColumnName(softDelete.column)
        : undefined
    }
  }
}
