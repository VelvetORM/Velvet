/**
 * Base Model Class
 *
 * Active Record implementation for Velvet ORM.
 * Models extend this class to gain database interaction capabilities.
 */

import { Builder } from './Builder'
import { Database } from './Database'
import type {
  ModelCasts,
  ModelAttributes,
  ModelEvent,
  ComparisonOperator,
  DatabaseRow
} from './types'
import { QuerySanitizer } from './support/QuerySanitizer'
import { InputValidator, type ValidationRules } from './support/InputValidator'
import { HasMany } from './relations/HasMany'
import { HasOne } from './relations/HasOne'
import { BelongsTo } from './relations/BelongsTo'
import { BelongsToMany } from './relations/BelongsToMany'

export type ModelAttributesOf<T> = T extends Model<infer A> ? A : ModelAttributes

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
 * Constructor type for Model subclasses used in static methods
 */
export type ModelConstructor<T extends Model = Model> = (new (attributes?: Partial<ModelAttributes>) => T) & typeof Model

export type ModelClass<T extends Model = Model> = (new () => T) & ModelStatic

/**
 * Base Model
 *
 * Provides Active Record pattern for database models.
 *
 * @example
 * ```typescript
 * class User extends Model {
 *   static table = 'users'
 *
 *   casts = {
 *     emailVerifiedAt: 'date',
 *     isAdmin: 'boolean'
 *   }
 * }
 *
 * const user = await User.create({
 *   name: 'John Doe',
 *   email: 'john@example.com'
 * })
 * ```
 */
export abstract class Model<TAttributes extends ModelAttributes = ModelAttributes> {
  // ==========================================
  // STATIC PROPERTIES (override in subclasses)
  // ==========================================

  /**
   * Table name in the database
   */
  static table: string

  /**
   * Primary key column name
   * @default 'id'
   */
  static primaryKey: string = 'id'

  /**
   * Database connection name
   * @default 'default'
   */
  static connection: string = 'default'

  /**
   * Enable automatic timestamps
   * @default true
   */
  static timestamps: boolean = true

  /**
   * Created at column name
   * @default 'created_at'
   */
  static createdAtColumn: string = 'created_at'

  /**
   * Updated at column name
   * @default 'updated_at'
   */
  static updatedAtColumn: string = 'updated_at'

  /**
   * Enable soft deletes
   * @default false
   */
  static softDeletes: boolean = false

  /**
   * Deleted at column name
   * @default 'deleted_at'
   */
  static deletedAtColumn: string = 'deleted_at'

  // ==========================================
  // INSTANCE PROPERTIES
  // ==========================================

  /**
   * Model attributes (database columns)
   * @protected
   */
  protected attributes: TAttributes = {} as TAttributes

  /**
   * Original attributes (for dirty checking)
   * @protected
   */
  protected original: TAttributes = {} as TAttributes

  /**
   * Dirty attributes tracking (changed keys)
   * @protected
   */
  protected dirtyAttributes: Set<string> = new Set()

  /**
   * Loaded relationships
   * @protected
   */
  protected relations: Record<string, unknown> = {}

  /**
   * Indicates if model exists in database
   * @public
   */
  public exists: boolean = false

  /**
   * Attribute casting configuration
   * Override in subclasses to define casts
   * @protected
   */
  protected casts: ModelCasts = {}

  /**
   * Hidden attributes (excluded from toJSON)
   * @protected
   */
  protected hidden: string[] = []

  /**
   * Visible attributes (only these in toJSON if set)
   * @protected
   */
  protected visible: string[] = []

  /**
   * Validation rules for model attributes
   * Override in subclasses to define validation
   * @protected
   */
  protected validation: ValidationRules = {}

  /**
   * Validate input during fill()
   * @protected
   */
  protected validateOnFill: boolean = false

  // ==========================================
  // CONSTRUCTOR
  // ==========================================

  /**
   * Create a new model instance
   *
   * @param attributes - Initial attributes
   */
  constructor(attributes: Partial<TAttributes> = {}) {
    this.fill(attributes)
  }

