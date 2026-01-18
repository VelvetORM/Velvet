/**
 * ModelHydrator
 *
 * Converts raw database rows into model instances.
 */

import type { DatabaseRow } from '../types'
import type { HydratableModelConstructor } from '../contracts/HydratableModel'

export class ModelHydrator<T = unknown> {
  private readonly model?: HydratableModelConstructor

  constructor(model?: HydratableModelConstructor) {
    this.model = model
  }

  hydrate(row: DatabaseRow): T {
    if (!this.model) {
      return row as T
    }

    const instance = new this.model()
    instance.setRawAttributes(row)
    return instance as T
  }
}
