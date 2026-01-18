/**
 * Connection Manager
 *
 * Manages multiple database connections and provides a clean API for accessing them.
 * Supports connection pooling and automatic driver selection based on configuration.
 */

import type { DatabaseConfig } from '../types'
import type { DriverContract } from '../drivers/contracts/DriverContract'
import { SqliteDriver } from '../drivers/sqlite/SqliteDriver'
import { ConnectionException } from '../exceptions'
import { ConnectionPool } from './ConnectionPool'

/**
 * Connection Manager
 *
 * Central hub for managing all database connections in the application.
 *
 * @example
 * ```typescript
 * // Add a connection
 * ConnectionManager.addConnection('default', {
 *   client: 'sqlite',
 *   connection: { filename: './database.sqlite' }
 * })
 *
 * // Get a connection
 * const db = ConnectionManager.connection('default')
 * await db.connect()
 *
 * // Use the connection
 * const users = await db.select('SELECT * FROM users')
 * ```
 */
export class ConnectionManager {
  /**
   * Storage for all connections
   * @private
   */
  private static connections: Map<string, DriverContract> = new Map()
  private static pools: Map<string, ConnectionPool<DriverContract>> = new Map()

  /**
   * Default connection name
   * @private
   */
  private static defaultConnectionName: string = 'default'

  /**
   * Add a new database connection
   *
   * @param name - Connection name
   * @param config - Database configuration
   * @returns The created driver instance
   *
   * @example
   * ```typescript
   * ConnectionManager.addConnection('postgres-main', {
   *   client: 'postgres',
   *   connection: {
   *     host: 'localhost',
   *     database: 'myapp',
   *     user: 'postgres',
   *     password: 'secret'
   *   }
   * })
   * ```
   */
  static addConnection(name: string, config: DatabaseConfig): DriverContract {
    const driver = this.createDriver(config)
    this.connections.set(name, driver)

    if (config.pool) {
      const pool = new ConnectionPool<DriverContract>(
        config.pool,
        async () => {
          const pooledDriver = this.createDriver(config)
          await pooledDriver.connect()
          return pooledDriver
        },
        async (resource) => {
          if (resource.isConnected()) {
            await resource.disconnect()
          }
        }
      )
      this.pools.set(name, pool)
    }

    // Set as default if it's the first connection or explicitly named 'default'
    if (this.connections.size === 1 || name === 'default') {
      this.defaultConnectionName = name
    }

    return driver
  }

  /**
   * Get a connection by name
   *
   * @param name - Connection name (uses default if not specified)
   * @returns Driver instance
   * @throws {ConnectionException} If connection doesn't exist
   *
   * @example
   * ```typescript
   * const db = ConnectionManager.connection()
   * const pgDb = ConnectionManager.connection('postgres-main')
   * ```
   */
  static connection(name?: string): DriverContract {
    const connectionName = name || this.defaultConnectionName
    const connection = this.connections.get(connectionName)

    if (!connection) {
      const available = Array.from(this.connections.keys())
      throw new ConnectionException(
        `Connection [${connectionName}] not found`,
        'CONNECTION_NOT_FOUND',
        {
          requested: connectionName,
          available: available.length > 0 ? available : 'none'
        }
      )
    }

    return connection
  }

  /**
   * Check if a connection exists
   *
   * @param name - Connection name
   * @returns True if connection exists
   *
   * @example
   * ```typescript
   * if (ConnectionManager.hasConnection('postgres-main')) {
   *   const db = ConnectionManager.connection('postgres-main')
   * }
   * ```
   */
  static hasConnection(name: string): boolean {
    return this.connections.has(name)
  }

