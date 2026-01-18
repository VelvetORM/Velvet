/**
 * SQL Grammar Base
 *
 * Abstract base class for database-specific SQL grammars.
 * Each database (Postgres, MySQL, SQLite) extends this to implement its SQL dialect.
 */

import type {
  WhereClause,
  JoinClause,
  OrderByClause,
  CompiledQuery,
  SelectComponents
} from '../../types'
import { QuerySanitizer } from '../../support/QuerySanitizer'
import { LRUCache } from '../../support/LRUCache'

/**
 * Abstract Grammar Class
 *
 * Defines the contract for compiling query builder components into SQL.
 */
export abstract class Grammar {
  /**
   * Table prefix for all queries
   */
  protected tablePrefix: string = ''

  /**
   * Parameter placeholder (?, $1, etc)
   */
  protected abstract parameterPlaceholder: string

  /**
   * Query compilation cache (LRU)
   */
  protected compilationCache: LRUCache<string, CompiledQuery> = new LRUCache(500)

  /**
   * Enable/disable query caching
   */
  protected cachingEnabled: boolean = true

  /**
   * Enable or disable query compilation caching
   */
  setCachingEnabled(enabled: boolean): this {
    this.cachingEnabled = enabled
    return this
  }

  /**
   * Clear compiled query cache
   */
  clearCompilationCache(): void {
    this.compilationCache.clear()
  }

  /**
   * Get compiled query cache stats
   */
  getCompilationCacheStats(): { hits: number; misses: number; hitRate: number; size: number } {
    return this.compilationCache.stats()
  }

  /**
   * Build a stable cache key for compiled queries
   */
  protected getCompilationCacheKey(components: unknown): string {
    return JSON.stringify({
      grammar: this.constructor.name,
      tablePrefix: this.tablePrefix,
      components
    })
  }

  /**
   * Clone a compiled query to avoid mutating cached values
   */
  protected cloneCompiledQuery(query: CompiledQuery): CompiledQuery {
    return { sql: query.sql, bindings: [...query.bindings] }
  }

  /**
   * Compile a SELECT statement
   *
   * @param builder - Query builder components
   * @returns Compiled SQL with bindings
   */
  abstract compileSelect(builder: SelectComponents): CompiledQuery

  /**
   * Compile an INSERT statement
   *
   * @param table - Table name
   * @param values - Values to insert
   * @returns Compiled SQL with bindings
   */
  abstract compileInsert(table: string, values: Record<string, unknown>): CompiledQuery

  /**
   * Compile an UPDATE statement
   *
   * @param table - Table name
   * @param values - Values to update
   * @param wheres - WHERE clauses
   * @returns Compiled SQL with bindings
   */
  abstract compileUpdate(
    table: string,
    values: Record<string, unknown>,
    wheres: WhereClause[]
  ): CompiledQuery

  /**
   * Compile a DELETE statement
   *
   * @param table - Table name
   * @param wheres - WHERE clauses
   * @returns Compiled SQL with bindings
   */
  abstract compileDelete(table: string, wheres: WhereClause[]): CompiledQuery

  /**
   * Wrap a table or column name in appropriate quotes
   *
   * SECURITY: This method MUST sanitize the identifier before wrapping
   *
   * @param value - Table or column name
   * @returns Quoted identifier
   * @throws {QueryException} If identifier is invalid
   */
  abstract wrap(value: string): string

  /**
   * Sanitize and validate an identifier before use
   *
   * @param identifier - Identifier to sanitize
   * @param context - Context for error messages
   * @returns Sanitized identifier
   * @protected
   */
  protected sanitize(identifier: string, context: string = 'identifier'): string {
    return QuerySanitizer.sanitizeIdentifier(identifier, context)
  }

