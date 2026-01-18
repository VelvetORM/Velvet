/**
 * SQLite Database Driver
 *
 * Driver implementation for SQLite using better-sqlite3.
 * Supports both file-based and in-memory databases.
 */

import Database from 'better-sqlite3'
import type { Database as SQLiteDatabase, Statement } from 'better-sqlite3'
import { Driver } from '../Driver'
import type {
  RawQueryResult,
  SqliteConnectionConfig,
  IsolationLevel,
  SqlBindings,
  DatabaseRow
} from '../../types'
import { ConnectionException, QueryException } from '../../exceptions'

/**
 * SQLite Driver
 *
 * High-performance synchronous SQLite driver using better-sqlite3.
 *
 * @example
 * ```typescript
 * const driver = new SqliteDriver({
 *   client: 'sqlite',
 *   connection: {
 *     filename: './database.sqlite'
 *   }
 * })
 *
 * await driver.connect()
 * const users = await driver.select('SELECT * FROM users')
 * ```
 */
export class SqliteDriver extends Driver {
  /**
   * SQLite database instance
   */
  private db?: SQLiteDatabase

  /**
   * Active transaction savepoint level
   */
  private savepointLevel: number = 0

  /**
   * Connect to SQLite database
   *
   * @throws {ConnectionException} If connection fails
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return
    }

    try {
      const config = this.config.connection as SqliteConnectionConfig

      // Handle in-memory database
      const filename = config.memory ? ':memory:' : config.filename

      if (!filename) {
        throw new ConnectionException(
          'SQLite connection requires either filename or memory option',
          'INVALID_CONFIG'
        )
      }

      // Create database connection
      this.db = new Database(filename, {
        readonly: config.readonly || false,
        fileMustExist: config.fileMustExist || false
      })

      // Enable foreign keys (disabled by default in SQLite)
      this.db.pragma('foreign_keys = ON')

      // Set journal mode for better concurrency
      this.db.pragma('journal_mode = WAL')

      this.connected = true

      if (this.config.debug) {
        console.log(`[Velvet] Connected to SQLite: ${filename}`)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      throw new ConnectionException(
        `Failed to connect to SQLite: ${message}`,
        'SQLITE_CONNECTION_FAILED',
        { error: message }
      )
    }
  }

  /**
   * Disconnect from SQLite database
   */
  async disconnect(): Promise<void> {
    if (!this.connected || !this.db) {
      return
    }

    try {
      this.db.close()
      this.db = undefined
      this.connected = false
      this.transactionActive = false
      this.savepointLevel = 0

      if (this.config.debug) {
        console.log('[Velvet] Disconnected from SQLite')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      throw new ConnectionException(
        `Failed to disconnect from SQLite: ${message}`,
        'SQLITE_DISCONNECT_FAILED'
      )
    }
  }

  /**
   * Execute a raw SQL query
   *
   * @param sql - SQL query string
   * @param bindings - Parameter bindings
   * @returns Query result
   * @throws {QueryException} If query fails
   */
  async query<TRow extends DatabaseRow = DatabaseRow>(
    sql: string,
    bindings: SqlBindings = []
  ): Promise<RawQueryResult<TRow>> {
    this.ensureConnected()
    this.log(sql, bindings)

    if (!this.db) {
      throw new ConnectionException('Database connection not established', 'NO_CONNECTION')
    }

    try {
      const stmt: Statement<TRow> = this.db.prepare<TRow>(sql)

      // Determine query type
      const queryType = this.getQueryType(sql)

      if (queryType === 'SELECT') {
        const rows = stmt.all(...bindings)
        return {
          rows,
          rowCount: rows.length
        }
      } else if (queryType === 'INSERT') {
        const info = stmt.run(...bindings)
        return {
          rows: [],
          rowCount: info.changes,
          insertId: info.lastInsertRowid
        }
      } else {
        // UPDATE, DELETE
        const info = stmt.run(...bindings)
        return {
          rows: [],
          rowCount: info.changes
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      throw new QueryException(
        `SQLite query failed: ${message}`,
        sql,
        bindings,
        'SQLITE_QUERY_FAILED',
        { error: message }
      )
    }
  }

  /**
   * Begin a database transaction
   *
   * SQLite doesn't support isolation levels in BEGIN statement,
   * so the isolationLevel parameter is ignored.
   *
   * @param _isolationLevel - Ignored for SQLite
   */
  async beginTransaction(_isolationLevel?: IsolationLevel): Promise<void> {
    this.ensureConnected()

    if (!this.db) {
      throw new ConnectionException('Database connection not established', 'NO_CONNECTION')
    }

    try {
      if (this.transactionActive) {
        // Nested transaction - use savepoint
        this.savepointLevel++
        const savepointName = `sp_${this.savepointLevel}`
        this.db.prepare(`SAVEPOINT ${savepointName}`).run()

        if (this.config.debug) {
          console.log(`[Velvet] Created savepoint: ${savepointName}`)
        }
      } else {
        // Start new transaction
        this.db.prepare('BEGIN TRANSACTION').run()
        this.transactionActive = true

        if (this.config.debug) {
          console.log('[Velvet] Transaction started')
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      throw new QueryException(
        `Failed to begin transaction: ${message}`,
        'BEGIN TRANSACTION',
        [],
        'TRANSACTION_BEGIN_FAILED'
      )
    }
  }

  /**
   * Commit the current transaction
   */
  async commit(): Promise<void> {
    this.ensureConnected()

    if (!this.db) {
      throw new ConnectionException('Database connection not established', 'NO_CONNECTION')
    }

    if (!this.transactionActive) {
      throw new QueryException(
        'Cannot commit: no active transaction',
        'COMMIT',
        [],
        'NO_ACTIVE_TRANSACTION'
      )
    }

    try {
      if (this.savepointLevel > 0) {
        // Release savepoint
        const savepointName = `sp_${this.savepointLevel}`
        this.db.prepare(`RELEASE SAVEPOINT ${savepointName}`).run()
        this.savepointLevel--

        if (this.config.debug) {
          console.log(`[Velvet] Released savepoint: ${savepointName}`)
        }
      } else {
        // Commit transaction
        this.db.prepare('COMMIT').run()
        this.transactionActive = false

        if (this.config.debug) {
          console.log('[Velvet] Transaction committed')
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      throw new QueryException(
        `Failed to commit transaction: ${message}`,
        'COMMIT',
        [],
        'TRANSACTION_COMMIT_FAILED'
      )
    }
  }

  /**
   * Rollback the current transaction
   */
  async rollback(): Promise<void> {
    this.ensureConnected()

    if (!this.db) {
      throw new ConnectionException('Database connection not established', 'NO_CONNECTION')
    }

    if (!this.transactionActive) {
      throw new QueryException(
        'Cannot rollback: no active transaction',
        'ROLLBACK',
        [],
        'NO_ACTIVE_TRANSACTION'
      )
    }

    try {
      if (this.savepointLevel > 0) {
        // Rollback to savepoint
        const savepointName = `sp_${this.savepointLevel}`
        this.db.prepare(`ROLLBACK TO SAVEPOINT ${savepointName}`).run()
        this.savepointLevel--

        if (this.config.debug) {
          console.log(`[Velvet] Rolled back to savepoint: ${savepointName}`)
        }
      } else {
        // Rollback transaction
        this.db.prepare('ROLLBACK').run()
        this.transactionActive = false

        if (this.config.debug) {
          console.log('[Velvet] Transaction rolled back')
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      throw new QueryException(
        `Failed to rollback transaction: ${message}`,
        'ROLLBACK',
        [],
        'TRANSACTION_ROLLBACK_FAILED'
      )
    }
  }

  /**
   * Get driver name
   */
  getDriverName(): string {
    return 'sqlite'
  }

  /**
   * Get the underlying better-sqlite3 database instance
   *
   * Useful for advanced operations not covered by the driver interface.
   *
   * @returns SQLite database instance
   * @throws {ConnectionException} If not connected
   */
  getDatabase(): SQLiteDatabase {
    this.ensureConnected()

    if (!this.db) {
      throw new ConnectionException('Database connection not established', 'NO_CONNECTION')
    }

    return this.db
  }

  /**
   * Determine query type from SQL string
   *
   * @param sql - SQL query
   * @returns Query type
   */
  private getQueryType(sql: string): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OTHER' {
    const normalized = sql.trim().toUpperCase()

    if (normalized.startsWith('SELECT')) return 'SELECT'
    if (normalized.startsWith('INSERT')) return 'INSERT'
    if (normalized.startsWith('UPDATE')) return 'UPDATE'
    if (normalized.startsWith('DELETE')) return 'DELETE'

    return 'OTHER'
  }
}
