/**
 * AttributeBag
 *
 * Manages model attributes with:
 * - Type-safe get/set operations
 * - Dirty tracking (what changed since last sync)
 * - Attribute casting (string -> Date, number, boolean, etc.)
 * - Mutators and accessors support
 *
 * This class is immutable-friendly: original values are preserved
 * until explicitly synced.
 */

import type { Attributes, CastType } from '../contracts/ModelContract'

/**
 * Cast configuration map
 */
export type CastMap = Record<string, CastType>

/**
 * Mutator registry - functions that transform values before setting
 */
export type MutatorRegistry = Record<string, (value: unknown) => unknown>

/**
 * Accessor registry - functions that transform values when getting
 */
export type AccessorRegistry = Record<string, (value: unknown) => unknown>

/**
 * AttributeBag configuration
 */
export interface AttributeBagConfig {
  /** Initial attributes */
  attributes?: Attributes
  /** Cast definitions */
  casts?: CastMap
  /** Mutator functions */
  mutators?: MutatorRegistry
  /** Accessor functions */
  accessors?: AccessorRegistry
  /** Whether model exists in database */
  exists?: boolean
}

/**
 * AttributeBag
 *
 * Encapsulates attribute management for models.
 * Provides clean separation between current state, original state,
 * and dirty tracking.
 */
export class AttributeBag<TAttributes extends Attributes = Attributes> {
  /**
   * Current attribute values
   */
  private current: TAttributes

  /**
   * Original attribute values (from database or last sync)
   */
  private original: TAttributes

  /**
   * Set of dirty attribute keys
   */
  private dirty: Set<string>

  /**
   * Cast type definitions
   */
  private readonly casts: CastMap

  /**
   * Mutator functions (transform on set)
   */
  private readonly mutators: MutatorRegistry

  /**
   * Accessor functions (transform on get)
   */
  private readonly accessors: AccessorRegistry

  constructor(config: AttributeBagConfig = {}) {
    this.current = (config.attributes ?? {}) as TAttributes
    this.original = config.exists ? { ...this.current } : ({} as TAttributes)
    this.dirty = config.exists ? new Set() : new Set(Object.keys(this.current))
    this.casts = config.casts ?? {}
    this.mutators = config.mutators ?? {}
    this.accessors = config.accessors ?? {}
  }

  // ==========================================
  // GETTERS
  // ==========================================

  /**
   * Get an attribute value with casting and accessors applied
   */
  get<K extends keyof TAttributes>(key: K): TAttributes[K]
  get(key: string): unknown
  get(key: string): unknown {
    let value = this.current[key]

    // Apply accessor if defined
    const accessor = this.accessors[key]
    if (accessor) {
      return accessor(value)
    }

    // Apply casting if defined
    if (this.casts[key]) {
      value = this.cast(key, value)
    }

    return value
  }

  /**
   * Get raw attribute value (no casting or accessors)
   */
  getRaw<K extends keyof TAttributes>(key: K): TAttributes[K]
  getRaw(key: string): unknown
  getRaw(key: string): unknown {
    return this.current[key]
  }

  /**
   * Get all current attributes
   */
  all(): Readonly<TAttributes> {
    return { ...this.current }
  }

  /**
   * Get all raw attributes (no casting)
   */
  allRaw(): Readonly<TAttributes> {
    return { ...this.current }
  }

  /**
   * Get original attribute value
   */
  getOriginal<K extends keyof TAttributes>(key: K): TAttributes[K]
  getOriginal(key: string): unknown
  getOriginal(key: string): unknown {
    return this.original[key]
  }

  /**
   * Get all original attributes
   */
  allOriginal(): Readonly<TAttributes> {
    return { ...this.original }
  }

  // ==========================================
  // SETTERS
  // ==========================================

  /**
   * Set an attribute value with mutator applied
   */
  set<K extends keyof TAttributes>(key: K, value: TAttributes[K]): void
  set(key: string, value: unknown): void
  set(key: string, value: unknown): void {
    // Apply mutator if defined
    const mutator = this.mutators[key]
    if (mutator) {
      value = mutator(value)
    }

    // Set the value
    ;(this.current as Record<string, unknown>)[key] = value

    // Track dirty state
    this.updateDirtyState(key)
  }

  /**
   * Set raw attribute value (no mutator)
   */
  setRaw<K extends keyof TAttributes>(key: K, value: TAttributes[K]): void
  setRaw(key: string, value: unknown): void
  setRaw(key: string, value: unknown): void {
    ;(this.current as Record<string, unknown>)[key] = value
    this.updateDirtyState(key)
  }

  /**
   * Fill multiple attributes at once
   */
  fill(attributes: Partial<TAttributes>): void {
    for (const [key, value] of Object.entries(attributes)) {
      this.set(key, value)
    }
  }

  /**
   * Fill raw (no mutators)
   */
  fillRaw(attributes: Partial<TAttributes>): void {
    for (const [key, value] of Object.entries(attributes)) {
      this.setRaw(key, value)
    }
  }

  // ==========================================
  // DIRTY TRACKING
  // ==========================================

  /**
   * Check if any attributes are dirty
   */
  isDirty(): boolean
  isDirty(...keys: string[]): boolean
  isDirty(...keys: string[]): boolean {
    if (keys.length === 0) {
      return this.dirty.size > 0
    }
    return keys.some((key) => this.dirty.has(key))
  }

