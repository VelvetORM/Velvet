/**
 * Schema Type Definitions
 *
 * Type definitions for database schema operations and migrations.
 */

/**
 * Column data types
 */
export type ColumnType =
  | 'string'
  | 'text'
  | 'integer'
  | 'bigInteger'
  | 'float'
  | 'double'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'timestamp'
  | 'time'
  | 'json'
  | 'jsonb'
  | 'uuid'
  | 'binary'
  | 'enum'

/**
 * Column definition modifiers
 */
export interface ColumnModifiers {
  /**
   * Make column nullable
   */
  nullable?: boolean

  /**
   * Set default value
   */
  default?: any

  /**
   * Make column unsigned (numeric only)
   */
  unsigned?: boolean

  /**
   * Make column primary key
   */
  primary?: boolean

  /**
   * Make column unique
   */
  unique?: boolean

  /**
   * Auto-increment (integer only)
   */
  autoIncrement?: boolean

  /**
   * Column comment
   */
  comment?: string

  /**
   * Column charset (MySQL)
   */
  charset?: string

  /**
   * Column collation
   */
  collation?: string

  /**
   * After which column to add (MySQL)
   */
  after?: string

  /**
   * Make this the first column (MySQL)
   */
  first?: boolean
}

/**
 * Complete column definition
 */
export interface ColumnDefinition extends ColumnModifiers {
  /**
   * Column name
   */
  name: string

  /**
   * Column type
   */
  type: ColumnType

  /**
   * Length/precision for strings and decimals
   */
  length?: number

  /**
   * Scale for decimal types
   */
  scale?: number

  /**
   * Allowed values for enum type
   */
  enumValues?: string[]
}

/**
 * Index types
 */
export type IndexType = 'INDEX' | 'UNIQUE' | 'FULLTEXT' | 'SPATIAL'

/**
 * Index definition
 */
export interface IndexDefinition {
  /**
   * Index name
   */
  name?: string

  /**
   * Columns included in index
   */
  columns: string[]

  /**
   * Index type
   */
  type: IndexType

  /**
   * Index algorithm (BTREE, HASH)
   */
  algorithm?: string
}

/**
 * Foreign key actions
 */
export type ForeignKeyAction = 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION'

/**
 * Foreign key constraint definition
 */
export interface ForeignKeyDefinition {
  /**
   * Constraint name
   */
  name?: string

  /**
   * Local columns
   */
  columns: string[]

  /**
   * Referenced table
   */
  referencedTable: string

  /**
   * Referenced columns
   */
  referencedColumns: string[]

  /**
   * ON DELETE action
   */
  onDelete?: ForeignKeyAction

  /**
   * ON UPDATE action
   */
  onUpdate?: ForeignKeyAction
}

/**
 * Table creation options
 */
export interface TableOptions {
  /**
   * Table engine (MySQL)
   */
  engine?: string

  /**
   * Table charset
   */
  charset?: string

  /**
   * Table collation
   */
  collation?: string

  /**
   * Table comment
   */
  comment?: string

  /**
   * If table already exists, do nothing
   */
  ifNotExists?: boolean
}
