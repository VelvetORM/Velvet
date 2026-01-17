/**
 * Query Sanitizer
 *
 * Validates and sanitizes SQL identifiers to prevent SQL injection attacks.
 */

import { QueryException } from '../exceptions'

/**
 * Query Sanitizer
 *
 * Provides methods to safely validate table names, column names, and other
 * SQL identifiers to prevent injection attacks.
 *
 * @example
 * ```typescript
 * const safeName = QuerySanitizer.sanitizeIdentifier('users')
 * const safeColumn = QuerySanitizer.sanitizeIdentifier('email')
 * ```
 */
export class QuerySanitizer {
  /**
   * Valid identifier pattern (alphanumeric, underscore, no leading numbers)
   * Supports: users, user_posts, table_123, _private
   * Blocks: user-posts, users; DROP TABLE, 1users, user.name
   */
  private static readonly IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/

  /**
   * Maximum length for identifiers
   */
  private static readonly MAX_IDENTIFIER_LENGTH = 64

  /**
   * SQL reserved keywords that should be quoted
   */
  private static readonly RESERVED_KEYWORDS = new Set([
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
    'TABLE', 'INDEX', 'VIEW', 'FROM', 'WHERE', 'JOIN', 'ON', 'AND', 'OR',
    'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'AS', 'IN', 'NOT',
    'NULL', 'IS', 'LIKE', 'BETWEEN', 'EXISTS', 'DISTINCT', 'UNION', 'ALL'
  ])

  /**
   * Sanitize a SQL identifier (table or column name)
   *
   * @param identifier - Identifier to sanitize
   * @param context - Context for better error messages
   * @returns Sanitized identifier
   * @throws {QueryException} If identifier is invalid
   *
   * @example
   * ```typescript
   * QuerySanitizer.sanitizeIdentifier('users') // ✅ 'users'
   * QuerySanitizer.sanitizeIdentifier('user-posts') // ❌ throws
   * QuerySanitizer.sanitizeIdentifier("users'; DROP TABLE") // ❌ throws
   * ```
   */
  static sanitizeIdentifier(identifier: string, context: string = 'identifier'): string {
    // Check if empty
    if (!identifier || identifier.trim().length === 0) {
      throw new QueryException(
        `Invalid ${context}: cannot be empty`,
        undefined,
        undefined,
        'INVALID_IDENTIFIER',
        { identifier, context }
      )
    }

    // Trim whitespace
    identifier = identifier.trim()

    // Check length
    if (identifier.length > this.MAX_IDENTIFIER_LENGTH) {
      throw new QueryException(
        `Invalid ${context}: exceeds maximum length of ${this.MAX_IDENTIFIER_LENGTH} characters`,
        undefined,
        undefined,
        'IDENTIFIER_TOO_LONG',
        { identifier, maxLength: this.MAX_IDENTIFIER_LENGTH, context }
      )
    }

    // Check for qualified names (table.column)
    if (identifier.includes('.')) {
      const parts = identifier.split('.')
      if (parts.length > 2) {
        throw new QueryException(
          `Invalid ${context}: too many parts in qualified name`,
          undefined,
          undefined,
          'INVALID_QUALIFIED_NAME',
          { identifier, context }
        )
      }
      return parts.map((part) => this.sanitizeSingleIdentifier(part, context)).join('.')
    }

    return this.sanitizeSingleIdentifier(identifier, context)
  }

  /**
   * Sanitize a single identifier (no dots)
   *
   * @param identifier - Single identifier
   * @param context - Context for errors
   * @returns Sanitized identifier
   * @throws {QueryException} If invalid
   */
  private static sanitizeSingleIdentifier(identifier: string, context: string): string {
    // Allow * for SELECT *
    if (identifier === '*') {
      return identifier
    }

    // Check pattern
    if (!this.IDENTIFIER_PATTERN.test(identifier)) {
      throw new QueryException(
        `Invalid ${context}: "${identifier}" contains invalid characters. ` +
        `Only alphanumeric characters and underscores are allowed.`,
        undefined,
        undefined,
        'INVALID_IDENTIFIER_PATTERN',
        {
          identifier,
          context,
          allowedPattern: 'alphanumeric and underscore',
          hint: 'Identifiers must start with a letter or underscore'
        }
      )
    }

    // Check if reserved keyword (case-insensitive)
    if (this.RESERVED_KEYWORDS.has(identifier.toUpperCase())) {
      // Don't throw, just mark as needing quoting
      // This will be handled by Grammar.wrap()
    }

    return identifier
  }

  /**
   * Sanitize table name
   *
   * @param tableName - Table name to sanitize
   * @returns Sanitized table name
   * @throws {QueryException} If invalid
   */
  static sanitizeTableName(tableName: string): string {
    return this.sanitizeIdentifier(tableName, 'table name')
  }

  /**
   * Sanitize column name
   *
   * @param columnName - Column name to sanitize
   * @returns Sanitized column name
   * @throws {QueryException} If invalid
   */
  static sanitizeColumnName(columnName: string): string {
    return this.sanitizeIdentifier(columnName, 'column name')
  }

  /**
   * Validate an array of identifiers
   *
   * @param identifiers - Array of identifiers
   * @param context - Context for errors
   * @returns Sanitized identifiers
   */
  static sanitizeIdentifiers(identifiers: string[], context: string = 'identifier'): string[] {
    return identifiers.map((id) => this.sanitizeIdentifier(id, context))
  }

  /**
   * Check if identifier is safe without throwing
   *
   * @param identifier - Identifier to check
   * @returns True if safe
   */
  static isSafe(identifier: string): boolean {
    try {
      this.sanitizeIdentifier(identifier)
      return true
    } catch {
      return false
    }
  }

  /**
   * Sanitize ORDER BY direction
   *
   * @param direction - Direction (asc/desc)
   * @returns Sanitized direction
   * @throws {QueryException} If invalid
   */
  static sanitizeDirection(direction: string): 'ASC' | 'DESC' {
    const normalized = direction.toUpperCase()

    if (normalized !== 'ASC' && normalized !== 'DESC') {
      throw new QueryException(
        `Invalid ORDER BY direction: "${direction}". Must be ASC or DESC.`,
        undefined,
        undefined,
        'INVALID_SORT_DIRECTION',
        { direction }
      )
    }

    return normalized as 'ASC' | 'DESC'
  }

  /**
   * Validate LIMIT value
   *
   * @param limit - Limit value
   * @returns Validated limit
   * @throws {QueryException} If invalid
   */
  static validateLimit(limit: number): number {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new QueryException(
        `Invalid LIMIT value: ${limit}. Must be a non-negative integer.`,
        undefined,
        undefined,
        'INVALID_LIMIT',
        { limit }
      )
    }

    if (limit > 1000000) {
      throw new QueryException(
        `Invalid LIMIT value: ${limit}. Maximum allowed is 1,000,000.`,
        undefined,
        undefined,
        'LIMIT_TOO_LARGE',
        { limit, max: 1000000 }
      )
    }

    return limit
  }

  /**
   * Validate OFFSET value
   *
   * @param offset - Offset value
   * @returns Validated offset
   * @throws {QueryException} If invalid
   */
  static validateOffset(offset: number): number {
    if (!Number.isInteger(offset) || offset < 0) {
      throw new QueryException(
        `Invalid OFFSET value: ${offset}. Must be a non-negative integer.`,
        undefined,
        undefined,
        'INVALID_OFFSET',
        { offset }
      )
    }

    return offset
  }
}
