/**
 * Collection Helper
 *
 * Laravel-inspired collection class for working with arrays of data.
 * Provides fluent, chainable methods for array manipulation.
 *
 * @example
 * ```typescript
 * const users = await User.all()
 * const names = users.pluck('name')
 * const grouped = users.groupBy('role')
 * const active = users.where('active', true)
 * ```
 */
export class Collection<T> implements Iterable<T> {
  /**
   * The underlying items
   */
  protected items: T[]

  /**
   * Create a new Collection instance
   */
  constructor(items: T[] | Iterable<T> = []) {
    this.items = Array.isArray(items) ? items : Array.from(items)
  }

  /**
   * Create a Collection from an array or iterable
   */
  static from<T>(items: T[] | Iterable<T>): Collection<T> {
    return new Collection(items)
  }

  /**
   * Create an empty Collection
   */
  static empty<T>(): Collection<T> {
    return new Collection<T>()
  }

  /**
   * Create a Collection with a range of numbers
   */
  static range(start: number, end: number): Collection<number> {
    const items: number[] = []
    for (let i = start; i <= end; i++) {
      items.push(i)
    }
    return new Collection(items)
  }

  /**
   * Make iterable
   */
  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]()
  }

  /**
   * Get the length of the collection
   */
  get length(): number {
    return this.items.length
  }

  // ==========================================
  // RETRIEVAL METHODS
  // ==========================================

  /**
   * Get the first item
   */
  first(): T | undefined {
    return this.items[0]
  }

  /**
   * Get the first item or throw
   */
  firstOrFail(): T {
    if (this.items.length === 0) {
      throw new Error('Collection is empty')
    }
    return this.items[0]
  }

  /**
   * Get the last item
   */
  last(): T | undefined {
    return this.items[this.items.length - 1]
  }

  /**
   * Get item at index
   */
  get(index: number): T | undefined {
    return this.items[index]
  }

  /**
   * Get item at index (alias)
   */
  at(index: number): T | undefined {
    return this.items.at(index)
  }

  /**
   * Find first item matching callback
   */
  find(callback: (item: T, index: number) => boolean): T | undefined {
    return this.items.find(callback)
  }

  // ==========================================
  // EXTRACTION METHODS
  // ==========================================

  /**
   * Extract values for a given key
   *
   * @example
   * ```typescript
   * const names = users.pluck('name') // Collection<string>
   * ```
   */
  pluck<K extends keyof T>(key: K): Collection<T[K]> {
    return new Collection(this.items.map((item) => item[key]))
  }

  /**
   * Extract key-value pairs into a Map
   *
   * @example
   * ```typescript
   * const idToName = users.pluckMap('id', 'name') // Map<number, string>
   * ```
   */
  pluckMap<K extends keyof T, V extends keyof T>(keyField: K, valueField: V): Map<T[K], T[V]> {
    const map = new Map<T[K], T[V]>()
    for (const item of this.items) {
      map.set(item[keyField], item[valueField])
    }
    return map
  }

  /**
   * Get only specified keys from each item
   */
  only<K extends keyof T>(...keys: K[]): Collection<Pick<T, K>> {
    return new Collection(
      this.items.map((item) => {
        const result = {} as Pick<T, K>
        for (const key of keys) {
          result[key] = item[key]
        }
        return result
      })
    )
  }

  /**
   * Get all keys except specified from each item
   */
  except<K extends keyof T>(...keys: K[]): Collection<Omit<T, K>> {
    return new Collection(
      this.items.map((item) => {
        const result = { ...item }
        for (const key of keys) {
          delete result[key]
        }
        return result as Omit<T, K>
      })
    )
  }

  // ==========================================
  // GROUPING & INDEXING
  // ==========================================

  /**
   * Group items by a key
   *
   * @example
   * ```typescript
   * const byRole = users.groupBy('role') // Map<string, Collection<User>>
   * ```
   */
  groupBy<K extends keyof T>(key: K): Map<T[K], Collection<T>> {
    const groups = new Map<T[K], Collection<T>>()

    for (const item of this.items) {
      const groupKey = item[key]
      if (!groups.has(groupKey)) {
        groups.set(groupKey, new Collection())
      }
      groups.get(groupKey)!.push(item)
    }

    return groups
  }

  /**
   * Group items by callback result
   */
  groupByFn<K>(callback: (item: T) => K): Map<K, Collection<T>> {
    const groups = new Map<K, Collection<T>>()

    for (const item of this.items) {
      const groupKey = callback(item)
      if (!groups.has(groupKey)) {
        groups.set(groupKey, new Collection())
      }
      groups.get(groupKey)!.push(item)
    }

    return groups
  }

  /**
   * Key the collection by a field
   *
   * @example
   * ```typescript
   * const usersById = users.keyBy('id') // Map<number, User>
   * ```
   */
  keyBy<K extends keyof T>(key: K): Map<T[K], T> {
    const map = new Map<T[K], T>()
    for (const item of this.items) {
      map.set(item[key], item)
    }
    return map
  }

  // ==========================================
  // FILTERING
  // ==========================================

  /**
   * Filter and return a new Collection
   */
  filter(callback: (item: T, index: number) => boolean): Collection<T> {
    return new Collection(this.items.filter(callback))
  }

  /**
   * Filter by key-value pair
   *
   * @example
   * ```typescript
   * const activeUsers = users.where('active', true)
   * ```
   */
  where<K extends keyof T>(key: K, value: T[K]): Collection<T> {
    return this.filter((item) => item[key] === value)
  }

  /**
   * Filter by key with operator
   *
   * @example
   * ```typescript
   * const adults = users.whereOp('age', '>=', 18)
   * ```
   */
  whereOp<K extends keyof T>(
    key: K,
    operator: '=' | '!=' | '>' | '>=' | '<' | '<=',
    value: T[K]
  ): Collection<T> {
    return this.filter((item) => {
      const itemValue = item[key]
      switch (operator) {
        case '=':
          return itemValue === value
        case '!=':
          return itemValue !== value
        case '>':
          return itemValue > value
        case '>=':
          return itemValue >= value
        case '<':
          return itemValue < value
        case '<=':
          return itemValue <= value
        default:
          return false
      }
    })
  }

  /**
   * Filter where key value is in array
   *
   * @example
   * ```typescript
   * const selected = users.whereIn('id', [1, 2, 3])
   * ```
   */
  whereIn<K extends keyof T>(key: K, values: T[K][]): Collection<T> {
    const valueSet = new Set(values)
    return this.filter((item) => valueSet.has(item[key]))
  }

  /**
   * Filter where key value is not in array
   */
  whereNotIn<K extends keyof T>(key: K, values: T[K][]): Collection<T> {
    const valueSet = new Set(values)
    return this.filter((item) => !valueSet.has(item[key]))
  }

  /**
   * Filter where key is null/undefined
   */
  whereNull<K extends keyof T>(key: K): Collection<T> {
    return this.filter((item) => item[key] == null)
  }

  /**
   * Filter where key is not null/undefined
   */
  whereNotNull<K extends keyof T>(key: K): Collection<T> {
    return this.filter((item) => item[key] != null)
  }

  /**
   * Reject items matching callback
   */
  reject(callback: (item: T, index: number) => boolean): Collection<T> {
    return this.filter((item, index) => !callback(item, index))
  }

  // ==========================================
  // TRANSFORMATION
  // ==========================================

  /**
   * Map and return a new Collection
   */
  map<U>(callback: (item: T, index: number) => U): Collection<U> {
    return new Collection(this.items.map(callback))
  }

  /**
   * Flat map and return a new Collection
   */
  flatMap<U>(callback: (item: T, index: number) => U[]): Collection<U> {
    const result: U[] = []
    for (let i = 0; i < this.items.length; i++) {
      result.push(...callback(this.items[i], i))
    }
    return new Collection(result)
  }

  /**
   * Flatten nested arrays
   */
  flatten<U = unknown>(depth: number = 1): Collection<U> {
    return new Collection((this.items as unknown[]).flat(depth) as U[])
  }

  /**
   * Get unique values
   */
  unique(): Collection<T>
  unique<K extends keyof T>(key: K): Collection<T>
  unique<K extends keyof T>(key?: K): Collection<T> {
    if (key === undefined) {
      return new Collection([...new Set(this.items)])
    }

    const seen = new Set<T[K]>()
    const result: T[] = []
    for (const item of this.items) {
      const value = item[key]
      if (!seen.has(value)) {
        seen.add(value)
        result.push(item)
      }
    }
    return new Collection(result)
  }

  /**
   * Chunk into smaller collections
   *
   * @example
   * ```typescript
   * const chunks = users.chunk(10) // Collection<Collection<User>>
   * ```
   */
  chunk(size: number): Collection<Collection<T>> {
    const chunks: Collection<T>[] = []

    for (let i = 0; i < this.items.length; i += size) {
      chunks.push(new Collection(this.items.slice(i, i + size)))
    }

    return new Collection(chunks)
  }

  /**
   * Take first n items
   */
  take(count: number): Collection<T> {
    if (count < 0) {
      return new Collection(this.items.slice(count))
    }
    return new Collection(this.items.slice(0, count))
  }

  /**
   * Skip first n items
   */
  skip(count: number): Collection<T> {
    return new Collection(this.items.slice(count))
  }

  /**
   * Slice the collection
   */
  slice(start?: number, end?: number): Collection<T> {
    return new Collection(this.items.slice(start, end))
  }

  // ==========================================
  // SORTING
  // ==========================================

  /**
   * Sort by a key (ascending)
   */
  sortBy<K extends keyof T>(key: K): Collection<T> {
    return new Collection(
      [...this.items].sort((a, b) => {
        const aVal = a[key]
        const bVal = b[key]
        if (aVal < bVal) return -1
        if (aVal > bVal) return 1
        return 0
      })
    )
  }

  /**
   * Sort by a key (descending)
   */
  sortByDesc<K extends keyof T>(key: K): Collection<T> {
    return new Collection(
      [...this.items].sort((a, b) => {
        const aVal = a[key]
        const bVal = b[key]
        if (aVal < bVal) return 1
        if (aVal > bVal) return -1
        return 0
      })
    )
  }

  /**
   * Sort by callback
   */
  sortByFn(callback: (item: T) => number | string): Collection<T> {
    return new Collection(
      [...this.items].sort((a, b) => {
        const aVal = callback(a)
        const bVal = callback(b)
        if (aVal < bVal) return -1
        if (aVal > bVal) return 1
        return 0
      })
    )
  }

  /**
   * Sort with comparator
   */
  sort(compareFn?: (a: T, b: T) => number): Collection<T> {
    return new Collection([...this.items].sort(compareFn))
  }

  /**
   * Reverse the collection
   */
  reverse(): Collection<T> {
    return new Collection([...this.items].reverse())
  }

  /**
   * Shuffle the collection
   */
  shuffle(): Collection<T> {
    const arr = [...this.items]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return new Collection(arr)
  }

  // ==========================================
  // AGGREGATION
  // ==========================================

  /**
   * Count items
   */
  count(): number {
    return this.items.length
  }

  /**
   * Sum of values
   */
  sum(): number
  sum<K extends keyof T>(key: K): number
  sum<K extends keyof T>(key?: K): number {
    if (key === undefined) {
      return this.items.reduce((acc, item) => acc + Number(item), 0)
    }
    return this.items.reduce((acc, item) => acc + Number(item[key]), 0)
  }

  /**
   * Average of values
   */
  avg(): number
  avg<K extends keyof T>(key: K): number
  avg<K extends keyof T>(key?: K): number {
    if (this.items.length === 0) return 0
    return this.sum(key as K) / this.items.length
  }

  /**
   * Minimum value
   */
  min(): T | undefined
  min<K extends keyof T>(key: K): T[K] | undefined
  min<K extends keyof T>(key?: K): T | T[K] | undefined {
    if (this.items.length === 0) return undefined

    if (key === undefined) {
      return this.items.reduce((min, item) => (item < min ? item : min))
    }

    let minItem = this.items[0]
    for (const item of this.items) {
      if (item[key] < minItem[key]) {
        minItem = item
      }
    }
    return minItem[key]
  }

  /**
   * Maximum value
   */
  max(): T | undefined
  max<K extends keyof T>(key: K): T[K] | undefined
  max<K extends keyof T>(key?: K): T | T[K] | undefined {
    if (this.items.length === 0) return undefined

    if (key === undefined) {
      return this.items.reduce((max, item) => (item > max ? item : max))
    }

    let maxItem = this.items[0]
    for (const item of this.items) {
      if (item[key] > maxItem[key]) {
        maxItem = item
      }
    }
    return maxItem[key]
  }

  /**
   * Median value
   */
  median(): number
  median<K extends keyof T>(key: K): number
  median<K extends keyof T>(key?: K): number {
    if (this.items.length === 0) return 0

    const values =
      key === undefined
        ? this.items.map((x) => Number(x))
        : this.items.map((x) => Number(x[key]))

    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2
    }
    return sorted[mid]
  }

  /**
   * Reduce the collection
   */
  reduce<U>(callback: (accumulator: U, item: T, index: number) => U, initialValue: U): U {
    return this.items.reduce(callback, initialValue)
  }

  // ==========================================
  // BOOLEAN CHECKS
  // ==========================================

  /**
   * Check if collection is empty
   */
  isEmpty(): boolean {
    return this.items.length === 0
  }

  /**
   * Check if collection is not empty
   */
  isNotEmpty(): boolean {
    return this.items.length > 0
  }

  /**
   * Check if collection contains item
   */
  contains(item: T): boolean
  contains<K extends keyof T>(key: K, value: T[K]): boolean
  contains<K extends keyof T>(itemOrKey: T | K, value?: T[K]): boolean {
    if (value === undefined) {
      return this.items.includes(itemOrKey as T)
    }
    return this.items.some((item) => item[itemOrKey as K] === value)
  }

  /**
   * Check if every item passes callback
   */
  every(callback: (item: T, index: number) => boolean): boolean {
    return this.items.every(callback)
  }

  /**
   * Check if any item passes callback
   */
  some(callback: (item: T, index: number) => boolean): boolean {
    return this.items.some(callback)
  }

  /**
   * Check if collection includes item
   */
  includes(item: T): boolean {
    return this.items.includes(item)
  }

  // ==========================================
  // COMBINATION
  // ==========================================

  /**
   * Merge with another collection/array
   */
  merge(items: T[] | Collection<T>): Collection<T> {
    const arr = items instanceof Collection ? items.toArray() : items
    return new Collection([...this.items, ...arr])
  }

  /**
   * Concatenate collections
   */
  concat(...items: (T | T[] | Collection<T>)[]): Collection<T> {
    const result = [...this.items]
    for (const item of items) {
      if (item instanceof Collection) {
        result.push(...item.toArray())
      } else if (Array.isArray(item)) {
        result.push(...item)
      } else {
        result.push(item)
      }
    }
    return new Collection(result)
  }

  /**
   * Get difference with another collection
   */
  diff(items: T[] | Collection<T>): Collection<T> {
    const arr = items instanceof Collection ? items.toArray() : items
    const itemSet = new Set(arr)
    return this.filter((item) => !itemSet.has(item))
  }

  /**
   * Get intersection with another collection
   */
  intersect(items: T[] | Collection<T>): Collection<T> {
    const arr = items instanceof Collection ? items.toArray() : items
    const itemSet = new Set(arr)
    return this.filter((item) => itemSet.has(item))
  }

  /**
   * Zip with another array
   */
  zip<U>(other: U[] | Collection<U>): Collection<[T, U]> {
    const arr = other instanceof Collection ? other.toArray() : other
    const result: [T, U][] = []
    const len = Math.min(this.items.length, arr.length)
    for (let i = 0; i < len; i++) {
      result.push([this.items[i], arr[i]])
    }
    return new Collection(result)
  }

  // ==========================================
  // MUTATION METHODS
  // ==========================================

  /**
   * Push item(s) to the collection (mutates)
   */
  push(...items: T[]): this {
    this.items.push(...items)
    return this
  }

  /**
   * Pop item from the collection (mutates)
   */
  pop(): T | undefined {
    return this.items.pop()
  }

  /**
   * Shift item from the collection (mutates)
   */
  shift(): T | undefined {
    return this.items.shift()
  }

  /**
   * Unshift item(s) to the collection (mutates)
   */
  unshift(...items: T[]): this {
    this.items.unshift(...items)
    return this
  }

  // ==========================================
  // ITERATION
  // ==========================================

  /**
   * Execute callback for each item
   */
  each(callback: (item: T, index: number) => void | false): this {
    for (let i = 0; i < this.items.length; i++) {
      if (callback(this.items[i], i) === false) {
        break
      }
    }
    return this
  }

  /**
   * ForEach alias
   */
  forEach(callback: (item: T, index: number) => void): void {
    this.items.forEach(callback)
  }

  /**
   * Tap into collection (for debugging)
   */
  tap(callback: (collection: this) => void): this {
    callback(this)
    return this
  }

  /**
   * Pipe collection through a function
   */
  pipe<U>(callback: (collection: this) => U): U {
    return callback(this)
  }

  /**
   * When condition is true, execute callback
   */
  when(condition: boolean, callback: (collection: this) => Collection<T>): Collection<T> {
    if (condition) {
      return callback(this)
    }
    return this
  }

  // ==========================================
  // CONVERSION
  // ==========================================

  /**
   * Convert to plain array
   */
  toArray(): T[] {
    return [...this.items]
  }

  /**
   * Convert to JSON (returns array)
   */
  toJSON(): T[] {
    return this.toArray()
  }

  /**
   * Convert to object keyed by field
   */
  toObject<K extends keyof T>(key: K): Record<string, T> {
    const result: Record<string, T> = {}
    for (const item of this.items) {
      result[String(item[key])] = item
    }
    return result
  }

  /**
   * Join items into string
   */
  join(separator: string = ','): string {
    return this.items.join(separator)
  }

  /**
   * Join items by key into string
   */
  implode<K extends keyof T>(key: K, separator: string = ','): string {
    return this.pluck(key).join(separator)
  }

  /**
   * Get string representation
   */
  toString(): string {
    return JSON.stringify(this.items)
  }
}