  // ==========================================
  // STATIC QUERY METHODS
  // ==========================================

  /**
   * Begin a query on the model
   *
   * @returns Query builder instance
   */
  static query<T extends Model>(this: ModelConstructor<T>): Builder<T> {
    const ctor = this as unknown as ModelClass<T>
    return new Builder<T>(ctor, this.connection)
  }

  /**
   * Add a basic WHERE clause
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
    operator?: ComparisonOperator | unknown,
    value?: unknown
  ): Builder<T> {
    if (arguments.length === 2) {
      return this.query().where(column, operator as unknown)
    }

    return this.query().where(column, operator as ComparisonOperator, value)
  }

  /**
   * Find a model by primary key
   */
  static async find<T extends Model>(
    this: ModelConstructor<T>,
    id: string | number
  ): Promise<T | null> {
    return this.query().find(id, this.primaryKey)
  }

  /**
   * Find a model by primary key or throw
   *
   * @throws {ModelNotFoundException} If not found
   */
  static async findOrFail<T extends Model>(
    this: ModelConstructor<T>,
    id: string | number
  ): Promise<T> {
    return this.query().findOrFail(id, this.primaryKey)
  }

  /**
   * Get the first model
   */
  static async first<T extends Model>(this: ModelConstructor<T>): Promise<T | null> {
    return this.query().first()
  }

  /**
   * Get all models
   */
  static async all<T extends Model>(this: ModelConstructor<T>): Promise<T[]> {
    return this.query().get()
  }

  /**
   * Alias for all()
   */
  static async get<T extends Model>(this: ModelConstructor<T>): Promise<T[]> {
    return this.all()
  }

  /**
   * Create and save a new model
   *
   * @param attributes - Model attributes
   * @returns Created model instance
   */
  static async create<T extends Model>(
    this: ModelConstructor<T>,
    attributes: Partial<ModelAttributes>
  ): Promise<T> {
    const ctor = this as new (attributes?: Partial<ModelAttributes>) => T
    const instance = new ctor(attributes)
    await instance.save()
    return instance
  }

  /**
   * Eager load relationships
   */
  static with<T extends Model>(this: ModelConstructor<T>, ...relations: string[]): Builder<T> {
    return this.query().with(...relations)
  }

  /**
   * Add ORDER BY clause
   */
  static orderBy<T extends Model>(
    this: ModelConstructor<T>,
    column: string,
    direction?: 'asc' | 'desc'
  ): Builder<T> {
    return this.query().orderBy(column, direction)
  }

  /**
   * Order by created_at DESC
   */
  static latest<T extends Model>(this: ModelConstructor<T>, column?: string): Builder<T> {
    return this.query().latest(column)
  }

  /**
   * Order by created_at ASC
   */
  static oldest<T extends Model>(this: ModelConstructor<T>, column?: string): Builder<T> {
    return this.query().oldest(column)
  }

  /**
   * Limit results
   */
  static limit<T extends Model>(this: ModelConstructor<T>, value: number): Builder<T> {
    return this.query().limit(value)
  }

  /**
   * Alias for limit
   */
  static take<T extends Model>(this: ModelConstructor<T>, value: number): Builder<T> {
    return this.limit(value)
  }

  /**
   * Get count of models
   */
  static async count<T extends Model>(this: ModelConstructor<T>): Promise<number> {
    return this.query().count()
  }

  /**
   * Include soft deleted records
   */
  static withTrashed<T extends Model>(this: ModelConstructor<T>): Builder<T> {
    const builder = this.query()
    if ((this as typeof Model).softDeletes) {
      builder.withTrashed()
    }
    return builder
  }

  /**
   * Only soft deleted records
   */
  static onlyTrashed<T extends Model>(this: ModelConstructor<T>): Builder<T> {
    const builder = this.query()
    if ((this as typeof Model).softDeletes) {
      builder.onlyTrashed()
    }
    return builder
  }

