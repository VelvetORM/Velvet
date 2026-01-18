/**
 * Schema Builder
 *
 * Provides a fluent API for creating and modifying database tables.
 * Used for migrations and schema management.
 */

import { Database } from "./Database";
import type { ColumnDefinition, ColumnType, DatabaseRow } from "./types";
import { QuerySanitizer } from "./support/QuerySanitizer";

/**
 * Column Definition Builder
 *
 * Fluent interface for defining table columns
 */
class ColumnBuilder {
  private definition: Partial<ColumnDefinition>;

  constructor(name: string, type: ColumnType) {
    this.definition = { name, type };
  }

  /**
   * Make column nullable
   */
  nullable(): this {
    this.definition.nullable = true;
    return this;
  }

  /**
   * Set default value
   */
  default(value: unknown): this {
    this.definition.default = value;
    return this;
  }

  /**
   * Make column unsigned (numbers only)
   */
  unsigned(): this {
    this.definition.unsigned = true;
    return this;
  }

  /**
   * Make column primary key
   */
  primary(): this {
    this.definition.primary = true;
    return this;
  }

  /**
   * Make column unique
   */
  unique(): this {
    this.definition.unique = true;
    return this;
  }

  /**
   * Auto increment (integers only)
   */
  autoIncrement(): this {
    this.definition.autoIncrement = true;
    return this;
  }

  /**
   * Get the column definition
   */
  getDefinition(): Partial<ColumnDefinition> {
    return this.definition;
  }
}

/**
 * Table Blueprint
 *
 * Defines the structure of a table during creation or modification
 */
export class Blueprint {
  /**
   * Table name
   */
  public tableName: string;

  /**
   * Column definitions
   */
  public columns: Partial<ColumnDefinition>[] = [];

  /**
   * SQL commands to execute
   */
  public commands: string[] = [];

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  // ==========================================
  // COLUMN TYPES
  // ==========================================

  /**
   * Add an auto-incrementing integer primary key
   */
  increments(name: string = "id"): ColumnBuilder {
    const column = new ColumnBuilder(name, "integer")
      .primary()
      .autoIncrement()
      .unsigned();

    this.columns.push(column.getDefinition());
    return column;
  }

  /**
   * Add a string column
   */
  string(name: string, length: number = 255): ColumnBuilder {
    const column = new ColumnBuilder(name, "string");
    column.getDefinition().length = length;
    this.columns.push(column.getDefinition());
    return column;
  }

  /**
   * Add a text column
   */
  text(name: string): ColumnBuilder {
    const column = new ColumnBuilder(name, "text");
    this.columns.push(column.getDefinition());
    return column;
  }

  /**
   * Add an integer column
   */
  integer(name: string): ColumnBuilder {
    const column = new ColumnBuilder(name, "integer");
    this.columns.push(column.getDefinition());
    return column;
  }

  /**
   * Add a big integer column
   */
  bigInteger(name: string): ColumnBuilder {
    const column = new ColumnBuilder(name, "bigInteger");
    this.columns.push(column.getDefinition());
    return column;
  }

  /**
   * Add a float column
   */
  float(name: string): ColumnBuilder {
    const column = new ColumnBuilder(name, "float");
    this.columns.push(column.getDefinition());
    return column;
  }

  /**
   * Add a double column
   */
  double(name: string): ColumnBuilder {
    const column = new ColumnBuilder(name, "double");
    this.columns.push(column.getDefinition());
    return column;
  }

  /**
   * Add a decimal column
   */
  decimal(
    name: string,
    precision: number = 8,
    scale: number = 2
  ): ColumnBuilder {
    const column = new ColumnBuilder(name, "decimal");
    column.getDefinition().length = precision;
    column.getDefinition().scale = scale;
    this.columns.push(column.getDefinition());
    return column;
  }

  /**
   * Add a boolean column
   */
  boolean(name: string): ColumnBuilder {
    const column = new ColumnBuilder(name, "boolean");
    this.columns.push(column.getDefinition());
    return column;
  }

  /**
   * Add a date column
   */
  date(name: string): ColumnBuilder {
    const column = new ColumnBuilder(name, "date");
    this.columns.push(column.getDefinition());
    return column;
  }

  /**
   * Add a datetime column
   */
  datetime(name: string): ColumnBuilder {
    const column = new ColumnBuilder(name, "datetime");
    this.columns.push(column.getDefinition());
    return column;
  }

  /**
   * Add a timestamp column
   */
  timestamp(name: string): ColumnBuilder {
    const column = new ColumnBuilder(name, "timestamp");
    this.columns.push(column.getDefinition());
    return column;
  }

  /**
   * Add created_at and updated_at timestamp columns
   */
  timestamps(): void {
    this.timestamp("created_at").nullable();
    this.timestamp("updated_at").nullable();
  }

  /**
   * Add a JSON column
   */
  json(name: string): ColumnBuilder {
    const column = new ColumnBuilder(name, "json");
    this.columns.push(column.getDefinition());
    return column;
  }

  /**
   * Add a UUID column
   */
  uuid(name: string): ColumnBuilder {
    const column = new ColumnBuilder(name, "uuid");
    this.columns.push(column.getDefinition());
    return column;
  }

