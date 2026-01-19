/**
 * Repository
 *
 * Data access repository that keeps query logic outside Model.
 * Provides a clean, testable API for CRUD operations.
 *
 * @example
 * ```typescript
 * const userRepo = new Repository(User)
 * // or
 * const userRepo = User.repo()
 *
 * // Read
 * const user = await userRepo.find(1)
 * const users = await userRepo.all()
 *
 * // Write
 * const newUser = await userRepo.create({ name: 'John' })
 * await userRepo.update(1, { name: 'Jane' })
 * await userRepo.delete(1)
 * ```
 */

import type { ComparisonOperator } from '../types'
import { QueryProxy } from './QueryProxy'
import { Collection } from '../support/Collection'
import type { Model, ModelAttributesOf, ModelConstructor } from '../Model'
import type { RepositoryContract } from '../contracts/RepositoryContract'

export class Repository<T extends Model = Model> implements RepositoryContract<T> {
  protected readonly modelClass: ModelConstructor<T>
  protected readonly proxy: QueryProxy<T>

  constructor(modelClass: ModelConstructor<T>) {
    this.modelClass = modelClass
    this.proxy = new QueryProxy<T>(modelClass)
  }

  // ==========================================
  // QUERY BUILDING
  // ==========================================

  query() {
    return this.proxy.query()
  }

  where(column: string, value: unknown): ReturnType<QueryProxy<T>['where']>
  where(column: string, operator: ComparisonOperator, value: unknown): ReturnType<QueryProxy<T>['where']>
  where(
    column: string,
    operatorOrValue: ComparisonOperator | unknown,
    value?: unknown
  ): ReturnType<QueryProxy<T>['where']> {
    if (arguments.length === 2) {
      return this.proxy.where(column, operatorOrValue)
    }
    return this.proxy.where(column, operatorOrValue as ComparisonOperator, value)
  }

  with(...relations: string[]) {
    return this.proxy.with(...relations)
  }

  orderBy(column: string, direction?: 'asc' | 'desc') {
    return this.proxy.orderBy(column, direction)
  }

  latest(column?: string) {
    return this.proxy.latest(column)
  }

  oldest(column?: string) {
    return this.proxy.oldest(column)
  }

  limit(value: number) {
    return this.proxy.limit(value)
  }

  take(value: number) {
    return this.proxy.take(value)
  }

  withTrashed() {
    return this.proxy.withTrashed()
  }

  onlyTrashed() {
    return this.proxy.onlyTrashed()
  }

  scope(name: string, ...args: unknown[]) {
    return this.proxy.scope(name, ...args)
  }

  // ==========================================
  // READ OPERATIONS
  // ==========================================

  find(id: string | number) {
    return this.proxy.find(id)
  }

  findOrFail(id: string | number) {
    return this.proxy.findOrFail(id)
  }

  async findMany(ids: Array<string | number>): Promise<Collection<T>> {
    if (ids.length === 0) {
      return new Collection<T>([])
    }
    const primaryKey = this.modelClass.primaryKey
    return this.query().whereInColumn(primaryKey, ids).get()
  }

  first() {
    return this.proxy.first()
  }

  async firstOrFail(): Promise<T> {
    const result = await this.first()
    if (!result) {
      throw new Error(`No ${this.modelClass.name} record found`)
    }
    return result
  }

  all() {
    return this.proxy.all()
  }

  get() {
    return this.proxy.get()
  }

  count() {
    return this.proxy.count()
  }

  async exists(): Promise<boolean> {
    const count = await this.count()
    return count > 0
  }

  // ==========================================
  // WRITE OPERATIONS
  // ==========================================

  create(attributes: Partial<ModelAttributesOf<T>>) {
    return this.proxy.create(attributes)
  }

  async createMany(records: Array<Partial<ModelAttributesOf<T>>>): Promise<Collection<T>> {
    const created = await Promise.all(records.map((attrs) => this.create(attrs)))
    return new Collection(created)
  }

  async update(id: string | number, attributes: Partial<ModelAttributesOf<T>>): Promise<T | null> {
    const model = await this.find(id)
    if (!model) {
      return null
    }
    model.fill(attributes)
    await model.save()
    return model
  }

  async updateOrCreate(
    search: Partial<ModelAttributesOf<T>>,
    attributes: Partial<ModelAttributesOf<T>>
  ): Promise<T> {
    // Build query from search criteria
    let query = this.query()
    for (const [key, value] of Object.entries(search)) {
      query = query.where(key, value)
    }

    const existing = await query.first()

    if (existing) {
      existing.fill(attributes)
      await existing.save()
      return existing
    }

    // Create new with both search and attributes
    return this.create({ ...search, ...attributes })
  }

  async delete(id: string | number): Promise<boolean> {
    const model = await this.find(id)
    if (!model) {
      return false
    }
    return model.delete()
  }

  async deleteMany(ids: Array<string | number>): Promise<number> {
    if (ids.length === 0) {
      return 0
    }

    const models = await this.findMany(ids)
    let deleted = 0

    for (const model of models) {
      const success = await model.delete()
      if (success) deleted++
    }

    return deleted
  }

  async save(model: T): Promise<boolean> {
    return model.save()
  }
}