  /**
   * Apply a named query scope
   *
   * @example
   * ```typescript
   * class User extends Model {
   *   scopeActive(query: Builder<User>) {
   *     return query.where('active', true)
   *   }
   * }
   *
   * const users = await User.scope('active').get()
   * ```
   */
  static scope<T extends Model>(
    this: ModelConstructor<T>,
    scopeName: string,
    ...args: unknown[]
  ): Builder<T> {
    const methodName = `scope${scopeName.charAt(0).toUpperCase()}${scopeName.slice(1)}`
    const ctor = this as unknown as new () => T
    const instance = new ctor()
    const method = (instance as Record<string, unknown>)[methodName]

    if (typeof method !== 'function') {
      throw new Error(`Scope ${scopeName} does not exist on ${this.name}`)
    }

    const query = this.query()
    const result = (method as (builder: Builder<T>, ...args: unknown[]) => Builder<T> | void)
      .call(instance, query, ...args)

    return (result as Builder<T>) || query
  }

  // ==========================================
  // RELATIONSHIPS
  // ==========================================

  protected hasMany<T extends Model>(
    related: ModelClass<T>,
    foreignKey?: string,
    localKey?: string
  ): HasMany<T> {
    return new HasMany(this, related, foreignKey, localKey)
  }

  protected hasOne<T extends Model>(
    related: ModelClass<T>,
    foreignKey?: string,
    localKey?: string
  ): HasOne<T> {
    return new HasOne(this, related, foreignKey, localKey)
  }

  protected belongsTo<T extends Model>(
    related: ModelClass<T>,
    foreignKey?: string,
    ownerKey?: string
  ): BelongsTo<T> {
    return new BelongsTo(this, related, foreignKey, ownerKey)
  }

  protected belongsToMany<T extends Model>(
    related: ModelClass<T>,
    pivotTable?: string,
    foreignPivotKey?: string,
    relatedPivotKey?: string,
    relatedKey?: string,
    localKey?: string
  ): BelongsToMany<T> {
    return new BelongsToMany(
      this,
      related,
      pivotTable,
      foreignPivotKey,
      relatedPivotKey,
      relatedKey,
      localKey
    )
  }

  // ==========================================
  // INSTANCE METHODS
  // ==========================================

  /**
   * Fill model with attributes
   *
   * @param attributes - Attributes to fill
   * @returns this
   */
  fill(attributes: Partial<TAttributes>): this {
    if (this.validateOnFill && Object.keys(this.validation).length > 0) {
      this.validateAttributes(attributes as Record<string, unknown>, false)
    }

    for (const [key, value] of Object.entries(attributes)) {
      this.setAttribute(key, value)
    }
    return this
  }

  /**
   * Save the model to the database
   *
   * @returns Promise<boolean>
   * @throws {QueryException} If validation fails
   */
  async save(): Promise<boolean> {
    // Validate attributes if rules are defined
    if (Object.keys(this.validation).length > 0) {
      this.validateAttributes(this.attributes, true)
    }

    // Fire events
    if (this.exists) {
      await this.fireModelEvent('updating')
      await this.performUpdate()
      await this.fireModelEvent('updated')
    } else {
      await this.fireModelEvent('creating')
      await this.performInsert()
      await this.fireModelEvent('created')
    }

    // Sync original
    this.syncOriginal()

    return true
  }

  /**
   * Delete the model from database
   *
   * @returns Promise<boolean>
   */
  async delete(): Promise<boolean> {
    if (!this.exists) {
      return false
    }

    await this.fireModelEvent('deleting')

    const table = (this.constructor as typeof Model).table
    const primaryKey = (this.constructor as typeof Model).primaryKey
    const connection = (this.constructor as typeof Model).connection
    const softDeletes = (this.constructor as typeof Model).softDeletes
    const deletedAtColumn = (this.constructor as typeof Model).deletedAtColumn

    if (softDeletes) {
      this.setAttribute(deletedAtColumn, new Date().toISOString())
      await this.save()
      await this.fireModelEvent('deleted')
      return true
    }

    // Sanitize identifiers before use
    const safeTable = QuerySanitizer.sanitizeTableName(table)
    const safePrimaryKey = QuerySanitizer.sanitizeColumnName(primaryKey)

    await Database.delete(
      `DELETE FROM "${safeTable}" WHERE "${safePrimaryKey}" = ?`,
      [this.getAttribute(primaryKey)],
      connection
    )

    this.exists = false

    await this.fireModelEvent('deleted')

    return true
  }