  // ==========================================
  // COMPILE TO SQL (SQLite)
  // ==========================================

  /**
   * Compile blueprint to CREATE TABLE SQL
   *
   * Note: This is a simple SQLite implementation
   * In the future, this should use grammar classes for each DB type
   */
  toSql(): string {
    // Sanitize table name
    const safeTableName = QuerySanitizer.sanitizeTableName(this.tableName);

    const columnDefinitions = this.columns.map((col) => {
      // Sanitize column name
      const safeColumnName = QuerySanitizer.sanitizeColumnName(col.name!);
      let sql = `"${safeColumnName}" `;

      // Map types to SQLite types
      switch (col.type) {
        case "integer":
        case "bigInteger":
          sql += "INTEGER";
          break;
        case "string":
          sql += col.length ? `VARCHAR(${col.length})` : "VARCHAR(255)";
          break;
        case "text":
          sql += "TEXT";
          break;
        case "float":
        case "double":
        case "decimal":
          sql += "REAL";
          break;
        case "boolean":
          sql += "INTEGER"; // SQLite uses 0/1 for booleans
          break;
        case "date":
        case "datetime":
        case "timestamp":
          sql += "TEXT"; // SQLite stores dates as TEXT
          break;
        case "json":
          sql += "TEXT";
          break;
        case "uuid":
          sql += "TEXT";
          break;
        default:
          sql += "TEXT";
      }

      // Add modifiers
      if (col.primary) {
        sql += " PRIMARY KEY";
      }

      if (col.autoIncrement) {
        sql += " AUTOINCREMENT";
      }

      if (!col.nullable && !col.primary) {
        sql += " NOT NULL";
      }

      if (col.unique && !col.primary) {
        sql += " UNIQUE";
      }

      if (col.default !== undefined) {
        if (typeof col.default === "string") {
          sql += ` DEFAULT '${col.default}'`;
        } else if (col.default === null) {
          sql += " DEFAULT NULL";
        } else {
          sql += ` DEFAULT ${col.default}`;
        }
      }

      return sql;
    });

    return `CREATE TABLE "${safeTableName}" (\n  ${columnDefinitions.join(",\n  ")}\n)`;
  }
}

/**
 * Schema Facade
 *
 * Main entry point for schema operations
 */
export class Schema {
  /**
   * Create a new table
   *
   * @param tableName - Table name
   * @param callback - Blueprint callback
   * @param connectionName - Optional connection name
   *
   * @example
   * ```typescript
   * await Schema.create('users', (table) => {
   *   table.increments('id')
   *   table.string('name')
   *   table.string('email').unique()
   *   table.timestamps()
   * })
   * ```
   */
  static async create(
    tableName: string,
    callback: (table: Blueprint) => void,
    connectionName?: string
  ): Promise<void> {
    const blueprint = new Blueprint(tableName);
    callback(blueprint);

    const sql = blueprint.toSql();
    await Database.raw(sql, [], connectionName);
  }

  /**
   * Drop a table
   *
   * @param tableName - Table name
   * @param connectionName - Optional connection name
   */
  static async drop(tableName: string, connectionName?: string): Promise<void> {
    const safeTableName = QuerySanitizer.sanitizeTableName(tableName);
    await Database.raw(`DROP TABLE "${safeTableName}"`, [], connectionName);
  }

  /**
   * Drop table if exists
   *
   * @param tableName - Table name
   * @param connectionName - Optional connection name
   */
  static async dropIfExists(
    tableName: string,
    connectionName?: string
  ): Promise<void> {
    const safeTableName = QuerySanitizer.sanitizeTableName(tableName);
    await Database.raw(
      `DROP TABLE IF EXISTS "${safeTableName}"`,
      [],
      connectionName
    );
  }

  /**
   * Check if table exists
   *
   * @param tableName - Table name
   * @param connectionName - Optional connection name
   * @returns True if table exists
   */
  static async hasTable(
    tableName: string,
    connectionName?: string
  ): Promise<boolean> {
    // Sanitize table name (will be used in parameterized query, but still validate)
    const safeTableName = QuerySanitizer.sanitizeTableName(tableName);

    const result = await Database.raw(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [safeTableName],
      connectionName
    );

    return result.rows.length > 0;
  }

  /**
   * Check if column exists in table
   *
   * @param tableName - Table name
   * @param columnName - Column name
   * @param connectionName - Optional connection name
   * @returns True if column exists
   */
  static async hasColumn(
    tableName: string,
    columnName: string,
    connectionName?: string
  ): Promise<boolean> {
    // Sanitize identifiers before use
    const safeTableName = QuerySanitizer.sanitizeTableName(tableName);
    const safeColumnName = QuerySanitizer.sanitizeColumnName(columnName);

    const result = await Database.raw(
      `PRAGMA table_info("${safeTableName}")`,
      [],
      connectionName
    );

    return result.rows.some((row: DatabaseRow) => {
      if (!row || typeof row !== "object") {
        return false;
      }
      const candidate = row as { name?: unknown };
      return candidate.name === safeColumnName;
    });
  }
}
