/**
 * ModelHydrator
 *
 * Converts raw database rows into model instances.
 */

import type { DatabaseRow } from '../types'
import type { Model, ModelClass } from '../Model'

export class ModelHydrator<T = unknown> {
  private readonly model?: ModelClass<Model>

  constructor(model?: ModelClass<Model>) {
    this.model = model
  }

  hydrate(row: DatabaseRow): T {
    if (!this.model) {
      return row as T
    }

    const instance = new this.model()
    if ('setRawAttributes' in instance) {
      (instance as Model).setRawAttributes(row)
      return instance as T
    }

    return row as T
  }
}
