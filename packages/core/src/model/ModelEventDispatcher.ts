/**
 * ModelEventDispatcher
 *
 * Handles model lifecycle events with support for:
 * - Multiple listeners per event
 * - Async event handlers
 * - Event propagation control
 * - Type-safe event definitions
 */

import type { ModelEvent, ModelEventHandler } from '../contracts/ModelContract'

/**
 * Event handler priority
 */
export type EventPriority = 'low' | 'normal' | 'high'

/**
 * Registered event handler with metadata
 */
interface RegisteredHandler<T> {
  handler: ModelEventHandler<T>
  priority: EventPriority
  once: boolean
}

/**
 * Event dispatch result
 */
export interface EventDispatchResult {
  /** Whether all handlers succeeded */
  success: boolean
  /** Whether propagation was stopped */
  stopped: boolean
  /** Any errors that occurred */
  errors: Error[]
}

/**
 * ModelEventDispatcher
 *
 * Separates event handling from the Model class.
 * Provides a clean, type-safe event system.
 */
export class ModelEventDispatcher<TModel = unknown> {
  /**
   * Registered event handlers
   */
  private handlers: Map<ModelEvent, RegisteredHandler<TModel>[]>

  /**
   * Global handlers (called for all events)
   */
  private globalHandlers: RegisteredHandler<TModel>[]

  /**
   * Whether events are currently muted
   */
  private muted: boolean

  constructor() {
    this.handlers = new Map()
    this.globalHandlers = []
    this.muted = false
  }

  // ==========================================
  // REGISTRATION
  // ==========================================

  /**
   * Register an event handler
   */
  on(
    event: ModelEvent,
    handler: ModelEventHandler<TModel>,
    priority: EventPriority = 'normal'
  ): this {
    const handlers = this.handlers.get(event) ?? []
    handlers.push({ handler, priority, once: false })
    this.handlers.set(event, this.sortByPriority(handlers))
    return this
  }

  /**
   * Register a one-time event handler
   */
  once(
    event: ModelEvent,
    handler: ModelEventHandler<TModel>,
    priority: EventPriority = 'normal'
  ): this {
    const handlers = this.handlers.get(event) ?? []
    handlers.push({ handler, priority, once: true })
    this.handlers.set(event, this.sortByPriority(handlers))
    return this
  }

  /**
   * Register a global handler (called for all events)
   */
  onAny(
    handler: ModelEventHandler<TModel>,
    priority: EventPriority = 'normal'
  ): this {
    this.globalHandlers.push({ handler, priority, once: false })
    this.globalHandlers = this.sortByPriority(this.globalHandlers)
    return this
  }

  /**
   * Remove an event handler
   */
  off(event: ModelEvent, handler?: ModelEventHandler<TModel>): this {
    if (!handler) {
      // Remove all handlers for this event
      this.handlers.delete(event)
      return this
    }

    const handlers = this.handlers.get(event)
    if (handlers) {
      const filtered = handlers.filter((h) => h.handler !== handler)
      if (filtered.length > 0) {
        this.handlers.set(event, filtered)
      } else {
        this.handlers.delete(event)
      }
    }
    return this
  }

  /**
   * Remove all handlers
   */
  removeAll(): this {
    this.handlers.clear()
    this.globalHandlers = []
    return this
  }

  // ==========================================
  // DISPATCHING
  // ==========================================

  /**
   * Dispatch an event to all registered handlers
   */
  async dispatch(event: ModelEvent, model: TModel): Promise<EventDispatchResult> {
    if (this.muted) {
      return { success: true, stopped: false, errors: [] }
    }

    const result: EventDispatchResult = {
      success: true,
      stopped: false,
      errors: []
    }

    // Get handlers for this event
    const eventHandlers = this.handlers.get(event) ?? []
    const allHandlers = [...this.globalHandlers, ...eventHandlers]

    // Track handlers to remove (once handlers)
    const toRemove: RegisteredHandler<TModel>[] = []

    // Execute handlers
    for (const registered of allHandlers) {
      try {
        await registered.handler(model)

        if (registered.once) {
          toRemove.push(registered)
        }
      } catch (error) {
        result.success = false
        result.errors.push(error instanceof Error ? error : new Error(String(error)))
      }
    }

    // Remove one-time handlers
    for (const registered of toRemove) {
      this.removeHandler(event, registered)
    }

    return result
  }

