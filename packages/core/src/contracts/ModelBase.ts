/**
 * ModelBase Contract
 *
 * Minimal interface that relations and other components need from a Model.
 * This breaks the circular dependency between Model and its components.
 */

/**
 * Base attributes type
 */
export type BaseAttributes = Record<string, unknown>

/**
 * Minimal model interface for relations
 * This is what relation classes need to work with a model
 */
export interface ModelBase {
  /** Whether model exists in database */
  readonly exists: boolean

  /** Get an attribute value */
  getAttribute(key: string): unknown

  /** Set an attribute value */
  setAttribute(key: string, value: unknown): void

  /** Get a loaded relation */
  getRelation(name: string): unknown

  /** Set a relation value */
  setRelation(name: string, value: unknown): void

  /** Save the model */
  save(): Promise<boolean>
}

/**
 * Static model interface for relations
 * This is what relation classes need from the Model constructor
 */
export interface ModelBaseStatic {
  /** Table name */
  readonly table: string
  /** Primary key column */
  readonly primaryKey: string
  /** Connection name */
  readonly connection: string
  /** Enable automatic timestamps */
  readonly timestamps: boolean
  /** Created at column name */
  readonly createdAtColumn: string
  /** Updated at column name */
  readonly updatedAtColumn: string
  /** Enable soft deletes */
  readonly softDeletes: boolean
  /** Deleted at column name */
  readonly deletedAtColumn: string
  /** Model name (class name) */
  readonly name: string
}

/**
 * Constructable model interface
 */
export type ModelBaseConstructor = {
  new (attributes?: Record<string, unknown>): ModelBase
} & ModelBaseStatic

// Re-export scope types from ScopeContract for backwards compatibility
export type { ScopeFunction, ScopeRegistry } from './ScopeContract'
