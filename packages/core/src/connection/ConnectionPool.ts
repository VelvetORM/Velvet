/**
 * Connection Pool
 *
 * Generic async pool for database drivers.
 */

import type { PoolConfig } from '../types'

type PoolFactory<T> = () => Promise<T>
type PoolDestroy<T> = (resource: T) => Promise<void>

export class ConnectionPool<T> {
  private available: T[] = []
  private inUse: Set<T> = new Set()
  private pending: Array<(resource: T) => void> = []
  private max: number
  private create: PoolFactory<T>
  private destroy?: PoolDestroy<T>

  constructor(config: PoolConfig, create: PoolFactory<T>, destroy?: PoolDestroy<T>) {
    this.max = config.max ?? 10
    this.create = create
    this.destroy = destroy
  }

  /**
   * Acquire a resource from the pool
   */
  async acquire(): Promise<T> {
    if (this.available.length > 0) {
      const resource = this.available.shift() as T
      this.inUse.add(resource)
      return resource
    }

    if (this.inUse.size + this.available.length < this.max) {
      const resource = await this.create()
      this.inUse.add(resource)
      return resource
    }

    return new Promise<T>((resolve) => {
      this.pending.push(resolve)
    })
  }

  /**
   * Release a resource back to the pool
   */
  release(resource: T): void {
    if (!this.inUse.has(resource)) {
      return
    }

    this.inUse.delete(resource)

    if (this.pending.length > 0) {
      const next = this.pending.shift()
      if (next) {
        this.inUse.add(resource)
        next(resource)
        return
      }
    }

    this.available.push(resource)
  }

  /**
   * Drain the pool and destroy all resources
   */
  async drain(): Promise<void> {
    const resources = [...this.available, ...this.inUse]
    this.available = []
    this.inUse.clear()
    this.pending = []

    if (this.destroy) {
      for (const resource of resources) {
        await this.destroy(resource)
      }
    }
  }

  /**
   * Pool size (available + in use)
   */
  size(): number {
    return this.available.length + this.inUse.size
  }

  /**
   * Number of idle resources
   */
  idle(): number {
    return this.available.length
  }

  /**
   * Number of in-use resources
   */
  active(): number {
    return this.inUse.size
  }
}
