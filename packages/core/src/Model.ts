/**
 * Base Model Class
 *
 * Active Record implementation for Velvet ORM.
 * Models extend this class to gain database interaction capabilities.
 */

import { Builder } from './Builder'
import { Database } from './Database'
import type { ModelCasts, ModelAttributes, ModelEvent, Constructor } from './types'
import { QuerySanitizer } from './support/QuerySanitizer'
import { InputValidator, type ValidationRules } from './support/InputValidator'

type ModelConstructor<T extends Model> = Constructor<T> & typeof Model

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
export abstract class Model {
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

  // ==========================================
  // INSTANCE PROPERTIES
  // ==========================================

  /**
   * Model attributes (database columns)
   * @protected
   */
  protected attributes: ModelAttributes = {}

  /**
   * Original attributes (for dirty checking)
   * @protected
   */
  protected original: ModelAttributes = {}

  /**
   * Dirty attributes tracking (changed keys)
   * @protected
   */
  protected dirtyAttributes: Set<string> = new Set()

  /**
   * Loaded relationships
   * @protected
   */
  protected relations: Record<string, any> = {}

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

  // ==========================================
  // CONSTRUCTOR
  // ==========================================

  /**
   * Create a new model instance
   *
   * @param attributes - Initial attributes
   */
  constructor(attributes: Partial<ModelAttributes> = {}) {
    this.fill(attributes as Partial<this>)
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
    return new Builder<T>(this, (this as any).connection)
  }

  /**
   * Add a basic WHERE clause
   */
  static where<T extends Model>(
    this: ModelConstructor<T>,
    column: string,
    operator?: any,
    value?: any
  ): Builder<T> {
    return this.query().where(column, operator, value)
  }

  /**
   * Find a model by primary key
   */
  static async find<T extends Model>(
    this: ModelConstructor<T>,
    id: string | number
  ): Promise<T | null> {
    return this.query().find(id, (this as any).primaryKey)
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
    return this.query().findOrFail(id, (this as any).primaryKey)
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
    attributes: Partial<T>
  ): Promise<T> {
    const instance = new (this as Constructor<T>)(attributes)
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

  // ==========================================
  // INSTANCE METHODS
  // ==========================================

  /**
   * Fill model with attributes
   *
   * @param attributes - Attributes to fill
   * @returns this
   */
  fill(attributes: Partial<this>): this {
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
      InputValidator.validateOrThrow(this.attributes, this.validation)
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
   * Refresh the model from database
   *
   * @returns Promise<this>
   */
  async refresh(): Promise<this> {
    const primaryKey = (this.constructor as typeof Model).primaryKey
    const id = this.getAttribute(primaryKey)

    const fresh = await (this.constructor as any).find(id)

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
  setAttribute(key: string, value: any): void {
    // Check for mutator
    const mutator = `set${this.studly(key)}Attribute`
    if (typeof (this as any)[mutator] === 'function') {
      value = (this as any)[mutator](value)
    }

    this.attributes[key] = value

    const originalValue = this.original[key]
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
  getAttribute(key: string): any {
    let value = this.attributes[key]

    // Check for accessor
    const accessor = `get${this.studly(key)}Attribute`
    if (typeof (this as any)[accessor] === 'function') {
      return (this as any)[accessor](value)
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
  protected castAttribute(key: string, value: any): any {
    const castType = this.casts[key]

    if (value === null || value === undefined) {
      return null
    }

    switch (castType) {
      case 'int':
      case 'integer':
      case 'number':
        return parseInt(value, 10)

      case 'float':
      case 'double':
        return parseFloat(value)

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
        return value instanceof Date ? value : new Date(value)

      case 'json':
      case 'array':
      case 'object':
        return typeof value === 'string' ? JSON.parse(value) : value

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
  protected getAttributesForInsert(): Record<string, any> {
    const attributes = { ...this.attributes }

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
  protected getAttributesForUpdate(): Record<string, any> {
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
  protected getDirty(): Record<string, any> {
    const dirty: Record<string, any> = {}

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

    if (typeof this[method] === 'function') {
      await (this[method] as any).call(this)
    }
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
  toJSON(): Record<string, any> {
    const json: Record<string, any> = {}

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
        json[key] = value.map((item) => item.toJSON())
      } else if (value) {
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
}
