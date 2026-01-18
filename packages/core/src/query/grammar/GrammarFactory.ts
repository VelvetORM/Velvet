/**
 * Grammar Factory
 *
 * Creates the correct SQL grammar based on the active connection driver.
 */

import { ConnectionManager } from '../../connection/ConnectionManager'
import type { Grammar } from './Grammar'
import { SqliteGrammar } from './SqliteGrammar'
import { ConnectionException } from '../../exceptions'

export class GrammarFactory {
  /**
   * Create a grammar instance for a given connection
   */
  static create(connectionName?: string): Grammar {
    const resolvedName = connectionName || ConnectionManager.getDefaultConnectionName()

    if (!ConnectionManager.hasConnection(resolvedName)) {
      return new SqliteGrammar()
    }

    const driverName = ConnectionManager.connection(resolvedName).getDriverName()

    switch (driverName) {
      case 'sqlite':
        return new SqliteGrammar()
      case 'postgres':
        throw new ConnectionException(
          'Postgres grammar not yet implemented',
          'GRAMMAR_NOT_IMPLEMENTED',
          { client: 'postgres' }
        )
      case 'mysql':
        throw new ConnectionException(
          'MySQL grammar not yet implemented',
          'GRAMMAR_NOT_IMPLEMENTED',
          { client: 'mysql' }
        )
      default:
        throw new ConnectionException(
          `Unsupported database client: ${driverName}`,
          'UNSUPPORTED_CLIENT',
          { client: driverName }
        )
    }
  }
}
