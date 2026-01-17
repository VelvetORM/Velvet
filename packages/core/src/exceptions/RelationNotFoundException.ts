import { VelvetException } from './VelvetException'

/**
 * Relation Not Found Exception
 *
 * Thrown when trying to access a relation that doesn't exist on a model.
 *
 * @example
 * ```typescript
 * throw new RelationNotFoundException('User', 'posts')
 * // Output: Relation [posts] does not exist on model [User]
 * ```
 */
export class RelationNotFoundException extends VelvetException {
  /**
   * Model class name
   */
  public model: string

  /**
   * Relation name that was not found
   */
  public relation: string

  constructor(model: string, relation: string) {
    const message = `Relation [${relation}] does not exist on model [${model}]`
    super(message, 'RELATION_NOT_FOUND', { model, relation })
    this.model = model
    this.relation = relation
  }
}
