/**
 * TestHelper
 *
 * Convenience utilities for testing Velvet ORM.
 */

import { MockConnectionResolver } from './MockConnectionResolver'
import { MockDriver } from './MockDriver'
import { setConnectionResolver, resetConnectionResolver } from './ConnectionResolver'

/**
 * TestHelper
 *
 * Provides convenience methods for setting up and tearing down
 * test environments for Velvet ORM.
 *
 * @example
 * ```typescript
 * import { TestHelper } from '@velvet/core/testing'
 *
 * describe('User Model', () => {
 *   const helper = new TestHelper()
 *
 *   beforeEach(() => helper.setup())
 *   afterEach(() => helper.teardown())
 *
 *   it('creates a user', async () => {
 *     helper.mockInsert(/INSERT INTO users/, 1)
 *
 *     const user = await User.create({ name: 'John' })
 *
 *     expect(user.exists).toBe(true)
 *     expect(helper.wasQueried(/INSERT INTO users/)).toBe(true)
 *   })
 * })
 * ```
 */
export class TestHelper {
  private resolver: MockConnectionResolver | null = null

  /**
   * Set up the test environment
   * Replaces the connection resolver with a mock
   */
  setup(): MockConnectionResolver {
    this.resolver = new MockConnectionResolver()
    setConnectionResolver(this.resolver)
    return this.resolver
  }

  /**
   * Tear down the test environment
   * Restores the original connection resolver
   */
  teardown(): void {
    resetConnectionResolver()
    this.resolver = null
  }

  /**
   * Get the mock driver for the default connection
   */
  getDriver(connectionName?: string): MockDriver {
    if (!this.resolver) {
      throw new Error('TestHelper not set up. Call setup() first.')
    }
    return this.resolver.getDriver(connectionName)
  }

  /**
   * Get the mock resolver
   */
  getResolver(): MockConnectionResolver {
    if (!this.resolver) {
      throw new Error('TestHelper not set up. Call setup() first.')
    }
    return this.resolver
  }

  /**
   * Mock a SELECT query response
   */
  mockSelect(pattern: string | RegExp, response: Record<string, unknown>[]): this {
    this.getDriver().mockSelect(pattern, response)
    return this
  }

  /**
   * Mock an INSERT query response
   */
  mockInsert(pattern: string | RegExp, insertId: number | string | bigint): this {
    this.getDriver().mockInsert(pattern, insertId)
    return this
  }

  /**
   * Mock an UPDATE query response
   */
  mockUpdate(pattern: string | RegExp, affectedRows: number): this {
    this.getDriver().mockUpdate(pattern, affectedRows)
    return this
  }

  /**
   * Mock a DELETE query response
   */
  mockDelete(pattern: string | RegExp, affectedRows: number): this {
    this.getDriver().mockDelete(pattern, affectedRows)
    return this
  }

  /**
   * Check if a query matching the pattern was executed
   */
  wasQueried(pattern: string | RegExp): boolean {
    return this.getDriver().wasQueried(pattern)
  }

  /**
   * Get all recorded queries
   */
  getQueries() {
    return this.getDriver().getQueries()
  }

  /**
   * Get the last executed query
   */
  getLastQuery() {
    return this.getDriver().getLastQuery()
  }

  /**
   * Count executed queries
   */
  countQueries(pattern?: string | RegExp): number {
    return this.getDriver().countQueries(pattern)
  }

  /**
   * Clear all recorded queries
   */
  clearQueries(): this {
    this.getDriver().clearQueries()
    return this
  }

  /**
   * Clear all mock responses
   */
  clearMocks(): this {
    this.getDriver().clearMocks()
    return this
  }

  /**
   * Reset driver (clear queries and mocks)
   */
  reset(): this {
    this.getDriver().reset()
    return this
  }

  /**
   * Assert that a query was executed
   * Throws if the query was not found
   */
  assertQueried(pattern: string | RegExp, message?: string): void {
    if (!this.wasQueried(pattern)) {
      const patternStr = pattern instanceof RegExp ? pattern.toString() : `"${pattern}"`
      throw new Error(message ?? `Expected query matching ${patternStr} to be executed`)
    }
  }

  /**
   * Assert that a query was NOT executed
   * Throws if the query was found
   */
  assertNotQueried(pattern: string | RegExp, message?: string): void {
    if (this.wasQueried(pattern)) {
      const patternStr = pattern instanceof RegExp ? pattern.toString() : `"${pattern}"`
      throw new Error(message ?? `Expected query matching ${patternStr} NOT to be executed`)
    }
  }

  /**
   * Assert the number of queries executed
   */
  assertQueryCount(expected: number, pattern?: string | RegExp, message?: string): void {
    const actual = this.countQueries(pattern)
    if (actual !== expected) {
      const patternStr = pattern
        ? ` matching ${pattern instanceof RegExp ? pattern.toString() : `"${pattern}"`}`
        : ''
      throw new Error(
        message ?? `Expected ${expected} queries${patternStr}, but got ${actual}`
      )
    }
  }
}
