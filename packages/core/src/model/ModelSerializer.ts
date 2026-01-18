/**
 * ModelSerializer
 *
 * Handles model serialization with support for:
 * - Hidden attributes (excluded from output)
 * - Visible attributes (whitelist mode)
 * - Relation serialization
 * - Custom serialization hooks
 */

import type { Attributes } from '../contracts/ModelContract'
import type { AttributeBag } from './AttributeBag'

/**
 * Serializable relation interface
 */
export interface Serializable {
  toJSON(): Record<string, unknown>
}

/**
 * Serialization options
 */
export interface SerializationOptions {
  /** Attributes to hide from output */
  hidden?: string[]
  /** Attributes to show (whitelist mode) */
  visible?: string[]
  /** Include relations in output */
  includeRelations?: boolean
  /** Custom attribute transformer */
  transformer?: (key: string, value: unknown) => unknown
}

/**
 * ModelSerializer
 *
 * Separates serialization logic from the Model class.
 * Handles toJSON, toString, and array conversion.
 */
export class ModelSerializer<TAttributes extends Attributes = Attributes> {
  /**
   * Hidden attributes (excluded from serialization)
   */
  private hidden: Set<string>

  /**
   * Visible attributes (if set, only these are included)
   */
  private visible: Set<string>

  /**
   * Custom attribute transformers
   */
  private transformers: Map<string, (value: unknown) => unknown>

  constructor(options: SerializationOptions = {}) {
    this.hidden = new Set(options.hidden ?? [])
    this.visible = new Set(options.visible ?? [])
    this.transformers = new Map()
  }

  // ==========================================
  // CONFIGURATION
  // ==========================================

  /**
   * Hide attributes from serialization
   */
  hide(...keys: string[]): this {
    for (const key of keys) {
      this.hidden.add(key)
    }
    return this
  }

  /**
   * Unhide attributes
   */
  unhide(...keys: string[]): this {
    for (const key of keys) {
      this.hidden.delete(key)
    }
    return this
  }

  /**
   * Set visible attributes (whitelist mode)
   */
  setVisible(...keys: string[]): this {
    this.visible = new Set(keys)
    return this
  }

  /**
   * Clear visible constraint (show all non-hidden)
   */
  clearVisible(): this {
    this.visible.clear()
    return this
  }

  /**
   * Add a custom transformer for an attribute
   */
  transform(key: string, transformer: (value: unknown) => unknown): this {
    this.transformers.set(key, transformer)
    return this
  }

  /**
   * Remove a transformer
   */
  removeTransformer(key: string): this {
    this.transformers.delete(key)
    return this
  }

  // ==========================================
  // SERIALIZATION
  // ==========================================

  /**
   * Serialize attributes to JSON object
   */
  serialize(
    attributes: AttributeBag<TAttributes>,
    relations: Record<string, unknown> = {}
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    // Serialize attributes
    for (const key of attributes.keys()) {
      if (!this.shouldInclude(key)) {
        continue
      }

      let value: unknown = attributes.get(key)

      // Apply custom transformer if defined
      const transformer = this.transformers.get(key)
      if (transformer) {
        value = transformer(value)
      }

      result[key] = this.serializeValue(value)
    }

    // Serialize relations
    for (const [name, value] of Object.entries(relations)) {
      if (!this.shouldInclude(name)) {
        continue
      }
      result[name] = this.serializeRelation(value)
    }

    return result
  }

  /**
   * Serialize to JSON string
   */
  toJSON(
    attributes: AttributeBag<TAttributes>,
    relations: Record<string, unknown> = {}
  ): string {
    return JSON.stringify(this.serialize(attributes, relations))
  }

  /**
   * Pretty print JSON
   */
  toPrettyJSON(
    attributes: AttributeBag<TAttributes>,
    relations: Record<string, unknown> = {},
    indent: number = 2
  ): string {
    return JSON.stringify(this.serialize(attributes, relations), null, indent)
  }

  // ==========================================
  // HELPERS
  // ==========================================

  /**
   * Check if an attribute should be included in output
   */
  private shouldInclude(key: string): boolean {
    // If hidden, exclude
    if (this.hidden.has(key)) {
      return false
    }

    // If visible list is set, only include those
    if (this.visible.size > 0) {
      return this.visible.has(key)
    }

    return true
  }

  /**
   * Serialize a single value
   */
  private serializeValue(value: unknown): unknown {
    // Handle Date objects
    if (value instanceof Date) {
      return value.toISOString()
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item) => this.serializeValue(item))
    }

    // Handle nested objects
    if (value !== null && typeof value === 'object') {
      // Check if it has toJSON method
      if (this.isSerializable(value)) {
        return value.toJSON()
      }

      // Plain object - serialize recursively
      const result: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value)) {
        result[k] = this.serializeValue(v)
      }
      return result
    }

    return value
  }

  /**
   * Serialize a relation value
   */
  private serializeRelation(value: unknown): unknown {
    // Handle array of models
    if (Array.isArray(value)) {
      return value
        .filter((item) => this.isSerializable(item))
        .map((item) => item.toJSON())
    }

    // Handle single model
    if (this.isSerializable(value)) {
      return value.toJSON()
    }

    // Handle Collection
    if (value && typeof value === 'object' && 'toArray' in value) {
      const arr = (value as { toArray: () => unknown[] }).toArray()
      return arr
        .filter((item) => this.isSerializable(item))
        .map((item) => (item as Serializable).toJSON())
    }

    return null
  }

  /**
   * Type guard for serializable objects
   */
  private isSerializable(value: unknown): value is Serializable {
    return (
      value !== null &&
      typeof value === 'object' &&
      'toJSON' in value &&
      typeof (value as Record<string, unknown>).toJSON === 'function'
    )
  }

  // ==========================================
  // CLONING
  // ==========================================

  /**
   * Clone the serializer
   */
  clone(): ModelSerializer<TAttributes> {
    const cloned = new ModelSerializer<TAttributes>()
    cloned.hidden = new Set(this.hidden)
    cloned.visible = new Set(this.visible)
    cloned.transformers = new Map(this.transformers)
    return cloned
  }

  // ==========================================
  // STATIC FACTORY
  // ==========================================

  /**
   * Create with common hidden fields
   */
  static withHidden<T extends Attributes>(...keys: string[]): ModelSerializer<T> {
    return new ModelSerializer<T>({ hidden: keys })
  }

  /**
   * Create with visible whitelist
   */
  static withVisible<T extends Attributes>(...keys: string[]): ModelSerializer<T> {
    return new ModelSerializer<T>({ visible: keys })
  }
}
