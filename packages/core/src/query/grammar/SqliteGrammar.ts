/**
 * SQLite SQL Grammar
 *
 * Compiles query builder components into SQLite-compatible SQL.
 */

import { Grammar } from './Grammar'
import type { CompiledQuery, WhereClause } from '../../types'
import { QuerySanitizer } from '../../support/QuerySanitizer'

/**
 * SQLite Grammar
 *
 * Implements SQL generation for SQLite database.
 *
 * @example
 * ```typescript
 * const grammar = new SqliteGrammar()
 * const { sql, bindings } = grammar.compileSelect(builder)
 * ```
 */
export class SqliteGrammar extends Grammar {
  /**
   * SQLite uses ? for parameter placeholders
   */
  protected parameterPlaceholder: string = '?'

  /**
   * Compile a SELECT statement
   */
  compileSelect(components: {
    table: string
    columns?: string[]
    wheres?: WhereClause[]
    joins?: any[]
    orders?: any[]
    limit?: number
    offset?: number
    distinct?: boolean
  }): CompiledQuery {
    const bindings: any[] = []
    const parts: string[] = []

    // SELECT
    const distinct = components.distinct ? 'DISTINCT ' : ''
    const columns = components.columns && components.columns.length > 0
      ? this.wrapArray(components.columns).join(', ')
      : '*'
    parts.push(`SELECT ${distinct}${columns}`)

    // FROM
    parts.push(`FROM ${this.wrap(components.table)}`)

    // JOIN
    if (components.joins && components.joins.length > 0) {
      parts.push(this.compileJoins(components.joins))
    }

    // WHERE
    if (components.wheres && components.wheres.length > 0) {
      parts.push(this.compileWheres(components.wheres, bindings))
    }

    // ORDER BY
    if (components.orders && components.orders.length > 0) {
      parts.push(this.compileOrders(components.orders))
    }

    // LIMIT (validate to prevent injection)
    if (components.limit !== undefined) {
      const validLimit = QuerySanitizer.validateLimit(components.limit)
      parts.push(`LIMIT ${validLimit}`)
    }

    // OFFSET (validate to prevent injection)
    if (components.offset !== undefined) {
      const validOffset = QuerySanitizer.validateOffset(components.offset)
      parts.push(`OFFSET ${validOffset}`)
    }

    return {
      sql: parts.join(' '),
      bindings
    }
  }

  /**
   * Compile an INSERT statement
   */
  compileInsert(table: string, values: Record<string, any>): CompiledQuery {
    const columns = Object.keys(values)
    const bindings = Object.values(values)

    const wrappedColumns = this.wrapArray(columns).join(', ')
    const placeholders = columns.map(() => '?').join(', ')

    const sql = `INSERT INTO ${this.wrap(table)} (${wrappedColumns}) VALUES (${placeholders})`

    return { sql, bindings }
  }

  /**
   * Compile an UPDATE statement
   */
  compileUpdate(
    table: string,
    values: Record<string, any>,
    wheres: WhereClause[]
  ): CompiledQuery {
    const bindings: any[] = []

    // SET clause
    const sets = Object.entries(values).map(([column, value]) => {
      bindings.push(value)
      return `${this.wrap(column)} = ?`
    }).join(', ')

    const parts = [
      `UPDATE ${this.wrap(table)}`,
      `SET ${sets}`
    ]

    // WHERE clause
    if (wheres.length > 0) {
      parts.push(this.compileWheres(wheres, bindings))
    }

    return {
      sql: parts.join(' '),
      bindings
    }
  }

  /**
   * Compile a DELETE statement
   */
  compileDelete(table: string, wheres: WhereClause[]): CompiledQuery {
    const bindings: any[] = []

    const parts = [`DELETE FROM ${this.wrap(table)}`]

    // WHERE clause
    if (wheres.length > 0) {
      parts.push(this.compileWheres(wheres, bindings))
    }

    return {
      sql: parts.join(' '),
      bindings
    }
  }

  /**
   * Wrap a table or column name in quotes
   *
   * SQLite uses double quotes for identifiers.
   *
   * SECURITY: Sanitizes identifier before wrapping to prevent SQL injection
   */
  wrap(value: string): string {
    // Don't wrap * or already wrapped values
    if (value === '*' || value.startsWith('"')) {
      return value
    }

    // Sanitize the identifier (throws if invalid)
    const sanitized = this.sanitize(value)

    // Handle table.column syntax
    if (sanitized.includes('.')) {
      const parts = sanitized.split('.')
      return parts.map((part) => this.wrapSingle(part)).join('.')
    }

    return this.wrapSingle(sanitized)
  }

  /**
   * Wrap a single identifier (already sanitized)
   */
  private wrapSingle(value: string): string {
    // Don't wrap * or already wrapped values
    if (value === '*' || value.startsWith('"')) {
      return value
    }

    return `"${value}"`
  }
}
