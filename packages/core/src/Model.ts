/**
 * Base Model Class
 *
 * Active Record implementation for Velvet ORM.
 * Models extend this class to gain database interaction capabilities.
 *
 * Architecture:
 * - AttributeBag: manages attributes, dirty tracking, casting
 * - ModelSerializer: handles toJSON serialization
 * - ModelEventDispatcher: manages lifecycle events
 */

import { Builder } from './Builder'
import { Collection } from './support/Collection'
import { AttributeBag, type CastMap, type MutatorRegistry, type AccessorRegistry } from './model/AttributeBag'
import { ModelSerializer } from './model/ModelSerializer'
import { ModelEventDispatcher } from './model/ModelEventDispatcher'
import { ModelPersister } from './model/ModelPersister'
import { ModelValidator } from './model/ModelValidator'
import { QueryProxy } from './model/QueryProxy'
import { Repository } from './model/Repository'
import type { Attributes, ModelEvent, ModelConfiguration } from './contracts/ModelContract'
import type { ModelBaseStatic } from './contracts/ModelBase'
import type { DatabaseRow, ComparisonOperator } from './types'
import type { ValidationRules } from './support/InputValidator'
import { HasMany } from './relations/HasMany'
import { HasOne } from './relations/HasOne'
import { BelongsTo } from './relations/BelongsTo'
import { BelongsToMany } from './relations/BelongsToMany'

// ==========================================
// TYPE DEFINITIONS
// ==========================================

/**
 * Extract attributes type from a Model
 */
export type ModelAttributesOf<T> = T extends Model<infer A> ? A : Attributes

/**
 * Model static configuration interface
 */
export interface ModelStatic {
  table: string
  primaryKey: string
  connection: string
  timestamps: boolean
  createdAtColumn: string
  updatedAtColumn: string
  softDeletes: boolean
  deletedAtColumn: string
}

/**
 * Constructor type for Model subclasses
 */
export type ModelConstructor<T extends Model = Model> =
  (new (attributes?: Partial<Attributes>) => T) & typeof Model

/**
 * Model class type with static properties
 */
export type ModelClass<T extends Model = Model> =
  (new (attributes?: Partial<Attributes>) => T) & ModelStatic

// ==========================================
// BASE MODEL CLASS
// ==========================================

/**
 * Base Model
 *
 * Provides Active Record pattern for database models.
 *
 * @example
 * ```typescript
 * interface UserAttributes {
 *   id: number
 *   name: string
 *   email: string
 *   created_at: Date
 * }
 *
 * class User extends Model<UserAttributes> {
 *   static table = 'users'
 *
 *   protected casts: CastMap = {
 *     created_at: 'datetime'
 *   }
 *
 *   protected hidden = ['password']
 * }
 *
 * const user = await User.create({ name: 'John', email: 'john@example.com' })
 * ```
 */
export abstract class Model<TAttributes extends Attributes = Attributes> {
  // ==========================================
  // STATIC CONFIGURATION
  // ==========================================

  /** Database table name */
  static table: string

  /** Primary key column @default 'id' */
  static primaryKey: string = 'id'

  /** Database connection name @default 'default' */
  static connection: string = 'default'

  /** Enable automatic timestamps @default true */
  static timestamps: boolean = true

  /** Created at column name @default 'created_at' */
  static createdAtColumn: string = 'created_at'

  /** Updated at column name @default 'updated_at' */
  static updatedAtColumn: string = 'updated_at'

  /** Enable soft deletes @default false */
  static softDeletes: boolean = false

  /** Deleted at column name @default 'deleted_at' */
  static deletedAtColumn: string = 'deleted_at'

  // ==========================================
  // INSTANCE COMPONENTS
  // ==========================================

  /** Attribute manager */
  protected readonly attributeBag: AttributeBag<TAttributes>

  /** Serializer */
  protected readonly serializer: ModelSerializer<TAttributes>

  /** Event dispatcher */
  protected readonly events: ModelEventDispatcher<this>

  /** Persistence handler */
  protected readonly persister: ModelPersister<TAttributes>