  /**
   * Force delete (hard delete) regardless of soft delete setting
   */
  async forceDelete(): Promise<boolean> {
    if (!this.exists) {
      return false
    }

    const table = (this.constructor as typeof Model).table
    const primaryKey = (this.constructor as typeof Model).primaryKey
    const connection = (this.constructor as typeof Model).connection

    // Sanitize identifiers before use
    const safeTable = QuerySanitizer.sanitizeTableName(table)
    const safePrimaryKey = QuerySanitizer.sanitizeColumnName(primaryKey)

    await Database.delete(
      `DELETE FROM "${safeTable}" WHERE "${safePrimaryKey}" = ?`,
      [this.getAttribute(primaryKey)],
      connection
    )

    this.exists = false
    return true
  }

  /**
   * Restore a soft deleted model
   */
  async restore(): Promise<boolean> {
    const softDeletes = (this.constructor as typeof Model).softDeletes
    if (!softDeletes) {
      throw new Error('Model does not use soft deletes')
    }

    await this.fireModelEvent('restoring')

    const deletedAtColumn = (this.constructor as typeof Model).deletedAtColumn
    this.setAttribute(deletedAtColumn, null)
    await this.save()

    await this.fireModelEvent('restored')
    return true
  }

  /**
   * Refresh the model from database
   *
   * @returns Promise<this>
   */
  async refresh(): Promise<this> {
    const primaryKey = (this.constructor as typeof Model).primaryKey
    const id = this.getAttribute(primaryKey)

    const ctor = this.constructor as ModelConstructor<this>
    const fresh = await ctor.find(id as string | number)

    if (!fresh) {
      throw new Error('Model not found during refresh')
    }

    this.attributes = fresh.attributes
    this.syncOriginal()

    return this
  }

  // ==========================================
  // ATTRIBUTE HANDLING
  // ==========================================

  /**
   * Set an attribute value
   *
   * Calls mutator if defined (setXxxAttribute method)
   *
   * @param key - Attribute name
   * @param value - Attribute value
   */
  setAttribute<K extends keyof TAttributes & string>(key: K, value: TAttributes[K]): void
  setAttribute(key: string, value: unknown): void
  setAttribute(key: string, value: unknown): void {
    // Check for mutator
    const mutator = `set${this.studly(key)}Attribute`
    const mutatorFn = (this as Record<string, unknown>)[mutator]
    if (typeof mutatorFn === 'function') {
      value = (mutatorFn as (value: unknown) => unknown)(value)
    }

    ;(this.attributes as Record<string, unknown>)[key] = value

    const originalValue = (this.original as Record<string, unknown>)[key]
    if (!Object.is(value, originalValue)) {
      this.dirtyAttributes.add(key)
    } else {
      this.dirtyAttributes.delete(key)
    }
  }

  /**
   * Get an attribute value
   *
   * Calls accessor if defined (getXxxAttribute method)
   * Applies casting if defined
   *
   * @param key - Attribute name
   * @returns Attribute value
   */
  getAttribute<K extends keyof TAttributes & string>(key: K): TAttributes[K] | unknown
  getAttribute(key: string): unknown
  getAttribute(key: string): unknown {
    let value = this.attributes[key]

    // Check for accessor
    const accessor = `get${this.studly(key)}Attribute`
    const accessorFn = (this as Record<string, unknown>)[accessor]
    if (typeof accessorFn === 'function') {
      return (accessorFn as (value: unknown) => unknown)(value)
    }

    // Check for cast
    if (this.casts[key]) {
      value = this.castAttribute(key, value)
    }

    return value
  }

