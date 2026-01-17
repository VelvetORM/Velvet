import { VelvetException } from './VelvetException'

/**
 * Connection Exception
 *
 * Thrown when database connection operations fail.
 *
 * @example
 * ```typescript
 * throw new ConnectionException(
 *   'Failed to connect to PostgreSQL',
 *   'ECONNREFUSED',
 *   { host: 'localhost', port: 5432 }
 * )
 * ```
 */
export class ConnectionException extends VelvetException {
  constructor(message: string, code?: string, context?: Record<string, any>) {
    super(message, code || 'CONNECTION_ERROR', context)
  }
}