  /** Validator */
  protected readonly validator: ModelValidator

  /** Loaded relationships */
  protected relations: Record<string, unknown> = {}

  /** Whether model exists in database */
  public exists: boolean = false

  // ==========================================
  // CONFIGURATION (override in subclasses)
  // ==========================================

  /** Attribute casts */
  protected casts: CastMap = {}

  /** Hidden attributes for serialization */
  protected hidden: string[] = []

  /** Visible attributes for serialization (whitelist) */
  protected visible: string[] = []

  /** Validation rules */
  protected validation: ValidationRules = {}

  /** Validate on fill */
  protected validateOnFill: boolean = false

  // ==========================================
  // CONSTRUCTOR
  // ==========================================

  constructor(attributes: Partial<TAttributes> = {}) {
    // Initialize attribute bag with casts and mutators/accessors
    this.attributeBag = new AttributeBag<TAttributes>({
      attributes: attributes as TAttributes,
      casts: this.casts,
      mutators: this.buildMutators(),
      accessors: this.buildAccessors(),
      exists: false
    })

    // Initialize serializer with hidden/visible config
    this.serializer = new ModelSerializer<TAttributes>({
      hidden: this.hidden,
      visible: this.visible
    })

    // Initialize event dispatcher and register handlers
    this.events = new ModelEventDispatcher<this>()
    this.registerEventHandlers()

    // Initialize persister and validator
    this.persister = new ModelPersister<TAttributes>(() => this.getConfig(), this.attributeBag)
    this.validator = new ModelValidator(() => this.validation)
  }

  // ==========================================
  // STATIC QUERY METHODS
  // ==========================================

  /**
   * Begin a new query
   */
  static query<T extends Model>(this: ModelConstructor<T>): Builder<T> {
    return this.queryProxy<T>().query()
  }

  /**
   * Add a WHERE clause
   */
  static where<T extends Model>(
    this: ModelConstructor<T>,
    column: string,
    value: unknown
  ): Builder<T>
  static where<T extends Model>(
    this: ModelConstructor<T>,
    column: string,
    operator: ComparisonOperator,
    value: unknown
  ): Builder<T>
  static where<T extends Model>(
    this: ModelConstructor<T>,
    column: string,
    operatorOrValue?: ComparisonOperator | unknown,
    value?: unknown
  ): Builder<T> {
    if (arguments.length === 2) {
      return this.queryProxy<T>().where(column, operatorOrValue)
    }
    return this.queryProxy<T>().where(column, operatorOrValue as ComparisonOperator, value)
  }

  /**
   * Find by primary key
   */
  static async find<T extends Model>(
    this: ModelConstructor<T>,
    id: string | number
  ): Promise<T | null> {
    return this.queryProxy<T>().find(id)
  }

  /**
   * Find by primary key or throw
   */
  static async findOrFail<T extends Model>(
    this: ModelConstructor<T>,
    id: string | number
  ): Promise<T> {
    return this.queryProxy<T>().findOrFail(id)
  }

  /**
   * Get the first model
   */
  static async first<T extends Model>(this: ModelConstructor<T>): Promise<T | null> {
    return this.queryProxy<T>().first()
  }

  /**
   * Get all models
   */
  static async all<T extends Model>(this: ModelConstructor<T>): Promise<Collection<T>> {
    return this.queryProxy<T>().all()
  }

  /**
   * Alias for all()
   */
  static async get<T extends Model>(this: ModelConstructor<T>): Promise<Collection<T>> {
    return this.queryProxy<T>().get()
  }

  /**
   * Create and persist a new model
   */
  static async create<T extends Model>(
    this: ModelConstructor<T>,
    attributes: Partial<Attributes>
  ): Promise<T> {
    return this.queryProxy<T>().create(attributes)
  }

  /**
   * Eager load relationships
   */
  static with<T extends Model>(this: ModelConstructor<T>, ...relations: string[]): Builder<T> {
    return this.queryProxy<T>().with(...relations)
  }