  /**
   * Cast an attribute to specified type
   *
   * @param key - Attribute name
   * @param value - Raw value
   * @returns Casted value
   */
  protected castAttribute(key: string, value: unknown): unknown {
    const castType = this.casts[key]

    if (value === null || value === undefined) {
      return null
    }

    switch (castType) {
      case 'int':
      case 'integer':
      case 'number':
        return parseInt(String(value), 10)

      case 'float':
      case 'double':
        return parseFloat(String(value))

      case 'string':
        return String(value)

      case 'bool':
      case 'boolean':
        // Handle SQLite (0/1)
        if (typeof value === 'number') {
          return value === 1
        }
        return Boolean(value)

      case 'date':
      case 'datetime':
      case 'timestamp':
        if (value instanceof Date) {
          return value
        }
        if (typeof value === 'string' || typeof value === 'number') {
          return new Date(value)
        }
        return new Date(String(value))

      case 'json':
      case 'array':
      case 'object':
        return typeof value === 'string' ? JSON.parse(value) as unknown : value

      default:
        return value
    }
  }

  // ==========================================
  // INTERNAL METHODS
  // ==========================================

  /**
   * Perform INSERT query
   */
  protected async performInsert(): Promise<void> {
    const table = (this.constructor as typeof Model).table
    const connection = (this.constructor as typeof Model).connection
    const attributes = this.getAttributesForInsert()

    // Sanitize table name
    const safeTable = QuerySanitizer.sanitizeTableName(table)

    // Build INSERT query with sanitized column names
    const columns = Object.keys(attributes)
    const safeColumns = QuerySanitizer.sanitizeIdentifiers(columns, 'column name')
    const placeholders = safeColumns.map(() => '?').join(', ')
    const columnsList = safeColumns.map((c) => `"${c}"`).join(', ')

    const sql = `INSERT INTO "${safeTable}" (${columnsList}) VALUES (${placeholders})`
    const bindings = Object.values(attributes)

    const insertId = await Database.insert(sql, bindings, connection)

    const primaryKey = (this.constructor as typeof Model).primaryKey
    this.setAttribute(primaryKey, insertId)
    this.exists = true
  }

  /**
   * Perform UPDATE query
   */
  protected async performUpdate(): Promise<void> {
    const table = (this.constructor as typeof Model).table
    const primaryKey = (this.constructor as typeof Model).primaryKey
    const connection = (this.constructor as typeof Model).connection

    const attributes = this.getAttributesForUpdate()

    if (Object.keys(attributes).length === 0) {
      return // Nothing to update
    }

    // Sanitize identifiers
    const safeTable = QuerySanitizer.sanitizeTableName(table)
    const safePrimaryKey = QuerySanitizer.sanitizeColumnName(primaryKey)

    // Build UPDATE query with sanitized column names
    const sets = Object.keys(attributes)
      .map((key) => {
        const safeKey = QuerySanitizer.sanitizeColumnName(key)
        return `"${safeKey}" = ?`
      })
      .join(', ')

    const sql = `UPDATE "${safeTable}" SET ${sets} WHERE "${safePrimaryKey}" = ?`
    const bindings = [...Object.values(attributes), this.getAttribute(primaryKey)]

    await Database.update(sql, bindings, connection)
  }

  /**
   * Get attributes for INSERT
   */
  protected getAttributesForInsert(): Record<string, unknown> {
    const attributes: Record<string, unknown> = { ...this.attributes }

    if ((this.constructor as typeof Model).timestamps) {
      const now = new Date().toISOString()
      const createdAt = (this.constructor as typeof Model).createdAtColumn
      const updatedAt = (this.constructor as typeof Model).updatedAtColumn

      attributes[createdAt] = now
      attributes[updatedAt] = now
    }

    return attributes
  }