  /**
   * Compile WHERE clauses
   *
   * @param wheres - Array of WHERE clauses
   * @param bindings - Bindings array to append to
   * @returns SQL string
   */
  protected compileWheres(wheres: WhereClause[], bindings: unknown[]): string {
    if (wheres.length === 0) {
      return ''
    }

    const compiled = wheres.map((where, index) => {
      const prefix = index === 0 ? 'WHERE' : where.boolean

      switch (where.type) {
        case 'basic':
          return this.compileBasicWhere(where, bindings, prefix)

        case 'in':
          return this.compileInWhere(where, bindings, prefix)

        case 'null':
          return this.compileNullWhere(where, prefix)

        case 'between':
          return this.compileBetweenWhere(where, bindings, prefix)

        case 'raw':
          return this.compileRawWhere(where, bindings, prefix)

        default:
          return ''
      }
    })

    return compiled.join(' ')
  }

  /**
   * Compile a basic WHERE clause
   */
  protected compileBasicWhere(where: WhereClause, bindings: unknown[], prefix: string): string {
    bindings.push(where.value)
    const not = where.not ? 'NOT ' : ''
    return `${prefix} ${not}${this.wrap(where.column!)} ${where.operator} ${this.getParameterPlaceholder(bindings.length)}`
  }

  /**
   * Compile an IN WHERE clause
   */
  protected compileInWhere(where: WhereClause, bindings: unknown[], prefix: string): string {
    const placeholders = where.values!.map((value) => {
      bindings.push(value)
      return this.getParameterPlaceholder(bindings.length)
    }).join(', ')

    const not = where.not ? 'NOT ' : ''
    return `${prefix} ${this.wrap(where.column!)} ${not}IN (${placeholders})`
  }

  /**
   * Compile a NULL WHERE clause
   */
  protected compileNullWhere(where: WhereClause, prefix: string): string {
    const operator = where.not ? 'IS NOT NULL' : 'IS NULL'
    return `${prefix} ${this.wrap(where.column!)} ${operator}`
  }

  /**
   * Compile a BETWEEN WHERE clause
   */
  protected compileBetweenWhere(where: WhereClause, bindings: unknown[], prefix: string): string {
    const [min, max] = where.values!
    bindings.push(min, max)

    const placeholder1 = this.getParameterPlaceholder(bindings.length - 1)
    const placeholder2 = this.getParameterPlaceholder(bindings.length)

    const not = where.not ? 'NOT ' : ''
    return `${prefix} ${this.wrap(where.column!)} ${not}BETWEEN ${placeholder1} AND ${placeholder2}`
  }

  /**
   * Compile a raw WHERE clause
   */
  protected compileRawWhere(where: WhereClause, bindings: unknown[], prefix: string): string {
    if (where.values) {
      bindings.push(...where.values)
    }
    return `${prefix} ${where.value}`
  }

  /**
   * Compile ORDER BY clauses
   */
  protected compileOrders(orders: OrderByClause[]): string {
    if (orders.length === 0) {
      return ''
    }

    const compiled = orders.map((order) => {
      // Sanitize direction to prevent injection
      const safeDirection = QuerySanitizer.sanitizeDirection(order.direction as string)
      return `${this.wrap(order.column)} ${safeDirection}`
    }).join(', ')

    return `ORDER BY ${compiled}`
  }

  /**
   * Compile JOIN clauses
   */
  protected compileJoins(joins: JoinClause[]): string {
    if (joins.length === 0) {
      return ''
    }

    return joins.map((join) => {
      return `${join.type} JOIN ${this.wrap(join.table)} ON ${this.wrap(join.first)} ${join.operator} ${this.wrap(join.second)}`
    }).join(' ')
  }

  /**
   * Get parameter placeholder for specific position
   *
   * @param position - Parameter position (1-indexed)
   * @returns Placeholder string
   */
  protected getParameterPlaceholder(_position: number): string {
    return this.parameterPlaceholder
  }

  /**
   * Wrap multiple columns
   */
  protected wrapArray(values: string[]): string[] {
    return values.map((value) => this.wrap(value))
  }

  /**
   * Set table prefix
   */
  setTablePrefix(prefix: string): this {
    this.tablePrefix = prefix
    return this
  }

  /**
   * Get table prefix
   */
  getTablePrefix(): string {
    return this.tablePrefix
  }
}
