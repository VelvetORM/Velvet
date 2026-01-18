/**
 * EventRegistrar
 *
 * Registers lifecycle event handlers from model instance methods.
 */

import type { ModelEvent } from '../../contracts/ModelContract'
import type { ModelEventDispatcher } from '../ModelEventDispatcher'

export class EventRegistrar<TModel extends object> {
  private readonly dispatcher: ModelEventDispatcher<TModel>
  private readonly model: TModel

  constructor(dispatcher: ModelEventDispatcher<TModel>, model: TModel) {
    this.dispatcher = dispatcher
    this.model = model
  }

  register(): void {
    const eventMethods: ModelEvent[] = [
      'creating', 'created', 'updating', 'updated',
      'saving', 'saved', 'deleting', 'deleted',
      'restoring', 'restored'
    ]

    for (const event of eventMethods) {
      const method = Reflect.get(this.model, event)
      if (typeof method === 'function') {
        this.dispatcher.on(event, method.bind(this.model) as () => void | Promise<void>)
      }
    }
  }
}
