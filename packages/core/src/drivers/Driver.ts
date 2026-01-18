/**
 * Base Database Driver
 *
 * Abstract base class providing common functionality for all database drivers.
 */

import type {
  DatabaseConfig,
  IsolationLevel,
  RawQueryResult,
  DatabaseRow,
  SqlBindings
} from '../types'
import type { DriverContract } from './contracts/DriverContract'
import { ConnectionException } from '../exceptions'

/**
 * Abstract Driver Base Class
 *
 * Implements common logic shared across all database drivers.
 * Specific drivers (Postgres, MySQL, SQLite) extend this class.
 */
export abstract class Driver implements DriverContract {
  /**
   * Database configuration
   */
  protected config: DatabaseConfig

  /**
   * Connection state
   */
  protected connected: boolean = false

  /**
   * Transaction state
   */
  protected transactionActive: boolean = false

  /**
   * Transaction nesting level (for savepoints)
   */
  protected transactionLevel: number = 0

  /**
   * Create a new driver instance
   *
   * @param config - Database configuration
   */
  constructor(config: DatabaseConfig) {
    this.config = config
  }

  /**
   * Connect to the database
   * Must be implemented by specific drivers
   */
  abstract connect(): Promise<void>

  /**
   * Disconnect from the database
   * Must be implemented by specific drivers
   */
  abstract disconnect(): Promise<void>

  /**
   * Execute a raw SQL query
   * Must be implemented by specific drivers
   */
  abstract query<TRow extends DatabaseRow = DatabaseRow>(
    sql: string,
    bindings?: SqlBindings
  ): Promise<RawQueryResult<TRow>>

  /**
   * Execute a SELECT query
   */
  async select<TRow extends DatabaseRow = DatabaseRow>(
    sql: string,
    bindings?: SqlBindings
  ): Promise<TRow[]> {
    this.ensureConnected()
    const result = await this.query<TRow>(sql, bindings)
    return result.rows
  }

  /**
   * Execute an INSERT query
   */
  async insert(sql: string, bindings?: SqlBindings): Promise<number | string | bigint> {
    this.ensureConnected()
    const result = await this.query(sql, bindings)
    return result.insertId || 0
  }

  /**
   * Execute an UPDATE query
   */
  async update(sql: string, bindings?: SqlBindings): Promise<number> {
    this.ensureConnected()
    const result = await this.query(sql, bindings)
    return result.rowCount || 0
  }

  /**
   * Execute a DELETE query
   */
  async delete(sql: string, bindings?: SqlBindings): Promise<number> {
    this.ensureConnected()
    const result = await this.query(sql, bindings)
    return result.rowCount || 0
  }

  /**
   * Begin a transaction
   * Must be implemented by specific drivers
   */
  abstract beginTransaction(isolationLevel?: IsolationLevel): Promise<void>

  /**
   * Commit the current transaction
   * Must be implemented by specific drivers
   */
  abstract commit(): Promise<void>

  /**
   * Rollback the current transaction
   * Must be implemented by specific drivers
   */
  abstract rollback(): Promise<void>

  /**
   * Check if currently in a transaction
   */
  inTransaction(): boolean {
    return this.transactionActive
  }

  /**
   * Check if driver is connected
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * Get the database configuration
   */
  getConfig(): DatabaseConfig {
    return this.config
  }

  /**
   * Get the driver name
   * Must be implemented by specific drivers
   */
  abstract getDriverName(): string

  /**
   * Ensure driver is connected before executing queries
   *
   * @throws {ConnectionException} If not connected
   */
  protected ensureConnected(): void {
    if (!this.connected) {
      throw new ConnectionException(
        `Driver [${this.getDriverName()}] is not connected. Call connect() first.`,
        'NOT_CONNECTED'
      )
    }
  }

  /**
   * Log query for debugging (if debug mode enabled)
   *
   * @param sql - SQL query
   * @param bindings - Query bindings
   */
  protected log(sql: string, bindings?: SqlBindings): void {
    if (this.config.debug) {
      console.log('[Velvet Query]', sql)
      if (bindings && bindings.length > 0) {
        console.log('[Bindings]', bindings)
      }
    }
  }
}