  /**
   * Order by column
   */
  static orderBy<T extends Model>(
    this: ModelConstructor<T>,
    column: string,
    direction?: 'asc' | 'desc'
  ): Builder<T> {
    return this.queryProxy<T>().orderBy(column, direction)
  }

  /**
   * Order by created_at DESC
   */
  static latest<T extends Model>(this: ModelConstructor<T>, column?: string): Builder<T> {
    return this.queryProxy<T>().latest(column)
  }

  /**
   * Order by created_at ASC
   */
  static oldest<T extends Model>(this: ModelConstructor<T>, column?: string): Builder<T> {
    return this.queryProxy<T>().oldest(column)
  }

  /**
   * Limit results
   */
  static limit<T extends Model>(this: ModelConstructor<T>, value: number): Builder<T> {
    return this.queryProxy<T>().limit(value)
  }

  /**
   * Alias for limit
   */
  static take<T extends Model>(this: ModelConstructor<T>, value: number): Builder<T> {
    return this.queryProxy<T>().take(value)
  }

  /**
   * Count models
   */
  static async count<T extends Model>(this: ModelConstructor<T>): Promise<number> {
    return this.queryProxy<T>().count()
  }

  /**
   * Include soft deleted
   */
  static withTrashed<T extends Model>(this: ModelConstructor<T>): Builder<T> {
    return this.queryProxy<T>().withTrashed()
  }

  /**
   * Only soft deleted
   */
  static onlyTrashed<T extends Model>(this: ModelConstructor<T>): Builder<T> {
    return this.queryProxy<T>().onlyTrashed()
  }

  /**
   * Apply a named scope
   */
  static scope<T extends Model>(
    this: ModelConstructor<T>,
    name: string,
    ...args: unknown[]
  ): Builder<T> {
    return this.queryProxy<T>().scope(name, ...args)
  }

  /**
   * Build a query proxy for this model
   */
  static queryProxy<T extends Model>(this: ModelConstructor<T>): QueryProxy<T> {
    return new QueryProxy<T>(this)
  }

  /**
   * Build a repository for this model
   */
  static repository<T extends Model>(this: ModelConstructor<T>): Repository<T> {
    return new Repository<T>(this)
  }

  /**
   * Alias for repository()
   */
  static repo<T extends Model>(this: ModelConstructor<T>): Repository<T> {
    return this.repository<T>()
  }

  // ==========================================
  // RELATIONSHIPS
  // ==========================================

  protected hasMany<T extends Model>(
    related: ModelClass<T>,
    foreignKey?: string,
    localKey?: string
  ): HasMany<T> {
    const parentStatic = this.constructor as unknown as ModelBaseStatic
    return new HasMany<T>(this, parentStatic, related, foreignKey, localKey)
  }

  protected hasOne<T extends Model>(
    related: ModelClass<T>,
    foreignKey?: string,
    localKey?: string
  ): HasOne<T> {
    const parentStatic = this.constructor as unknown as ModelBaseStatic
    return new HasOne<T>(this, parentStatic, related, foreignKey, localKey)
  }

  protected belongsTo<T extends Model>(
    related: ModelClass<T>,
    foreignKey?: string,
    ownerKey?: string
  ): BelongsTo<T> {
    return new BelongsTo<T>(this, related, foreignKey, ownerKey)
  }

  protected belongsToMany<T extends Model>(
    related: ModelClass<T>,
    pivotTable?: string,
    foreignPivotKey?: string,
    relatedPivotKey?: string,
    relatedKey?: string,
    localKey?: string
  ): BelongsToMany<T> {
    const parentStatic = this.constructor as unknown as ModelBaseStatic
    return new BelongsToMany<T>(
      this, parentStatic, related, pivotTable,
      foreignPivotKey, relatedPivotKey, relatedKey, localKey
    )
  }

  // ==========================================
  // ATTRIBUTE METHODS
  // ==========================================

  /**
   * Fill model with attributes
   */
  fill(attributes: Partial<TAttributes>): this {
    if (this.validateOnFill && Object.keys(this.validation).length > 0) {
      this.validateAttributes(attributes as Record<string, unknown>, false)
    }
    this.attributeBag.fill(attributes)
    return this
  }