  /**
   * Get attributes for UPDATE (only dirty attributes)
   */
  protected getAttributesForUpdate(): Record<string, unknown> {
    const dirty = this.getDirty()

    if ((this.constructor as typeof Model).timestamps) {
      const updatedAt = (this.constructor as typeof Model).updatedAtColumn
      dirty[updatedAt] = new Date().toISOString()
    }

    return dirty
  }

  /**
   * Get dirty (modified) attributes
   */
  protected getDirty(): Record<string, unknown> {
    const dirty: Record<string, unknown> = {}

    for (const key of this.dirtyAttributes) {
      dirty[key] = this.attributes[key]
    }

    return dirty
  }

  /**
   * Check if any attributes are dirty
   */
  isDirty(...attributes: string[]): boolean {
    const dirty = this.getDirty()

    if (attributes.length === 0) {
      return Object.keys(dirty).length > 0
    }

    return attributes.some((attr) => dirty.hasOwnProperty(attr))
  }

  /**
   * Sync original with current attributes
   */
  protected syncOriginal(): void {
    this.original = { ...this.attributes }
    this.dirtyAttributes.clear()
  }

  /**
   * Fire a model event
   */
  protected async fireModelEvent(event: ModelEvent): Promise<void> {
    const method = event as keyof this

    const handler = this[method]
    if (typeof handler === 'function') {
      await (handler as () => unknown).call(this)
    }
  }

  /**
   * Validate attributes with optional partial rules
   */
  protected validateAttributes(attributes: Record<string, unknown>, requireAll: boolean): void {
    if (Object.keys(this.validation).length === 0) {
      return
    }

    const rules = requireAll ? this.validation : this.getRulesForAttributes(attributes)
    if (Object.keys(rules).length === 0) {
      return
    }

    InputValidator.validateOrThrow(attributes, rules)
  }

  /**
   * Get validation rules for specific attributes
   */
  protected getRulesForAttributes(attributes: Record<string, unknown>): ValidationRules {
    const rules: ValidationRules = {}

    for (const key of Object.keys(attributes)) {
      if (this.validation[key]) {
        rules[key] = this.validation[key]
      }
    }

    return rules
  }

  /**
   * Convert snake_case to StudlyCase
   */
  protected studly(str: string): string {
    return str
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')
  }

  // ==========================================
  // SERIALIZATION
  // ==========================================

  /**
   * Convert model to JSON
   */
  toJSON(): Record<string, unknown> {
    const json: Record<string, unknown> = {}

    // Get attributes with accessors applied
    for (const key of Object.keys(this.attributes)) {
      // Skip hidden attributes
      if (this.hidden.includes(key)) {
        continue
      }

      // If visible is set, only include visible attributes
      if (this.visible.length > 0 && !this.visible.includes(key)) {
        continue
      }

      json[key] = this.getAttribute(key)
    }

    // Include relations
    for (const [key, value] of Object.entries(this.relations)) {
      if (Array.isArray(value)) {
        json[key] = value
          .filter((item) => this.isSerializableRelation(item))
          .map((item) => item.toJSON())
      } else if (this.isSerializableRelation(value)) {
        json[key] = value.toJSON()
      }
    }

    return json
  }

  /**
   * Convert model to string (JSON)
   */
  toString(): string {
    return JSON.stringify(this.toJSON(), null, 2)
  }

  /**
   * Set raw attributes from database (internal use)
   */
  setRawAttributes(attributes: DatabaseRow, exists: boolean = true): void {
    this.attributes = { ...attributes } as TAttributes
    this.original = { ...attributes } as TAttributes
    this.exists = exists
  }

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
   * Check if a relation value can be serialized
   */
  private isSerializableRelation(value: unknown): value is { toJSON: () => Record<string, unknown> } {
    if (!value || typeof value !== 'object') {
      return false
    }

    const candidate = value as { toJSON?: unknown }
    return typeof candidate.toJSON === 'function'
  }
}
