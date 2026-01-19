/**
 * ConnectionResolver
 *
 * Injectable connection resolver for testing.
 * Allows mocking database connections in tests.
 */

import type { DriverContract } from '../drivers/contracts/DriverContract'
import { ConnectionManager } from '../connection/ConnectionManager'

/**
 * Connection resolver interface
 * Implement this to provide custom connection resolution (e.g., for testing)
 */
export interface ConnectionResolverContract {
  /**
   * Resolve a connection by name
   */
  connection(name?: string): DriverContract

  /**
   * Get the default connection name
   */
  getDefaultConnectionName(): string

  /**
   * Check if a connection exists
   */
  hasConnection(name: string): boolean
}

/**
 * Default connection resolver using ConnectionManager
 */
export class DefaultConnectionResolver implements ConnectionResolverContract {
  connection(name?: string): DriverContract {
    return ConnectionManager.connection(name)
  }

  getDefaultConnectionName(): string {
    return ConnectionManager.getDefaultConnectionName()
  }

  hasConnection(name: string): boolean {
    return ConnectionManager.hasConnection(name)
  }
}

/**
 * Global connection resolver instance
 * Can be swapped in tests for a mock resolver
 */
let currentResolver: ConnectionResolverContract = new DefaultConnectionResolver()

/**
 * Get the current connection resolver
 */
export function getConnectionResolver(): ConnectionResolverContract {
  return currentResolver
}

/**
 * Set the connection resolver (for testing)
 *
 * @example
 * ```typescript
 * // In tests
 * import { setConnectionResolver, MockConnectionResolver } from '@velvet/core/testing'
 *
 * beforeEach(() => {
 *   setConnectionResolver(new MockConnectionResolver())
 * })
 *
 * afterEach(() => {
 *   resetConnectionResolver()
 * })
 * ```
 */
export function setConnectionResolver(resolver: ConnectionResolverContract): void {
  currentResolver = resolver
}

/**
 * Reset to the default connection resolver
 */
export function resetConnectionResolver(): void {
  currentResolver = new DefaultConnectionResolver()
}

/**
 * Resolve a connection using the current resolver
 */
export function resolveConnection(name?: string): DriverContract {
  return currentResolver.connection(name)
}