  /**
   * Dispatch event synchronously (for simple handlers)
   */
  dispatchSync(event: ModelEvent, model: TModel): void {
    if (this.muted) {
      return
    }

    const eventHandlers = this.handlers.get(event) ?? []
    const allHandlers = [...this.globalHandlers, ...eventHandlers]

    for (const registered of allHandlers) {
      registered.handler(model)
    }
  }

  // ==========================================
  // CONTROL
  // ==========================================

  /**
   * Mute all events (handlers won't be called)
   */
  mute(): this {
    this.muted = true
    return this
  }

  /**
   * Unmute events
   */
  unmute(): this {
    this.muted = false
    return this
  }

  /**
   * Execute callback with events muted
   */
  async withoutEvents<T>(callback: () => Promise<T>): Promise<T> {
    const wasMuted = this.muted
    this.muted = true
    try {
      return await callback()
    } finally {
      this.muted = wasMuted
    }
  }

  /**
   * Check if muted
   */
  isMuted(): boolean {
    return this.muted
  }

  // ==========================================
  // INSPECTION
  // ==========================================

  /**
   * Check if event has handlers
   */
  hasListeners(event: ModelEvent): boolean {
    const handlers = this.handlers.get(event)
    return (handlers && handlers.length > 0) || this.globalHandlers.length > 0
  }

  /**
   * Get handler count for an event
   */
  listenerCount(event: ModelEvent): number {
    const handlers = this.handlers.get(event) ?? []
    return handlers.length + this.globalHandlers.length
  }

  /**
   * Get all registered events
   */
  getRegisteredEvents(): ModelEvent[] {
    return Array.from(this.handlers.keys())
  }

  // ==========================================
  // HELPERS
  // ==========================================

  /**
   * Sort handlers by priority
   */
  private sortByPriority(
    handlers: RegisteredHandler<TModel>[]
  ): RegisteredHandler<TModel>[] {
    const priorityOrder: Record<EventPriority, number> = {
      high: 0,
      normal: 1,
      low: 2
    }
    return handlers.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  }

  /**
   * Remove a specific handler
   */
  private removeHandler(event: ModelEvent, registered: RegisteredHandler<TModel>): void {
    // Remove from event handlers
    const eventHandlers = this.handlers.get(event)
    if (eventHandlers) {
      const filtered = eventHandlers.filter((h) => h !== registered)
      if (filtered.length > 0) {
        this.handlers.set(event, filtered)
      } else {
        this.handlers.delete(event)
      }
    }

    // Remove from global handlers
    this.globalHandlers = this.globalHandlers.filter((h) => h !== registered)
  }

  // ==========================================
  // CLONING
  // ==========================================

  /**
   * Clone the dispatcher (without handlers)
   */
  clone(): ModelEventDispatcher<TModel> {
    return new ModelEventDispatcher<TModel>()
  }

  /**
   * Clone with handlers
   */
  cloneWithHandlers(): ModelEventDispatcher<TModel> {
    const cloned = new ModelEventDispatcher<TModel>()
    for (const [event, handlers] of this.handlers) {
      cloned.handlers.set(event, [...handlers])
    }
    cloned.globalHandlers = [...this.globalHandlers]
    cloned.muted = this.muted
    return cloned
  }
}

/**
 * Create event handler shortcuts for common patterns
 */
export const ModelEvents = {
  /**
   * Create handlers object from method definitions
   */
  define<T>(handlers: Partial<Record<ModelEvent, ModelEventHandler<T>>>): Partial<Record<ModelEvent, ModelEventHandler<T>>> {
    return handlers
  },

  /**
   * All lifecycle events in order
   */
  lifecycle: [
    'creating',
    'created',
    'updating',
    'updated',
    'saving',
    'saved',
    'deleting',
    'deleted',
    'restoring',
    'restored'
  ] as const
}
