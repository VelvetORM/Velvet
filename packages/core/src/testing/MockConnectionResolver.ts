/**
 * MockConnectionResolver
 *
 * Connection resolver that returns mock drivers for testing.
 */

import type { ConnectionResolverContract } from './ConnectionResolver'
import { MockDriver } from './MockDriver'

/**
 * MockConnectionResolver
 *
 * A connection resolver that provides MockDriver instances.
 * Perfect for unit testing models without a real database.
 *
 * @example
 * ```typescript
 * import {
 *   MockConnectionResolver,
 *   setConnectionResolver,
 *   resetConnectionResolver
 * } from '@velvet/core/testing'
 *
 * describe('User Model', () => {
 *   let resolver: MockConnectionResolver
 *
 *   beforeEach(() => {
 *     resolver = new MockConnectionResolver()
 *     setConnectionResolver(resolver)
 *   })
 *
 *   afterEach(() => {
 *     resetConnectionResolver()
 *   })
 *
 *   it('finds user by id', async () => {
 *     // Setup mock response
 *     resolver.getDriver().mockSelect('SELECT', [
 *       { id: 1, name: 'John', email: 'john@example.com' }
 *     ])
 *
 *     // Execute
 *     const user = await User.find(1)
 *
 *     // Assert
 *     expect(user).not.toBeNull()
 *     expect(user?.name).toBe('John')
 *     expect(resolver.getDriver().wasQueried('SELECT')).toBe(true)
 *   })
 * })
 * ```
 */
export class MockConnectionResolver implements ConnectionResolverContract {
  private drivers: Map<string, MockDriver> = new Map()
  private defaultConnectionName: string = 'default'

  /**
   * Create a new mock connection resolver
   *
   * @param defaultDriver - Optional default MockDriver instance
   */
  constructor(defaultDriver?: MockDriver) {
    if (defaultDriver) {
      this.drivers.set('default', defaultDriver)
    }
  }

  /**
   * Get or create a mock driver for the given connection name
   */
  connection(name?: string): MockDriver {
    const connectionName = name ?? this.defaultConnectionName

    if (!this.drivers.has(connectionName)) {
      this.drivers.set(connectionName, new MockDriver())
    }

    return this.drivers.get(connectionName)!
  }

  /**
   * Get the default connection name
   */
  getDefaultConnectionName(): string {
    return this.defaultConnectionName
  }

  /**
   * Set the default connection name
   */
  setDefaultConnectionName(name: string): void {
    this.defaultConnectionName = name
  }

  /**
   * Check if a connection exists
   */
  hasConnection(name: string): boolean {
    return this.drivers.has(name)
  }

  /**
   * Get the default driver (shortcut)
   */
  getDriver(name?: string): MockDriver {
    return this.connection(name)
  }

  /**
   * Set a specific driver for a connection
   */
  setDriver(name: string, driver: MockDriver): void {
    this.drivers.set(name, driver)
  }

  /**
   * Reset all drivers
   */
  reset(): void {
    for (const driver of this.drivers.values()) {
      driver.reset()
    }
  }

  /**
   * Clear all drivers
   */
  clear(): void {
    this.drivers.clear()
  }

  /**
   * Get all recorded queries across all connections
   */
  getAllQueries(): Array<{ connection: string; query: ReturnType<MockDriver['getLastQuery']> }> {
    const result: Array<{ connection: string; query: ReturnType<MockDriver['getLastQuery']> }> = []

    for (const [name, driver] of this.drivers) {
      for (const query of driver.getQueries()) {
        result.push({ connection: name, query })
      }
    }

    return result.sort((a, b) =>
      (a.query?.timestamp.getTime() ?? 0) - (b.query?.timestamp.getTime() ?? 0)
    )
  }
}
