/**
 * Query Builder
 *
 * Fluent interface for building SQL queries in a database-agnostic way.
 * Inspired by Laravel's Query Builder but with TypeScript type safety.
 */

import type { Model, ModelClass } from './Model'
import type {
  ComparisonOperator,
  SortDirection,
  PaginatedResult,
  DatabaseRow
} from './types'
import { GrammarFactory } from './query/grammar/GrammarFactory'
import { Collection } from './support/Collection'
import type { Grammar } from './query/grammar/Grammar'
import { ModelHydrator } from './model/ModelHydrator'
import { RelationLoader } from './model/RelationLoader'
import { QueryCompiler } from './query/QueryCompiler'
import { QueryExecutor } from './query/QueryExecutor'
import type { BuilderContract } from './contracts/BuilderContract'
import { QueryState } from './query/QueryState'
import { QueryException } from './exceptions'
import type { HydratableModelConstructor, HydratableModel } from './contracts/HydratableModel'
import { isHydratableModel } from './contracts/HydratableModel'

type ModelAttributeKeys<T> = T extends Model<infer A>
  ? Extract<keyof A, string>
  : string

type ModelAttributeValue<T, K extends string> = T extends Model<infer A>
  ? K extends keyof A ? A[K] : unknown
  : unknown

type ModelLikeConstructor = HydratableModelConstructor & ModelClass<Model>

/**
 * Query Builder
 *
 * Provides a fluent API for building and executing database queries.
 *
 * @example
 * ```typescript
 * const users = await new Builder('users')
 *   .where('active', true)
 *   .orderBy('name', 'asc')
 *   .limit(10)
 *   .get()
 * ```
 */
export class Builder<T = unknown> implements BuilderContract<T> {
  /**
   * Table name
   */
  protected tableName: string

  /**
   * Connection name
   */
  protected connectionName?: string

  /**
   * SQL Grammar compiler
   */
  protected grammar: Grammar

  /**
   * Model constructor (if used with Model)
   */
  protected model?: ModelLikeConstructor

  /**
   * Query state
   */
  protected state: QueryState

  /**
   * Create a new query builder
   *
   * @param table - Table name or Model constructor
   * @param connectionName - Optional connection name
   *
   * @example
   * ```typescript
   * const builder = new Builder('users')
   * const builder = new Builder(User)
   * ```
   */
  constructor(table: string | ModelLikeConstructor, connectionName?: string) {
    if (typeof table === 'string') {
      this.tableName = table
    } else {
      this.model = table
      this.tableName = this.model.table || this.model.name.toLowerCase() + 's'
    }

    this.connectionName = connectionName
    this.grammar = GrammarFactory.create(connectionName)
    this.state = new QueryState()

    if (this.model?.softDeletes) {
      this.state.softDeleteColumn = this.model.deletedAtColumn || 'deleted_at'
    }
  }

  /**
   * Assign a model class for hydration
   */
  setModelClass(model: ModelLikeConstructor): this {
    this.model = model
    this.tableName = model.table || model.name.toLowerCase() + 's'

    if (!this.connectionName) {
      this.connectionName = model.connection
      this.grammar = GrammarFactory.create(this.connectionName)
    }

    if (model.softDeletes) {
      this.state.softDeleteColumn = model.deletedAtColumn || 'deleted_at'
    } else {
      this.state.softDeleteColumn = undefined
    }

    return this
  }

  // ==========================================
  // SELECT METHODS
  // ==========================================

  /**
   * Set columns to select
   *
   * @param columns - Columns to select
   *
   * @example
   * ```typescript
   * builder.select('name', 'email')
   * builder.select(['name', 'email'])
   * ```
   */
  select(...columns: string[]): this {
    // Flatten array if passed
    const flattened = columns.flat()
    this.state.columns = flattened.length > 0 ? flattened : ['*']
    return this
  }

  /**
   * Add DISTINCT clause
   *
   * @example
   * ```typescript
   * builder.distinct().select('country')
   * ```
   */
  distinct(): this {
    this.state.distinct = true
    return this
  }

  // ==========================================
  // WHERE METHODS
  // ==========================================

