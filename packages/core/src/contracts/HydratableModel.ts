/**
 * Hydratable Model Contract
 *
 * Minimal interface required for hydration and eager loading.
 */

import type { DatabaseRow } from '../types'
import type { ModelBase, ModelBaseConstructor } from './ModelBase'

export interface HydratableModel extends ModelBase {
  setRawAttributes(row: DatabaseRow, exists?: boolean): void
}

export interface HydratableModelConstructor extends ModelBaseConstructor {
  new (attributes?: Record<string, unknown>): HydratableModel
}

export const isHydratableModel = (value: unknown): value is HydratableModel => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    typeof record.getRelation === 'function' &&
    typeof record.setRelation === 'function' &&
    typeof record.setRawAttributes === 'function'
  )
}
