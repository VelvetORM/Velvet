/**
 * Base Velvet Exception
 *
 * All Velvet exceptions extend from this base class.
 * Provides better error tracking and debugging capabilities.
 */
export class VelvetException extends Error {
  /**
   * Error code for programmatic error handling
   */
  public code?: string

  /**
   * Additional context data
   */
  public context?: Record<string, any>

  /**
   * Create a new Velvet exception
   *
   * @param message - Error message
   * @param code - Optional error code
   * @param context - Optional context data
   *
   * @example
   * ```typescript
   * throw new VelvetException(
   *   'Database connection failed',
   *   'DB_CONNECTION_FAILED',
   *   { host: 'localhost', port: 5432 }
   * )
   * ```
   */
  constructor(message: string, code?: string, context?: Record<string, any>) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.context = context

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (typeof (Error as any).captureStackTrace === 'function') {
      ;(Error as any).captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Convert exception to JSON for logging
   */
  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack
    }
  }

  /**
   * Get a formatted error message with context
   */
  getFormattedMessage(): string {
    let message = `[${this.name}]`

    if (this.code) {
      message += ` (${this.code})`
    }

    message += `: ${this.message}`

    if (this.context && Object.keys(this.context).length > 0) {
      message += `\nContext: ${JSON.stringify(this.context, null, 2)}`
    }

    return message
  }
}
