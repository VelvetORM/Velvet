/**
 * Database Driver Contract
 *
 * Interface that all database drivers must implement.
 * This ensures consistent behavior across different database systems.
 */

import type { RawQueryResult, DatabaseConfig, IsolationLevel } from '../../types'

/**
 * Driver Contract Interface
 *
 * All database drivers (Postgres, MySQL, SQLite) must implement this interface.
 */
export interface DriverContract {
  /**
   * Connect to the database
   *
   * @throws {ConnectionException} If connection fails
   *
   * @example
   * ```typescript
   * await driver.connect()
   * ```
   */
  connect(): Promise<void>

  /**
   * Disconnect from the database
   *
   * @example
   * ```typescript
   * await driver.disconnect()
   * ```
   */
  disconnect(): Promise<void>

  /**
   * Check if driver is connected
   *
   * @returns True if connected, false otherwise
   */
  isConnected(): boolean

  /**
   * Execute a raw SQL query
   *
   * @param sql - SQL query string
   * @param bindings - Parameter bindings for prepared statements
   * @returns Query result with rows and metadata
   * @throws {QueryException} If query execution fails
   *
   * @example
   * ```typescript
   * const result = await driver.query('SELECT * FROM users WHERE id = ?', [1])
   * console.log(result.rows)
   * ```
   */
  query(sql: string, bindings?: any[]): Promise<RawQueryResult>

  /**
   * Execute a SELECT query
   *
   * @param sql - SELECT query string
   * @param bindings - Parameter bindings
   * @returns Array of result rows
   *
   * @example
   * ```typescript
   * const users = await driver.select('SELECT * FROM users WHERE active = ?', [true])
   * ```
   */
  select(sql: string, bindings?: any[]): Promise<any[]>

  /**
   * Execute an INSERT query
   *
   * @param sql - INSERT query string
   * @param bindings - Parameter bindings
   * @returns ID of inserted row
   *
   * @example
   * ```typescript
   * const userId = await driver.insert(
   *   'INSERT INTO users (name, email) VALUES (?, ?)',
   *   ['John', 'john@example.com']
   * )
   * ```
   */
  insert(sql: string, bindings?: any[]): Promise<number | string>

  /**
   * Execute an UPDATE query
   *
   * @param sql - UPDATE query string
   * @param bindings - Parameter bindings
   * @returns Number of affected rows
   *
   * @example
   * ```typescript
   * const affected = await driver.update(
   *   'UPDATE users SET name = ? WHERE id = ?',
   *   ['Jane', 1]
   * )
   * ```
   */
  update(sql: string, bindings?: any[]): Promise<number>

  /**
   * Execute a DELETE query
   *
   * @param sql - DELETE query string
   * @param bindings - Parameter bindings
   * @returns Number of affected rows
   *
   * @example
   * ```typescript
   * const deleted = await driver.delete('DELETE FROM users WHERE id = ?', [1])
   * ```
   */
  delete(sql: string, bindings?: any[]): Promise<number>

  /**
   * Begin a database transaction
   *
   * @param isolationLevel - Optional transaction isolation level
   *
   * @example
   * ```typescript
   * await driver.beginTransaction()
   * try {
   *   await driver.insert('INSERT INTO users ...')
   *   await driver.insert('INSERT INTO profiles ...')
   *   await driver.commit()
   * } catch (error) {
   *   await driver.rollback()
   * }
   * ```
   */
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>

  /**
   * Commit the current transaction
   */
  commit(): Promise<void>

  /**
   * Rollback the current transaction
   */
  rollback(): Promise<void>

  /**
   * Check if currently in a transaction
   *
   * @returns True if in transaction, false otherwise
   */
  inTransaction(): boolean

  /**
   * Get the database configuration
   *
   * @returns Database configuration object
   */
  getConfig(): DatabaseConfig

  /**
   * Get the driver name (postgres, mysql, sqlite)
   *
   * @returns Driver name
   */
  getDriverName(): string
}
