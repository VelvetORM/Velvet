/**
 * Relation Contract
 *
 * Public interface for relations used by eager loading.
 */

import type { ModelBase } from './ModelBase'

export interface RelationContract<TRelated extends ModelBase = ModelBase> {
  eagerLoadForMany(models: ModelBase[], relationName: string): Promise<void>
  get(): Promise<TRelated | null | TRelated[]>
}
