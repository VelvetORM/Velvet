import { VelvetException } from './VelvetException'

/**
 * Model Not Found Exception
 *
 * Thrown when a model cannot be found (e.g., findOrFail).
 *
 * @example
 * ```typescript
 * throw new ModelNotFoundException('User', 123)
 * // Output: Model [User] with id [123] not found
 * ```
 */
export class ModelNotFoundException extends VelvetException {
  /**
   * Model class name
   */
  public model: string

  /**
   * ID that was not found
   */
  public id?: string | number

  constructor(model: string, id?: string | number) {
    const message = id
      ? `Model [${model}] with id [${id}] not found`
      : `Model [${model}] not found`

    super(message, 'MODEL_NOT_FOUND', { model, id })
    this.model = model
    this.id = id
  }
}