  /**
   * Get an attribute value
   */
  getAttribute<K extends keyof TAttributes>(key: K): TAttributes[K]
  getAttribute(key: string): unknown
  getAttribute(key: string): unknown {
    return this.attributeBag.get(key)
  }

  /**
   * Set an attribute value
   */
  setAttribute<K extends keyof TAttributes>(key: K, value: TAttributes[K]): void
  setAttribute(key: string, value: unknown): void
  setAttribute(key: string, value: unknown): void {
    this.attributeBag.set(key, value)
  }

  /**
   * Get all attributes
   */
  getAttributes(): Readonly<TAttributes> {
    return this.attributeBag.all()
  }

  /**
   * Check if attributes are dirty
   */
  isDirty(...keys: string[]): boolean {
    return this.attributeBag.isDirty(...keys)
  }

  /**
   * Get dirty attributes
   */
  getDirty(): Partial<TAttributes> {
    return this.attributeBag.getDirty()
  }

  // ==========================================
  // PERSISTENCE
  // ==========================================

  /**
   * Save the model
   */
  async save(): Promise<boolean> {
    // Validate if rules defined
    if (Object.keys(this.validation).length > 0) {
      this.validateAttributes(this.attributeBag.allRaw(), true)
    }

    if (this.exists) {
      await this.events.dispatch('updating', this)
      await this.performUpdate()
      await this.events.dispatch('updated', this)
    } else {
      await this.events.dispatch('creating', this)
      await this.performInsert()
      await this.events.dispatch('created', this)
    }

    this.attributeBag.sync()
    return true
  }

  /**
   * Delete the model
   */
  async delete(): Promise<boolean> {
    if (!this.exists) return false

    await this.events.dispatch('deleting', this)

    const config = this.getConfig()

    if (config.softDeletes) {
      this.setAttribute(config.deletedAtColumn, new Date().toISOString())
      await this.save()
    } else {
      await this.performDelete()
      this.exists = false
    }

    await this.events.dispatch('deleted', this)
    return true
  }

  /**
   * Force delete (bypass soft deletes)
   */
  async forceDelete(): Promise<boolean> {
    if (!this.exists) return false

    await this.performDelete()
    this.exists = false
    return true
  }

  /**
   * Restore soft-deleted model
   */
  async restore(): Promise<boolean> {
    const config = this.getConfig()
    if (!config.softDeletes) {
      throw new Error('Model does not use soft deletes')
    }

    await this.events.dispatch('restoring', this)
    this.setAttribute(config.deletedAtColumn, null)
    await this.save()
    await this.events.dispatch('restored', this)

    return true
  }

  /**
   * Refresh from database
   */
  async refresh(): Promise<this> {
    const config = this.getConfig()
    const id = this.getAttribute(config.primaryKey as keyof TAttributes)

    const fresh = await (this.constructor as unknown as ModelConstructor<Model>).find(id as string | number)
    if (!fresh) {
      throw new Error('Model not found during refresh')
    }

    // Copy attributes from fresh
    const freshBag = (fresh as Model<TAttributes>).attributeBag
    for (const key of freshBag.keys()) {
      this.attributeBag.setRaw(key, freshBag.getRaw(key))
    }
    this.attributeBag.sync()

    return this
  }

  // ==========================================
  // INTERNAL PERSISTENCE
  // ==========================================

  protected async performInsert(): Promise<void> {
    const config = this.getConfig()
    const insertId = await this.persister.insert()
    this.attributeBag.set(config.primaryKey, insertId)
    this.exists = true
  }

  protected async performUpdate(): Promise<void> {
    const config = this.getConfig()
    const primaryKeyValue = this.getAttribute(config.primaryKey as keyof TAttributes)
    await this.persister.update(primaryKeyValue)
  }

  protected async performDelete(): Promise<void> {
    const config = this.getConfig()
    const primaryKeyValue = this.getAttribute(config.primaryKey as keyof TAttributes)
    await this.persister.delete(primaryKeyValue)
  }

  // ==========================================
  // SERIALIZATION
  // ==========================================

