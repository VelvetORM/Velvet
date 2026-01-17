/**
 * LRU Cache
 *
 * Least Recently Used cache implementation for query compilation caching.
 */

/**
 * LRU Cache
 *
 * Simple LRU cache with maximum size limit.
 *
 * @example
 * ```typescript
 * const cache = new LRUCache<string, CompiledQuery>(100)
 * cache.set('key', value)
 * const value = cache.get('key')
 * ```
 */
export class LRUCache<K, V> {
  /**
   * Internal cache storage
   */
  private cache: Map<K, V>

  /**
   * Maximum cache size
   */
  private maxSize: number

  /**
   * Cache hits (for statistics)
   */
  private hits: number = 0

  /**
   * Cache misses (for statistics)
   */
  private misses: number = 0

  /**
   * Create a new LRU cache
   *
   * @param maxSize - Maximum number of items in cache
   */
  constructor(maxSize: number = 100) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  /**
   * Get a value from cache
   *
   * @param key - Cache key
   * @returns Cached value or undefined
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key)

    if (value === undefined) {
      this.misses++
      return undefined
    }

    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, value)

    this.hits++
    return value
  }

  /**
   * Set a value in cache
   *
   * @param key - Cache key
   * @param value - Value to cache
   */
  set(key: K, value: V): void {
    // Delete if exists (to move to end)
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    // Add to end
    this.cache.set(key, value)

    // Evict oldest if over limit
    if (this.cache.size > this.maxSize) {
      const first = this.cache.keys().next()
      if (!first.done) {
        this.cache.delete(first.value)
      }
    }
  }

  /**
   * Check if key exists in cache
   *
   * @param key - Cache key
   * @returns True if key exists
   */
  has(key: K): boolean {
    return this.cache.has(key)
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
  }

  /**
   * Get cache size
   *
   * @returns Number of items in cache
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Get cache hit rate
   *
   * @returns Hit rate between 0 and 1
   */
  hitRate(): number {
    const total = this.hits + this.misses
    return total === 0 ? 0 : this.hits / total
  }

  /**
   * Get cache statistics
   *
   * @returns Cache statistics
   */
  stats(): { hits: number; misses: number; hitRate: number; size: number } {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hitRate(),
      size: this.cache.size
    }
  }
}
