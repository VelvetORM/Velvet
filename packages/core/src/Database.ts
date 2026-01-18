/**
 * Database Facade
 *
 * Public API for database operations. Provides a clean, simple interface
 * for managing connections and executing queries.
 */

import { ConnectionManager } from './connection/ConnectionManager'
import type { DatabaseConfig, DatabaseRow, RawQueryResult, SqlBindings } from './types'
import type { DriverContract } from './drivers/contracts/DriverContract'

/**
 * Database
 *
 * Main entry point for database operations in Velvet ORM.
 * Facade over ConnectionManager for better DX.
 *
 * @example
 * ```typescript
 * import { Database } from '@velvet/core'
 *
 * // Connect to database
 * Database.connect({
 *   client: 'sqlite',
 *   connection: { filename: './database.sqlite' }
 * })
 *
 * // Execute queries
 * const users = await Database.select('SELECT * FROM users')
 * ```
 */
export class Database {
  /**
   * Add and connect to a database
   *
   * @param config - Database configuration
   * @param name - Connection name (defaults to 'default')
   * @returns Promise that resolves when connected
   *
   * @example
   * ```typescript
   * // Default connection
   * await Database.connect({
   *   client: 'sqlite',
   *   connection: { filename: './db.sqlite' }
   * })
   *
   * // Named connection
   * await Database.connect({
   *   client: 'postgres',
   *   connection: {
   *     host: 'localhost',
   *     database: 'myapp',
   *     user: 'postgres',
   *     password: 'secret'
   *   }
   * }, 'postgres-main')
   * ```
   */
  static async connect(config: DatabaseConfig, name: string = 'default'): Promise<void> {
    const driver = ConnectionManager.addConnection(name, config)
    await driver.connect()
  }

  /**
   * Get a connection by name
   *
   * @param name - Connection name (uses default if not specified)
   * @returns Driver instance
   *
   * @example
   * ```typescript
   * const db = Database.connection()
   * const users = await db.select('SELECT * FROM users')
   * ```
   */
  static connection(name?: string): DriverContract {
    return ConnectionManager.connection(name)
  }

  /**
   * Disconnect from a database
   *
   * @param name - Connection name (uses default if not specified)
   *
   * @example
   * ```typescript
   * await Database.disconnect()
   * await Database.disconnect('postgres-main')
   * ```
   */
  static async disconnect(name?: string): Promise<void> {
    const connectionName = name || ConnectionManager.getDefaultConnectionName()
    await ConnectionManager.removeConnection(connectionName)
  }

  /**
   * Disconnect from all databases
   *
   * @example
   * ```typescript
   * await Database.disconnectAll()
   * ```
   */
  static async disconnectAll(): Promise<void> {
    await ConnectionManager.closeAll()
  }

  /**
   * Execute a SELECT query on the default connection
   *
   * @param sql - SELECT query
   * @param bindings - Query parameters
   * @param connectionName - Optional connection name
   * @returns Array of rows
   *
   * @example
   * ```typescript
   * const users = await Database.select('SELECT * FROM users WHERE active = ?', [true])
   * ```
   */
  static async select<TRow extends DatabaseRow = DatabaseRow>(
    sql: string,
    bindings?: SqlBindings,
    connectionName?: string
  ): Promise<TRow[]> {
    const connection = ConnectionManager.connection(connectionName)
    return connection.select(sql, bindings)
  }

  /**
   * Execute an INSERT query on the default connection
   *
   * @param sql - INSERT query
   * @param bindings - Query parameters
   * @param connectionName - Optional connection name
   * @returns Insert ID
   *
   * @example
   * ```typescript
   * const userId = await Database.insert(
   *   'INSERT INTO users (name, email) VALUES (?, ?)',
   *   ['John Doe', 'john@example.com']
   * )
   * ```
   */
  static async insert(
    sql: string,
    bindings?: SqlBindings,
    connectionName?: string
  ): Promise<number | string | bigint> {
    const connection = ConnectionManager.connection(connectionName)
    return connection.insert(sql, bindings)
  }