  /**
   * Remove a connection
   *
   * Automatically disconnects before removing.
   *
   * @param name - Connection name
   *
   * @example
   * ```typescript
   * await ConnectionManager.removeConnection('postgres-main')
   * ```
   */
  static async removeConnection(name: string): Promise<void> {
    const connection = this.connections.get(name)
    const pool = this.pools.get(name)

    if (connection) {
      if (connection.isConnected()) {
        await connection.disconnect()
      }

      this.connections.delete(name)

      // Update default if we removed it
      if (name === this.defaultConnectionName) {
        const firstKey = this.connections.keys().next().value
        this.defaultConnectionName = firstKey || 'default'
      }
    }

    if (pool) {
      await pool.drain()
      this.pools.delete(name)
    }
  }

  /**
   * Disconnect and remove all connections
   *
   * Useful for cleanup in tests or application shutdown.
   *
   * @example
   * ```typescript
   * // In test cleanup
   * afterAll(async () => {
   *   await ConnectionManager.closeAll()
   * })
   * ```
   */
  static async closeAll(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.values()).map(async (connection) => {
      if (connection.isConnected()) {
        await connection.disconnect()
      }
    })

    await Promise.all(disconnectPromises)
    this.connections.clear()

    const drainPromises = Array.from(this.pools.values()).map(async (pool) => {
      await pool.drain()
    })
    await Promise.all(drainPromises)
    this.pools.clear()
    this.defaultConnectionName = 'default'
  }

  /**
   * Get all connection names
   *
   * @returns Array of connection names
   *
   * @example
   * ```typescript
   * const names = ConnectionManager.getConnectionNames()
   * console.log('Available connections:', names)
   * ```
   */
  static getConnectionNames(): string[] {
    return Array.from(this.connections.keys())
  }

  /**
   * Get the default connection name
   *
   * @returns Default connection name
   */
  static getDefaultConnectionName(): string {
    return this.defaultConnectionName
  }

  /**
   * Get a connection pool by name
   *
   * @param name - Connection name (uses default if not specified)
   * @returns Pool instance
   */
  static pool(name?: string): ConnectionPool<DriverContract> {
    const connectionName = name || this.defaultConnectionName
    const pool = this.pools.get(connectionName)

    if (!pool) {
      throw new ConnectionException(
        `Connection pool [${connectionName}] not found`,
        'POOL_NOT_FOUND'
      )
    }

    return pool
  }

  /**
   * Set the default connection
   *
   * @param name - Connection name to use as default
   * @throws {ConnectionException} If connection doesn't exist
   *
   * @example
   * ```typescript
   * ConnectionManager.setDefaultConnection('postgres-main')
   * ```
   */
  static setDefaultConnection(name: string): void {
    if (!this.hasConnection(name)) {
      throw new ConnectionException(
        `Cannot set default: connection [${name}] does not exist`,
        'CONNECTION_NOT_FOUND',
        { requested: name }
      )
    }

    this.defaultConnectionName = name
  }

  /**
   * Create a driver instance based on configuration
   *
   * @param config - Database configuration
   * @returns Driver instance
   * @throws {ConnectionException} If client type is not supported
   * @private
   */
  private static createDriver(config: DatabaseConfig): DriverContract {
    switch (config.client) {
      case 'sqlite':
        return new SqliteDriver(config)

      case 'postgres':
        // TODO: Implement PostgresDriver
        throw new ConnectionException(
          'PostgreSQL driver not yet implemented',
          'DRIVER_NOT_IMPLEMENTED',
          { client: 'postgres' }
        )

      case 'mysql':
        // TODO: Implement MysqlDriver
        throw new ConnectionException(
          'MySQL driver not yet implemented',
          'DRIVER_NOT_IMPLEMENTED',
          { client: 'mysql' }
        )

      default:
        throw new ConnectionException(
          `Unsupported database client: ${config.client}`,
          'UNSUPPORTED_CLIENT',
          { client: config.client }
        )
    }
  }

  /**
   * Purge all connections without disconnecting
   *
   * ⚠️ WARNING: Only use this for testing purposes.
   * This does NOT disconnect, it just clears the internal map.
   *
   * @internal
   */
  static purge(): void {
    this.connections.clear()
    this.pools.clear()
    this.defaultConnectionName = 'default'
  }
}