  /**
   * Add a basic WHERE clause
   *
   * @param column - Column name
   * @param operator - Comparison operator or value if '=' is assumed
   * @param value - Value to compare against
   *
   * @example
   * ```typescript
   * builder.where('age', '>', 18)
   * builder.where('name', 'John') // Assumes '='
   * ```
   */
  where<K extends ModelAttributeKeys<T>>(
    column: K,
    value: ModelAttributeValue<T, K>
  ): this
  where<K extends ModelAttributeKeys<T>>(
    column: K,
    operator: ComparisonOperator,
    value: ModelAttributeValue<T, K>
  ): this
  where(column: string, value: unknown): this
  where(column: string, operator: ComparisonOperator, value: unknown): this
  where(column: string, operator?: ComparisonOperator | unknown, value?: unknown): this {
    // Handle two-argument version: where('name', 'John')
    if (arguments.length === 2) {
      value = operator
      operator = '='
    }

    this.state.wheres.push({
      type: 'basic',
      column,
      operator: operator as ComparisonOperator,
      value,
      boolean: 'AND'
    })

    return this
  }

  /**
   * Add a WHERE clause with an untyped column name
   */
  whereColumn(column: string, value: unknown): this {
    this.state.wheres.push({
      type: 'basic',
      column,
      operator: '=',
      value,
      boolean: 'AND'
    })
    return this
  }

  /**
   * Add a WHERE IN clause with an untyped column name
   */
  whereInColumn(column: string, values: unknown[]): this {
    this.state.wheres.push({
      type: 'in',
      column,
      values,
      boolean: 'AND'
    })
    return this
  }

  /**
   * Add an OR WHERE clause
   */
  orWhere<K extends ModelAttributeKeys<T>>(
    column: K,
    value: ModelAttributeValue<T, K>
  ): this
  orWhere<K extends ModelAttributeKeys<T>>(
    column: K,
    operator: ComparisonOperator,
    value: ModelAttributeValue<T, K>
  ): this
  orWhere(column: string, value: unknown): this
  orWhere(column: string, operator: ComparisonOperator, value: unknown): this
  orWhere(column: string, operator?: ComparisonOperator | unknown, value?: unknown): this {
    if (arguments.length === 2) {
      value = operator
      operator = '='
    }

    this.state.wheres.push({
      type: 'basic',
      column,
      operator: operator as ComparisonOperator,
      value,
      boolean: 'OR'
    })

    return this
  }

  /**
   * Add a WHERE IN clause
   *
   * @example
   * ```typescript
   * builder.whereIn('id', [1, 2, 3])
   * ```
   */
  whereIn<K extends ModelAttributeKeys<T>>(
    column: K,
    values: Array<ModelAttributeValue<T, K>>
  ): this
  whereIn(column: string, values: unknown[]): this {
    this.state.wheres.push({
      type: 'in',
      column,
      values,
      boolean: 'AND'
    })

    return this
  }

  /**
   * Add a WHERE NOT IN clause
   */
  whereNotIn<K extends ModelAttributeKeys<T>>(
    column: K,
    values: Array<ModelAttributeValue<T, K>>
  ): this
  whereNotIn(column: string, values: unknown[]): this {
    this.state.wheres.push({
      type: 'in',
      column,
      values,
      boolean: 'AND',
      not: true
    })

    return this
  }

  /**
   * Add a WHERE NULL clause
   */
  whereNull<K extends ModelAttributeKeys<T>>(column: K): this
  whereNull(column: string): this {
    this.state.wheres.push({
      type: 'null',
      column,
      boolean: 'AND'
    })

    return this
  }

  /**
   * Add a WHERE NOT NULL clause
   */
  whereNotNull<K extends ModelAttributeKeys<T>>(column: K): this
  whereNotNull(column: string): this {
    this.state.wheres.push({
      type: 'null',
      column,
      boolean: 'AND',
      not: true
    })

    return this
  }

  /**
   * Add a WHERE BETWEEN clause
   */
  whereBetween<K extends ModelAttributeKeys<T>>(
    column: K,
    values: [ModelAttributeValue<T, K>, ModelAttributeValue<T, K>]
  ): this
  whereBetween(column: string, values: [unknown, unknown]): this {
    this.state.wheres.push({
      type: 'between',
      column,
      values,
      boolean: 'AND'
    })

    return this
  }

