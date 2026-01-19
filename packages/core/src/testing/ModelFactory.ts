/**
 * ModelFactory
 *
 * Factory for creating model instances with fake data.
 * Useful for seeding and testing.
 */

import type { Model, ModelConstructor, ModelAttributesOf } from '../Model'

/**
 * Factory definition function
 */
export type FactoryDefinition<T extends Model> = () => Partial<ModelAttributesOf<T>>

/**
 * Factory state modifier
 */
export type FactoryState<T extends Model> = (attributes: Partial<ModelAttributesOf<T>>) => Partial<ModelAttributesOf<T>>

/**
 * Factory configuration
 */
interface FactoryConfig<T extends Model> {
  model: ModelConstructor<T>
  definition: FactoryDefinition<T>
  states: Map<string, FactoryState<T>>
}

/**
 * ModelFactory
 *
 * Creates model instances with fake/default data.
 * Supports states for different scenarios.
 *
 * @example
 * ```typescript
 * // Define factory
 * const userFactory = ModelFactory.define(User, () => ({
 *   name: 'John Doe',
 *   email: `user${Math.random()}@example.com`,
 *   active: true
 * }))
 *   .state('inactive', (attrs) => ({ ...attrs, active: false }))
 *   .state('admin', (attrs) => ({ ...attrs, role: 'admin' }))
 *
 * // Create instances
 * const user = userFactory.make()
 * const inactiveUser = userFactory.state('inactive').make()
 * const admin = userFactory.state('admin').make()
 *
 * // Create and persist
 * const savedUser = await userFactory.create()
 * const savedUsers = await userFactory.createMany(5)
 * ```
 */
export class ModelFactory<T extends Model> {
  private config: FactoryConfig<T>
  private activeStates: string[] = []
  private attributeOverrides: Partial<ModelAttributesOf<T>> = {}

  private constructor(config: FactoryConfig<T>) {
    this.config = config
  }

  /**
   * Define a new factory
   */
  static define<T extends Model>(
    model: ModelConstructor<T>,
    definition: FactoryDefinition<T>
  ): ModelFactory<T> {
    return new ModelFactory({
      model,
      definition,
      states: new Map()
    })
  }

  /**
   * Add a state modifier
   */
  state(name: string, modifier: FactoryState<T>): this {
    this.config.states.set(name, modifier)
    return this
  }

  /**
   * Apply a state for the next make/create call
   */
  withState(name: string): ModelFactory<T> {
    const clone = this.clone()
    clone.activeStates.push(name)
    return clone
  }

  /**
   * Apply multiple states
   */
  withStates(...names: string[]): ModelFactory<T> {
    const clone = this.clone()
    clone.activeStates.push(...names)
    return clone
  }

  /**
   * Override specific attributes for the next make/create call
   */
  withAttributes(attributes: Partial<ModelAttributesOf<T>>): ModelFactory<T> {
    const clone = this.clone()
    clone.attributeOverrides = { ...clone.attributeOverrides, ...attributes }
    return clone
  }

  /**
   * Make a model instance (without persisting)
   */
  make(overrides?: Partial<ModelAttributesOf<T>>): T {
    const attributes = this.buildAttributes(overrides)
    return new this.config.model(attributes)
  }

  /**
   * Make multiple model instances
   */
  makeMany(count: number, overrides?: Partial<ModelAttributesOf<T>>): T[] {
    return Array.from({ length: count }, () => this.make(overrides))
  }

  /**
   * Create and persist a model instance
   */
  async create(overrides?: Partial<ModelAttributesOf<T>>): Promise<T> {
    const instance = this.make(overrides)
    await instance.save()
    return instance
  }

  /**
   * Create and persist multiple model instances
   */
  async createMany(count: number, overrides?: Partial<ModelAttributesOf<T>>): Promise<T[]> {
    const instances = this.makeMany(count, overrides)
    await Promise.all(instances.map((i) => i.save()))
    return instances
  }

  /**
   * Get raw attributes without creating a model
   */
  raw(overrides?: Partial<ModelAttributesOf<T>>): Partial<ModelAttributesOf<T>> {
    return this.buildAttributes(overrides)
  }

  /**
   * Build attributes with definition, states, and overrides applied
   */
  private buildAttributes(overrides?: Partial<ModelAttributesOf<T>>): Partial<ModelAttributesOf<T>> {
    // Start with base definition
    let attributes = this.config.definition()

    // Apply active states
    for (const stateName of this.activeStates) {
      const stateModifier = this.config.states.get(stateName)
      if (stateModifier) {
        attributes = stateModifier(attributes)
      }
    }

    // Apply instance overrides
    attributes = { ...attributes, ...this.attributeOverrides }

    // Apply call-time overrides
    if (overrides) {
      attributes = { ...attributes, ...overrides }
    }

    return attributes
  }

  /**
   * Clone the factory with current configuration
   */
  private clone(): ModelFactory<T> {
    const clone = new ModelFactory(this.config)
    clone.activeStates = [...this.activeStates]
    clone.attributeOverrides = { ...this.attributeOverrides }
    return clone
  }
}

/**
 * Factory registry for managing multiple factories
 */
export class FactoryRegistry {
  private static factories: Map<string, ModelFactory<Model>> = new Map()

  /**
   * Register a factory
   */
  static register<T extends Model>(name: string, factory: ModelFactory<T>): void {
    this.factories.set(name, factory as ModelFactory<Model>)
  }

  /**
   * Get a registered factory
   */
  static get<T extends Model>(name: string): ModelFactory<T> | undefined {
    return this.factories.get(name) as ModelFactory<T> | undefined
  }

  /**
   * Check if a factory is registered
   */
  static has(name: string): boolean {
    return this.factories.has(name)
  }

  /**
   * Clear all registered factories
   */
  static clear(): void {
    this.factories.clear()
  }
}
