/**
 * MockDriver
 *
 * Mock database driver for testing.
 * Records all queries and allows setting mock responses.
 */

import type { DriverContract } from '../drivers/contracts/DriverContract'
import type { DatabaseConfig, DatabaseRow, RawQueryResult, SqlBindings } from '../types'

/**
 * Recorded query for inspection in tests
 */
export interface RecordedQuery {
  type: 'select' | 'insert' | 'update' | 'delete' | 'raw'
  sql: string
  bindings?: SqlBindings
  timestamp: Date
}

/**
 * Mock response configuration
 */
export interface MockResponse {
  /** Pattern to match SQL (string or regex) */
  pattern: string | RegExp
  /** Response to return */
  response: unknown
  /** Whether this is a one-time response */
  once?: boolean
}

/**
 * MockDriver
 *
 * A fake database driver for testing that:
 * - Records all executed queries
 * - Allows setting mock responses
 * - Provides inspection methods for assertions
 *
 * @example
 * ```typescript
 * const driver = new MockDriver()
 *
 * // Set up mock response
 * driver.mockSelect('SELECT * FROM users', [
 *   { id: 1, name: 'John' },
 *   { id: 2, name: 'Jane' }
 * ])
 *
 * // Execute query (via Model or Builder)
 * const users = await User.all()
 *
 * // Assert queries
 * expect(driver.getQueries()).toHaveLength(1)
 * expect(driver.wasQueried('SELECT * FROM users')).toBe(true)
 * ```
 */
export class MockDriver implements DriverContract {
  private queries: RecordedQuery[] = []
  private mockResponses: MockResponse[] = []
  private connected: boolean = false
  private transactionActive: boolean = false
  private config: DatabaseConfig = { client: 'sqlite', connection: { filename: ':memory:' } }

  /**
   * Mock a SELECT query response
   */
  mockSelect(pattern: string | RegExp, response: DatabaseRow[]): this {
    this.mockResponses.push({ pattern, response })
    return this
  }

  /**
   * Mock an INSERT query response (returns insert ID)
   */
  mockInsert(pattern: string | RegExp, insertId: number | string | bigint): this {
    this.mockResponses.push({ pattern, response: insertId })
    return this
  }

  /**
   * Mock an UPDATE query response (returns affected rows)
   */
  mockUpdate(pattern: string | RegExp, affectedRows: number): this {
    this.mockResponses.push({ pattern, response: affectedRows })
    return this
  }

  /**
   * Mock a DELETE query response (returns affected rows)
   */
  mockDelete(pattern: string | RegExp, affectedRows: number): this {
    this.mockResponses.push({ pattern, response: affectedRows })
    return this
  }

  /**
   * Mock a raw query response
   */
  mockRaw(pattern: string | RegExp, response: RawQueryResult): this {
    this.mockResponses.push({ pattern, response })
    return this
  }

  /**
   * Mock a response once (removed after first match)
   */
  mockOnce(pattern: string | RegExp, response: unknown): this {
    this.mockResponses.push({ pattern, response, once: true })
    return this
  }

  /**
   * Clear all mock responses
   */
  clearMocks(): this {
    this.mockResponses = []
    return this
  }

  /**
   * Get all recorded queries
   */
  getQueries(): RecordedQuery[] {
    return [...this.queries]
  }

  /**
   * Get the last recorded query
   */
  getLastQuery(): RecordedQuery | undefined {
    return this.queries[this.queries.length - 1]
  }

  /**
   * Check if a query matching the pattern was executed
   */
  wasQueried(pattern: string | RegExp): boolean {
    return this.queries.some((q) => this.matchesPattern(q.sql, pattern))
  }

  /**
   * Get queries matching a pattern
   */
  getQueriesMatching(pattern: string | RegExp): RecordedQuery[] {
    return this.queries.filter((q) => this.matchesPattern(q.sql, pattern))
  }

  /**
   * Count queries matching a pattern
   */
  countQueries(pattern?: string | RegExp): number {
    if (!pattern) return this.queries.length
    return this.getQueriesMatching(pattern).length
  }

  /**
   * Clear all recorded queries
   */
  clearQueries(): this {
    this.queries = []
    return this
  }

  /**
   * Reset driver (clear queries and mocks)
   */
  reset(): this {
    this.queries = []
    this.mockResponses = []
    this.transactionActive = false
    return this
  }

  // ==========================================
  // DriverContract Implementation
  // ==========================================

  async connect(): Promise<void> {
    this.connected = true
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  isConnected(): boolean {
    return this.connected
  }

  async select<TRow extends DatabaseRow = DatabaseRow>(
    sql: string,
    bindings?: SqlBindings
  ): Promise<TRow[]> {
    this.recordQuery('select', sql, bindings)
    const response = this.findMockResponse(sql)
    return (response as TRow[]) ?? []
  }

  async insert(sql: string, bindings?: SqlBindings): Promise<number | string | bigint> {
    this.recordQuery('insert', sql, bindings)
    const response = this.findMockResponse(sql)
    return (response as number | string | bigint) ?? 1
  }

  async update(sql: string, bindings?: SqlBindings): Promise<number> {
    this.recordQuery('update', sql, bindings)
    const response = this.findMockResponse(sql)
    return (response as number) ?? 1
  }

  async delete(sql: string, bindings?: SqlBindings): Promise<number> {
    this.recordQuery('delete', sql, bindings)
    const response = this.findMockResponse(sql)
    return (response as number) ?? 1
  }

  async query<TRow extends DatabaseRow = DatabaseRow>(
    sql: string,
    bindings?: SqlBindings
  ): Promise<RawQueryResult<TRow>> {
    this.recordQuery('raw', sql, bindings)
    const response = this.findMockResponse(sql)
    return (response as RawQueryResult<TRow>) ?? { rows: [], changes: 0 }
  }

  async beginTransaction(): Promise<void> {
    this.transactionActive = true
    this.recordQuery('raw', 'BEGIN TRANSACTION')
  }

  async commit(): Promise<void> {
    this.transactionActive = false
    this.recordQuery('raw', 'COMMIT')
  }

  async rollback(): Promise<void> {
    this.transactionActive = false
    this.recordQuery('raw', 'ROLLBACK')
  }

  /**
   * Check if currently in a transaction
   */
  inTransaction(): boolean {
    return this.transactionActive
  }

  /**
   * Get the database configuration
   */
  getConfig(): DatabaseConfig {
    return this.config
  }

  /**
   * Set the mock configuration
   */
  setConfig(config: DatabaseConfig): this {
    this.config = config
    return this
  }

  /**
   * Get the driver name
   */
  getDriverName(): string {
    return 'mock'
  }

  // ==========================================
  // Private Methods
  // ==========================================

  private recordQuery(
    type: RecordedQuery['type'],
    sql: string,
    bindings?: SqlBindings
  ): void {
    this.queries.push({
      type,
      sql,
      bindings,
      timestamp: new Date()
    })
  }

  private findMockResponse(sql: string): unknown {
    const index = this.mockResponses.findIndex((m) => this.matchesPattern(sql, m.pattern))

    if (index === -1) return undefined

    const mock = this.mockResponses[index]
    if (mock.once) {
      this.mockResponses.splice(index, 1)
    }
    return mock.response
  }

  private matchesPattern(sql: string, pattern: string | RegExp): boolean {
    if (pattern instanceof RegExp) {
      return pattern.test(sql)
    }
    return sql.includes(pattern)
  }
}