  /**
   * Add a raw WHERE clause
   *
   * @param sql - Raw SQL
   * @param bindings - Optional bindings
   *
   * @example
   * ```typescript
   * builder.whereRaw('age > ? AND name LIKE ?', [18, '%John%'])
   * ```
   */
  whereRaw(sql: string, bindings?: unknown[]): this {
    if (!this.state.allowUnsafeRaw) {
      throw new QueryException(
        'Raw where clauses are disabled. Call allowUnsafeRaw() to enable.',
        sql,
        bindings,
        'UNSAFE_RAW_QUERY'
      )
    }

    this.state.wheres.push({
      type: 'raw',
      value: sql,
      values: bindings,
      boolean: 'AND'
    })

    return this
  }

  /**
   * Allow raw SQL clauses (unsafe)
   */
  allowUnsafeRaw(): this {
    this.state.allowUnsafeRaw = true
    return this
  }

  /**
   * Add a raw WHERE clause (unsafe, explicit)
   */
  unsafeWhereRaw(sql: string, bindings?: unknown[]): this {
    return this.allowUnsafeRaw().whereRaw(sql, bindings)
  }

  // ==========================================
  // ORDER & LIMIT
  // ==========================================

  /**
   * Add an ORDER BY clause
   */
  orderBy<K extends ModelAttributeKeys<T>>(
    column: K,
    direction?: SortDirection
  ): this
  orderBy(column: string, direction?: SortDirection): this
  orderBy(column: string, direction: SortDirection = 'asc'): this {
    this.state.orders.push({ column, direction })
    return this
  }

  /**
   * Order by column DESC
   */
  latest(column: string = 'created_at'): this {
    return this.orderBy(column, 'desc')
  }

  /**
   * Order by column ASC
   */
  oldest(column: string = 'created_at'): this {
    return this.orderBy(column, 'asc')
  }

  /**
   * Set LIMIT
   */
  limit(value: number): this {
    this.state.limit = value
    return this
  }

  /**
   * Alias for limit
   */
  take(value: number): this {
    return this.limit(value)
  }

  /**
   * Set OFFSET
   */
  offset(value: number): this {
    this.state.offset = value
    return this
  }

  /**
   * Alias for offset
   */
  skip(value: number): this {
    return this.offset(value)
  }

  // ==========================================
  // EXECUTION METHODS
  // ==========================================

  /**
   * Execute query and get all results
   *
   * @returns Collection of results
   *
   * @example
   * ```typescript
   * const users = await builder.get()
   * users.pluck('name') // Collection<string>
   * users.where('active', true) // Collection<User>
   * ```
   */
  async get(): Promise<Collection<T>> {
    const { sql, bindings } = this.toSql()
    const executor = new QueryExecutor(this.connectionName)
    const rows = await executor.select<DatabaseRow>(sql, bindings)

    if (this.model) {
      const hydrator = new ModelHydrator<T>(this.model)
      const models = rows.map((row) => hydrator.hydrate(row))
      if (this.state.eagerLoad.length > 0) {
        const modelItems = models.filter(isHydratableModel) as HydratableModel[]
        await RelationLoader.load(modelItems, this.state.eagerLoad)
      }
      return new Collection(models)
    }

    return new Collection(rows as T[])
  }

  /**
   * Execute query and get first result
   *
   * @returns First result or null
   */
  async first(): Promise<T | null> {
    this.limit(1)
    const results = await this.get()
    return results.first() || null
  }

  /**
   * Find a record by primary key
   *
   * @param id - Primary key value
   * @param primaryKey - Primary key column name
   * @returns Record or null
   */
  async find(id: string | number, primaryKey: string = 'id'): Promise<T | null> {
    return this.where(primaryKey, id).first()
  }

  /**
   * Find or fail
   *
   * @throws {ModelNotFoundException} If not found
   */
  async findOrFail(id: string | number, primaryKey: string = 'id'): Promise<T> {
    const result = await this.find(id, primaryKey)

    if (!result) {
      const modelName = this.model?.name || this.tableName
      throw new Error(`Model [${modelName}] with id [${id}] not found`)
    }

    return result
  }

