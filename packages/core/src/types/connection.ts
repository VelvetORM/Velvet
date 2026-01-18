/**
 * Connection Type Definitions
 *
 * Type definitions for database connections, configuration, and pooling.
 */

/**
 * Supported database client types
 */
export type DatabaseClient = 'postgres' | 'mysql' | 'sqlite'

/**
 * PostgreSQL connection configuration
 */
export interface PostgresConnectionConfig {
  host: string
  port?: number
  user: string
  password: string
  database: string
  ssl?: boolean | { rejectUnauthorized?: boolean }
  connectionTimeoutMillis?: number
  idleTimeoutMillis?: number
  max?: number
  min?: number
}

/**
 * MySQL connection configuration
 */
export interface MysqlConnectionConfig {
  host: string
  port?: number
  user: string
  password: string
  database: string
  charset?: string
  timezone?: string
  ssl?: boolean | object
  connectionLimit?: number
  waitForConnections?: boolean
}

/**
 * SQLite connection configuration
 */
export interface SqliteConnectionConfig {
  filename: string
  /**
   * If true, opens in memory mode (:memory:)
   */
  memory?: boolean
  /**
   * Open database in readonly mode
   */
  readonly?: boolean
  /**
   * File mode flags
   */
  fileMustExist?: boolean
}

/**
 * Generic database configuration
 */
export interface PoolConfig {
  min?: number
  max?: number
  acquireTimeoutMillis?: number
  idleTimeoutMillis?: number
}

export interface DatabaseConfig {
  /**
   * Database client type
   */
  client: DatabaseClient

  /**
   * Connection configuration (specific to client type)
   */
  connection: PostgresConnectionConfig | MysqlConnectionConfig | SqliteConnectionConfig

  /**
   * Connection pool configuration
   */
  pool?: PoolConfig

  /**
   * Enable query logging
   */
  debug?: boolean

  /**
   * Use null as default value for undefined
   */
  useNullAsDefault?: boolean
}

/**
 * SQL bindings for prepared statements
 */
export type SqlBindings = unknown[]

/**
 * Database row shape
 */
export type DatabaseRow = Record<string, unknown>

/**
 * Raw query result from database driver
 */
export interface RawQueryResult<TRow extends DatabaseRow = DatabaseRow> {
  /**
   * Rows returned from SELECT queries
   */
  rows: TRow[]

  /**
   * Number of affected rows (INSERT, UPDATE, DELETE)
   */
  rowCount?: number

  /**
   * ID of last inserted row (if applicable)
   */
  insertId?: number | string | bigint

  /**
   * Additional metadata from the database
   */
  metadata?: Record<string, unknown>
}

/**
 * Connection state
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  ERROR = 'error'
}

/**
 * Transaction isolation levels
 */
export enum IsolationLevel {
  READ_UNCOMMITTED = 'READ UNCOMMITTED',
  READ_COMMITTED = 'READ COMMITTED',
  REPEATABLE_READ = 'REPEATABLE READ',
  SERIALIZABLE = 'SERIALIZABLE'
}
