import { VelvetException } from './VelvetException'
import type { SqlBindings } from '../types'

/**
 * Query Exception
 *
 * Thrown when SQL query execution fails.
 *
 * @example
 * ```typescript
 * throw new QueryException(
 *   'Column "name" does not exist',
 *   'UNDEFINED_COLUMN',
 *   { sql: 'SELECT name FROM users', table: 'users' }
 * )
 * ```
 */
export class QueryException extends VelvetException {
  /**
   * The SQL query that failed
   */
  public sql?: string

  /**
   * Query bindings/parameters
   */
  public bindings?: SqlBindings

  constructor(
    message: string,
    sql?: string,
    bindings?: SqlBindings,
    code?: string,
    context?: Record<string, unknown>
  ) {
    super(message, code || 'QUERY_ERROR', context)
    this.sql = sql
    this.bindings = bindings
  }

  /**
   * Get formatted message with SQL query
   */
  getFormattedMessage(): string {
    let message = super.getFormattedMessage()

    if (this.sql) {
      message += `\nSQL: ${this.sql}`
    }

    if (this.bindings && this.bindings.length > 0) {
      message += `\nBindings: ${JSON.stringify(this.bindings)}`
    }

    return message
  }
}