  /**
   * Get count of records
   */
  async count(column: string = '*'): Promise<number> {
    const { sql, bindings } = this.toSql()
    const countSql = sql.replace(/SELECT .* FROM/, `SELECT COUNT(${column}) as count FROM`)

    const executor = new QueryExecutor(this.connectionName)
    const result = await executor.select(countSql, bindings)
    return Number(result[0]?.count || 0)
  }

  /**
   * Check if any records exist
   */
  async exists(): Promise<boolean> {
    const count = await this.count()
    return count > 0
  }

  /**
   * Get paginated results
   *
   * @param perPage - Records per page
   * @param page - Current page (1-indexed)
   */
  async paginate(perPage: number = 15, page: number = 1): Promise<PaginatedResult<T>> {
    const total = await this.count()
    const offset = (page - 1) * perPage

    const results = await this.offset(offset).limit(perPage).get()
    const data = results.toArray()

    return {
      data,
      meta: {
        total,
        perPage,
        currentPage: page,
        lastPage: Math.ceil(total / perPage),
        from: offset + 1,
        to: data.length
      }
    }
  }

  // ==========================================
  // AGGREGATES
  // ==========================================

  /**
   * Get maximum value
   */
  async max(column: string): Promise<number> {
    return this.aggregate('MAX', column)
  }

  /**
   * Get minimum value
   */
  async min(column: string): Promise<number> {
    return this.aggregate('MIN', column)
  }

  /**
   * Get average value
   */
  async avg(column: string): Promise<number> {
    return this.aggregate('AVG', column)
  }

  /**
   * Get sum of values
   */
  async sum(column: string): Promise<number> {
    return this.aggregate('SUM', column)
  }

  /**
   * Execute aggregate function
   */
  private async aggregate(fn: string, column: string): Promise<number> {
    const { sql, bindings } = this.toSql()
    const aggSql = sql.replace(/SELECT .* FROM/, `SELECT ${fn}(${column}) as aggregate FROM`)

    const executor = new QueryExecutor(this.connectionName)
    const result = await executor.select(aggSql, bindings)
    return Number(result[0]?.aggregate || 0)
  }

  // ==========================================
  // RELATIONSHIPS (PLACEHOLDER)
  // ==========================================

  /**
   * Eager load relationships
   *
   * @param relations - Relation names to load
   */
  with(...relations: string[]): this {
    this.state.eagerLoad.push(...relations)
    return this
  }

  /**
   * Include soft deleted records
   */
  withTrashed(): this {
    this.state.includeTrashed = true
    this.state.onlyTrashed = false
    return this
  }

  /**
   * Only soft deleted records
   */
  onlyTrashed(): this {
    this.state.includeTrashed = true
    this.state.onlyTrashed = true
    return this
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  /**
   * Compile query to SQL
   *
   * @returns Compiled SQL and bindings
   */
  toSql(): { sql: string; bindings: unknown[] } {
    const compiler = new QueryCompiler(this.grammar)
    return compiler.compileSelect(
      {
        table: this.tableName,
        columns: this.state.columns.length > 0 ? this.state.columns : undefined,
        wheres: this.state.wheres.length > 0 ? this.state.wheres : undefined,
        joins: this.state.joins.length > 0 ? this.state.joins : undefined,
        orders: this.state.orders.length > 0 ? this.state.orders : undefined,
        limit: this.state.limit,
        offset: this.state.offset,
        distinct: this.state.distinct
      },
      {
        column: this.state.softDeleteColumn,
        includeTrashed: this.state.includeTrashed,
        onlyTrashed: this.state.onlyTrashed
      }
    )
  }

  /**
   * Hydrate a raw row into a model instance
   */
  protected hydrate(row: DatabaseRow): T {
    const hydrator = new ModelHydrator<T>(this.model)
    return hydrator.hydrate(row)
  }

  /**
   * Clone the query builder
   */
  clone(): Builder<T> {
    const cloned = new Builder<T>(this.tableName, this.connectionName)
    cloned.grammar = this.grammar
    cloned.model = this.model
    cloned.state = this.state.clone()
    return cloned
  }
}