  /**
   * Execute an UPDATE query on the default connection
   *
   * @param sql - UPDATE query
   * @param bindings - Query parameters
   * @param connectionName - Optional connection name
   * @returns Number of affected rows
   *
   * @example
   * ```typescript
   * const updated = await Database.update(
   *   'UPDATE users SET name = ? WHERE id = ?',
   *   ['Jane Doe', 1]
   * )
   * ```
   */
  static async update(
    sql: string,
    bindings?: SqlBindings,
    connectionName?: string
  ): Promise<number> {
    const connection = ConnectionManager.connection(connectionName)
    return connection.update(sql, bindings)
  }

  /**
   * Execute a DELETE query on the default connection
   *
   * @param sql - DELETE query
   * @param bindings - Query parameters
   * @param connectionName - Optional connection name
   * @returns Number of deleted rows
   *
   * @example
   * ```typescript
   * const deleted = await Database.delete('DELETE FROM users WHERE id = ?', [1])
   * ```
   */
  static async delete(
    sql: string,
    bindings?: SqlBindings,
    connectionName?: string
  ): Promise<number> {
    const connection = ConnectionManager.connection(connectionName)
    return connection.delete(sql, bindings)
  }

  /**
   * Execute a raw query on the default connection
   *
   * @param sql - SQL query
   * @param bindings - Query parameters
   * @param connectionName - Optional connection name
   * @returns Raw query result
   *
   * @example
   * ```typescript
   * const result = await Database.raw('PRAGMA table_info(users)')
   * console.log(result.rows)
   * ```
   */
  static async raw(
    sql: string,
    bindings?: SqlBindings,
    connectionName?: string
  ): Promise<RawQueryResult> {
    const connection = ConnectionManager.connection(connectionName)
    return connection.query(sql, bindings)
  }

  /**
   * Begin a transaction on the default connection
   *
   * @param connectionName - Optional connection name
   *
   * @example
   * ```typescript
   * await Database.beginTransaction()
   * try {
   *   await Database.insert('INSERT INTO users ...')
   *   await Database.insert('INSERT INTO profiles ...')
   *   await Database.commit()
   * } catch (error) {
   *   await Database.rollback()
   *   throw error
   * }
   * ```
   */
  static async beginTransaction(connectionName?: string): Promise<void> {
    const connection = ConnectionManager.connection(connectionName)
    await connection.beginTransaction()
  }

  /**
   * Commit the current transaction
   *
   * @param connectionName - Optional connection name
   */
  static async commit(connectionName?: string): Promise<void> {
    const connection = ConnectionManager.connection(connectionName)
    await connection.commit()
  }

  /**
   * Rollback the current transaction
   *
   * @param connectionName - Optional connection name
   */
  static async rollback(connectionName?: string): Promise<void> {
    const connection = ConnectionManager.connection(connectionName)
    await connection.rollback()
  }

  /**
   * Execute a callback within a transaction
   *
   * Automatically commits on success or rolls back on error.
   *
   * @param callback - Function to execute within transaction
   * @param connectionName - Optional connection name
   * @returns Result of the callback
   *
   * @example
   * ```typescript
   * const result = await Database.transaction(async () => {
   *   const userId = await Database.insert('INSERT INTO users ...')
   *   await Database.insert('INSERT INTO profiles ...')
   *   return userId
   * })
   * ```
   */
  static async transaction<T>(
    callback: () => Promise<T>,
    connectionName?: string
  ): Promise<T> {
    await this.beginTransaction(connectionName)

    try {
      const result = await callback()
      await this.commit(connectionName)
      return result
    } catch (error) {
      await this.rollback(connectionName)
      throw error
    }
  }

  /**
   * Check if a connection exists
   *
   * @param name - Connection name
   * @returns True if connection exists
   */
  static hasConnection(name: string): boolean {
    return ConnectionManager.hasConnection(name)
  }

  /**
   * Get all connection names
   *
   * @returns Array of connection names
   */
  static getConnectionNames(): string[] {
    return ConnectionManager.getConnectionNames()
  }

  /**
   * Set the default connection
   *
   * @param name - Connection name
   */
  static setDefaultConnection(name: string): void {
    ConnectionManager.setDefaultConnection(name)
  }

  /**
   * Get the default connection name
   *
   * @returns Default connection name
   */
  static getDefaultConnectionName(): string {
    return ConnectionManager.getDefaultConnectionName()
  }

  /**
   * Get a connection pool by name
   *
   * @param name - Connection name (uses default if not specified)
   * @returns Pool instance
   */
  static pool(name?: string) {
    return ConnectionManager.pool(name)
  }
}