  /**
   * Check if specific attributes are clean (not dirty)
   */
  isClean(): boolean
  isClean(...keys: string[]): boolean
  isClean(...keys: string[]): boolean {
    return !this.isDirty(...keys)
  }

  /**
   * Get all dirty attributes
   */
  getDirty(): Partial<TAttributes> {
    const dirty: Partial<TAttributes> = {}
    for (const key of this.dirty) {
      ;(dirty as Record<string, unknown>)[key] = this.current[key]
    }
    return dirty
  }

  /**
   * Get dirty attribute keys
   */
  getDirtyKeys(): string[] {
    return Array.from(this.dirty)
  }

  /**
   * Get changes (old value -> new value)
   */
  getChanges(): Record<string, { old: unknown; new: unknown }> {
    const changes: Record<string, { old: unknown; new: unknown }> = {}
    for (const key of this.dirty) {
      changes[key] = {
        old: this.original[key],
        new: this.current[key]
      }
    }
    return changes
  }

  /**
   * Sync original with current (mark all as clean)
   */
  sync(): void {
    this.original = { ...this.current }
    this.dirty.clear()
  }

  /**
   * Reset current to original (discard changes)
   */
  reset(): void {
    this.current = { ...this.original }
    this.dirty.clear()
  }

  /**
   * Update dirty state for a key
   */
  private updateDirtyState(key: string): void {
    const currentValue = this.current[key]
    const originalValue = this.original[key]

    if (Object.is(currentValue, originalValue)) {
      this.dirty.delete(key)
    } else {
      this.dirty.add(key)
    }
  }

  // ==========================================
  // EXISTENCE
  // ==========================================

  /**
   * Check if attribute exists
   */
  has(key: string): boolean {
    return key in this.current
  }

  /**
   * Check if attribute has a non-null value
   */
  hasValue(key: string): boolean {
    const value = this.current[key]
    return value !== null && value !== undefined
  }

  /**
   * Get attribute keys
   */
  keys(): string[] {
    return Object.keys(this.current)
  }

  // ==========================================
  // CASTING
  // ==========================================

  /**
   * Cast a value to the specified type
   */
  private cast(key: string, value: unknown): unknown {
    const castType = this.casts[key]

    if (value === null || value === undefined) {
      return null
    }

    switch (castType) {
      case 'int':
      case 'integer':
        return this.castToInteger(value)

      case 'number':
      case 'float':
      case 'double':
        return this.castToFloat(value)

      case 'string':
        return String(value)

      case 'bool':
      case 'boolean':
        return this.castToBoolean(value)

      case 'date':
      case 'datetime':
      case 'timestamp':
        return this.castToDate(value)

      case 'json':
      case 'array':
      case 'object':
        return this.castToJson(value)

      default:
        return value
    }
  }

  private castToInteger(value: unknown): number {
    if (typeof value === 'number') {
      return Math.trunc(value)
    }
    return parseInt(String(value), 10) || 0
  }

  private castToFloat(value: unknown): number {
    if (typeof value === 'number') {
      return value
    }
    return parseFloat(String(value)) || 0
  }

  private castToBoolean(value: unknown): boolean {
    // Handle SQLite (0/1)
    if (typeof value === 'number') {
      return value !== 0
    }
    // Handle string representations
    if (typeof value === 'string') {
      const lower = value.toLowerCase()
      return lower === 'true' || lower === '1' || lower === 'yes'
    }
    return Boolean(value)
  }

  private castToDate(value: unknown): Date {
    if (value instanceof Date) {
      return value
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return new Date(value)
    }
    return new Date(String(value))
  }

  private castToJson(value: unknown): unknown {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    }
    return value
  }

  // ==========================================
  // SERIALIZATION
  // ==========================================

  /**
   * Convert to plain object (applies accessors and casts)
   */
  toObject(): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(this.current)) {
      result[key] = this.get(key)
    }
    return result
  }

  /**
   * Convert to JSON string
   */
  toJSON(): string {
    return JSON.stringify(this.toObject())
  }

  // ==========================================
  // CLONING
  // ==========================================

  /**
   * Clone the attribute bag
   */
  clone(): AttributeBag<TAttributes> {
    const cloned = new AttributeBag<TAttributes>({
      attributes: { ...this.current },
      casts: { ...this.casts },
      mutators: { ...this.mutators },
      accessors: { ...this.accessors },
      exists: true
    })
    cloned.original = { ...this.original }
    cloned.dirty = new Set(this.dirty)
    return cloned
  }

  // ==========================================
  // STATIC FACTORY
  // ==========================================

  /**
   * Create from database row
   */
  static fromDatabase<T extends Attributes>(
    row: Record<string, unknown>,
    config: Omit<AttributeBagConfig, 'attributes' | 'exists'> = {}
  ): AttributeBag<T> {
    return new AttributeBag<T>({
      ...config,
      attributes: row as T,
      exists: true
    })
  }

  /**
   * Create empty bag
   */
  static empty<T extends Attributes>(
    config: Omit<AttributeBagConfig, 'attributes'> = {}
  ): AttributeBag<T> {
    return new AttributeBag<T>({
      ...config,
      attributes: {} as T,
      exists: false
    })
  }
}