  /**
   * Convert to JSON object
   */
  toJSON(): Record<string, unknown> {
    return this.serializer.serialize(this.attributeBag, this.relations)
  }

  /**
   * Convert to string
   */
  toString(): string {
    return JSON.stringify(this.toJSON(), null, 2)
  }

  // ==========================================
  // RELATIONS
  // ==========================================

  /**
   * Set a relation value
   */
  setRelation(name: string, value: unknown): void {
    this.relations[name] = value
  }

  /**
   * Get a relation value
   */
  getRelation(name: string): unknown {
    return this.relations[name]
  }

  /**
   * Check if relation is loaded
   */
  hasRelation(name: string): boolean {
    return name in this.relations
  }

  // ==========================================
  // RAW ATTRIBUTE HANDLING (for Builder hydration)
  // ==========================================

  /**
   * Set attributes from database row
   * @internal Used by Builder for hydration
   */
  setRawAttributes(row: DatabaseRow, exists: boolean = true): void {
    for (const [key, value] of Object.entries(row)) {
      this.attributeBag.setRaw(key, value)
    }
    if (exists) {
      this.attributeBag.sync()
    }
    this.exists = exists
  }

  // ==========================================
  // CONFIGURATION HELPERS
  // ==========================================

  /**
   * Get model configuration
   */
  protected getConfig(): ModelConfiguration {
    const ctor = this.constructor as typeof Model
    return {
      table: ctor.table,
      primaryKey: ctor.primaryKey,
      connection: ctor.connection,
      timestamps: ctor.timestamps,
      createdAtColumn: ctor.createdAtColumn,
      updatedAtColumn: ctor.updatedAtColumn,
      softDeletes: ctor.softDeletes,
      deletedAtColumn: ctor.deletedAtColumn
    }
  }

  // ==========================================
  // MUTATORS & ACCESSORS
  // ==========================================

  /**
   * Build mutator registry from setXxxAttribute methods
   */
  private buildMutators(): MutatorRegistry {
    const mutators: MutatorRegistry = {}
    const proto = Object.getPrototypeOf(this) as Record<string, unknown>

    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key.startsWith('set') && key.endsWith('Attribute') && key.length > 12) {
        const attrName = this.snakeCase(key.slice(3, -9))
        const method = proto[key]
        if (typeof method === 'function') {
          mutators[attrName] = method.bind(this) as (value: unknown) => unknown
        }
      }
    }

    return mutators
  }

  /**
   * Build accessor registry from getXxxAttribute methods
   */
  private buildAccessors(): AccessorRegistry {
    const accessors: AccessorRegistry = {}
    const proto = Object.getPrototypeOf(this) as Record<string, unknown>

    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key.startsWith('get') && key.endsWith('Attribute') && key.length > 12) {
        const attrName = this.snakeCase(key.slice(3, -9))
        const method = proto[key]
        if (typeof method === 'function') {
          accessors[attrName] = method.bind(this) as (value: unknown) => unknown
        }
      }
    }

    return accessors
  }

  /**
   * Register event handlers from instance methods
   */
  private registerEventHandlers(): void {
    const eventMethods: ModelEvent[] = [
      'creating', 'created', 'updating', 'updated',
      'saving', 'saved', 'deleting', 'deleted',
      'restoring', 'restored'
    ]

    for (const event of eventMethods) {
      const method = (this as Record<string, unknown>)[event]
      if (typeof method === 'function') {
        this.events.on(event, method.bind(this) as () => void | Promise<void>)
      }
    }
  }

  // ==========================================
  // VALIDATION
  // ==========================================

  protected validateAttributes(attributes: Record<string, unknown>, requireAll: boolean): void {
    this.validator.validate(attributes, requireAll)
  }

  // ==========================================
  // STRING UTILITIES
  // ==========================================

  private snakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
  }
}

// Re-export types for convenience
export type { Attributes, ModelEvent, ModelConfiguration } from './contracts/ModelContract'
export type { CastMap, MutatorRegistry, AccessorRegistry } from './model/AttributeBag'
