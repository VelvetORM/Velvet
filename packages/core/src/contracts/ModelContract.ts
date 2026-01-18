/**
 * Model Contract
 *
 * Defines the public interface for Model instances.
 * This contract ensures consistent behavior across implementations.
 */

import type { Collection } from '../support/Collection'

/**
 * Base model attributes type
 */
export type Attributes = Record<string, unknown>

/**
 * Cast type definitions
 */
export type CastType =
  | 'string'
  | 'number'
  | 'int'
  | 'integer'
  | 'float'
  | 'double'
  | 'boolean'
  | 'bool'
  | 'date'
  | 'datetime'
  | 'timestamp'
  | 'json'
  | 'array'
  | 'object'

/**
 * Model configuration options
 */
export interface ModelConfiguration {
  /** Database table name */
  readonly table: string
  /** Primary key column name */
  readonly primaryKey: string
  /** Database connection name */
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
}

/**
 * Model lifecycle events
 */
export type ModelEvent =
  | 'creating'
  | 'created'
  | 'updating'
  | 'updated'
  | 'saving'
  | 'saved'
  | 'deleting'
  | 'deleted'
  | 'restoring'
  | 'restored'

/**
 * Model event handler function
 */
export type ModelEventHandler<T = unknown> = (model: T) => void | Promise<void>

/**
 * Attribute mutator function
 */
export type AttributeMutator<TInput = unknown, TOutput = unknown> = (value: TInput) => TOutput

/**
 * Attribute accessor function
 */
export type AttributeAccessor<TInput = unknown, TOutput = unknown> = (value: TInput) => TOutput

/**
 * Model contract - defines what a Model instance must implement
 */
export interface ModelContract<TAttributes extends Attributes = Attributes> {
  /**
   * Whether the model exists in the database
   */
  readonly exists: boolean

  /**
   * Fill the model with attributes
   */
  fill(attributes: Partial<TAttributes>): this

  /**
   * Get an attribute value
   */
  getAttribute<K extends keyof TAttributes>(key: K): TAttributes[K]
  getAttribute(key: string): unknown

  /**
   * Set an attribute value
   */
  setAttribute<K extends keyof TAttributes>(key: K, value: TAttributes[K]): void
  setAttribute(key: string, value: unknown): void

  /**
   * Get all attributes
   */
  getAttributes(): Readonly<TAttributes>

  /**
   * Check if attribute(s) are dirty
   */
  isDirty(...attributes: (keyof TAttributes)[]): boolean

  /**
   * Get dirty attributes
   */
  getDirty(): Partial<TAttributes>

  /**
   * Save the model to database
   */
  save(): Promise<boolean>

  /**
   * Delete the model from database
   */
  delete(): Promise<boolean>

  /**
   * Force delete (bypass soft deletes)
   */
  forceDelete(): Promise<boolean>

  /**
   * Restore a soft-deleted model
   */
  restore(): Promise<boolean>

  /**
   * Refresh from database
   */
  refresh(): Promise<this>

  /**
   * Convert to JSON representation
   */
  toJSON(): Record<string, unknown>

  /**
   * Get a loaded relation
   */
  getRelation(name: string): unknown

  /**
   * Set a relation value
   */
  setRelation(name: string, value: unknown): void
}

/**
 * Static model contract - defines what a Model class must implement
 */
export interface ModelStaticContract<
  TModel extends ModelContract = ModelContract,
  TAttributes extends Attributes = Attributes
> {
  /**
   * Model configuration
   */
  readonly table: string
  readonly primaryKey: string
  readonly connection: string
  readonly timestamps: boolean
  readonly createdAtColumn: string
  readonly updatedAtColumn: string
  readonly softDeletes: boolean
  readonly deletedAtColumn: string

  /**
   * Create a new instance
   */
  new (attributes?: Partial<TAttributes>): TModel

  /**
   * Find by primary key
   */
  find(id: string | number): Promise<TModel | null>

  /**
   * Find by primary key or throw
   */
  findOrFail(id: string | number): Promise<TModel>

  /**
   * Get all models
   */
  all(): Promise<Collection<TModel>>

  /**
   * Create and persist a new model
   */
  create(attributes: Partial<TAttributes>): Promise<TModel>
}
