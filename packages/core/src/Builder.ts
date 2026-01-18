/**
 * Query Builder
 *
 * Fluent interface for building SQL queries in a database-agnostic way.
 * Inspired by Laravel's Query Builder but with TypeScript type safety.
 */

import type { ModelClass } from './Model'
import type {
  ComparisonOperator,
  SortDirection,
  WhereClause,
  JoinClause,
  OrderByClause,
  PaginatedResult,
  DatabaseRow
} from './types'
import { Model } from './Model'
import { Database } from './Database'
import { GrammarFactory } from './query/grammar/GrammarFactory'
import type { Grammar } from './query/grammar/Grammar'

type ModelAttributeKeys<T> = T extends Model<infer A>
  ? Extract<keyof A, string>
  : string

type ModelAttributeValue<T, K extends string> = T extends Model<infer A>
  ? K extends keyof A ? A[K] : unknown
  : unknown

type RelationTree = { [key: string]: RelationTree }

type ModelLikeConstructor = ModelClass<Model>

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
export class Builder<T = unknown> {
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
   * SELECT columns
   */
  protected columns: string[] = []

  /**
   * WHERE clauses
   */
  protected wheres: WhereClause[] = []

  /**
   * JOIN clauses
   */
  protected joins: JoinClause[] = []

  /**
   * ORDER BY clauses
   */
  protected orders: OrderByClause[] = []

  /**
   * LIMIT value
   */
  protected limitValue?: number

  /**
   * OFFSET value
   */
  protected offsetValue?: number

  /**
   * DISTINCT flag
   */
  protected distinctFlag: boolean = false

  /**
   * Relations to eager load (for Model)
   */
  protected eagerLoad: string[] = []

  /**
   * Soft delete column (if model uses soft deletes)
   */
  protected softDeleteColumn?: string

  /**
   * Include soft deleted records
   */
  protected includeTrashed: boolean = false

  /**
   * Only soft deleted records
   */
  protected onlyTrashedFlag: boolean = false

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

    if (this.model?.softDeletes) {
      this.softDeleteColumn = this.model.deletedAtColumn || 'deleted_at'
    }
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
    this.columns = flattened.length > 0 ? flattened : ['*']
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
    this.distinctFlag = true
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

    this.wheres.push({
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
    this.wheres.push({
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
    this.wheres.push({
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

    this.wheres.push({
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
    this.wheres.push({
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
    this.wheres.push({
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
    this.wheres.push({
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
    this.wheres.push({
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
    this.wheres.push({
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
    this.wheres.push({
      type: 'raw',
      value: sql,
      values: bindings,
      boolean: 'AND'
    })

    return this
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
    this.orders.push({ column, direction })
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
    this.limitValue = value
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
    this.offsetValue = value
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
   * @returns Array of results
   *
   * @example
   * ```typescript
   * const users = await builder.get()
   * ```
   */
  async get(): Promise<T[]> {
    const { sql, bindings } = this.toSql()
    const rows = await Database.select<DatabaseRow>(sql, bindings, this.connectionName)

    if (this.model) {
      const models = rows.map((row) => this.hydrate(row))
      if (this.eagerLoad.length > 0) {
        const modelItems: Model[] = []
        for (const item of models) {
          if (item instanceof Model) {
            modelItems.push(item)
          }
        }
        if (modelItems.length > 0) {
          await Builder.eagerLoadRelations(modelItems, this.eagerLoad)
        }
      }
      return models
    }

    return rows as T[]
  }

  /**
   * Execute query and get first result
   *
   * @returns First result or null
   */
  async first(): Promise<T | null> {
    this.limit(1)
    const results = await this.get()
    return results[0] || null
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

    const result = await Database.select(countSql, bindings, this.connectionName)
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

    const data = await this.offset(offset).limit(perPage).get()

    return {
      data,
      meta: {
        total,
        perPage,
        currentPage: page,
        lastPage: Math.ceil(total / perPage),
        from: offset + 1,
        to: offset + data.length
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

    const result = await Database.select(aggSql, bindings, this.connectionName)
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
    this.eagerLoad.push(...relations)
    return this
  }

  /**
   * Include soft deleted records
   */
  withTrashed(): this {
    this.includeTrashed = true
    this.onlyTrashedFlag = false
    return this
  }

  /**
   * Only soft deleted records
   */
  onlyTrashed(): this {
    this.includeTrashed = true
    this.onlyTrashedFlag = true
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
    const wheres = [...this.wheres]

    if (this.softDeleteColumn) {
      if (this.onlyTrashedFlag) {
        wheres.push({
          type: 'null',
          column: this.softDeleteColumn,
          boolean: 'AND',
          not: true
        })
      } else if (!this.includeTrashed) {
        wheres.push({
          type: 'null',
          column: this.softDeleteColumn,
          boolean: 'AND'
        })
      }
    }

    return this.grammar.compileSelect({
      table: this.tableName,
      columns: this.columns.length > 0 ? this.columns : undefined,
      wheres: wheres.length > 0 ? wheres : undefined,
      joins: this.joins.length > 0 ? this.joins : undefined,
      orders: this.orders.length > 0 ? this.orders : undefined,
      limit: this.limitValue,
      offset: this.offsetValue,
      distinct: this.distinctFlag
    })
  }

  /**
   * Hydrate a raw row into a model instance
   */
  protected hydrate(row: DatabaseRow): T {
    if (!this.model) {
      return row as T
    }

    const instance = new this.model()
    if (instance instanceof Model) {
      instance.setRawAttributes(row)
      return instance as T
    }

    return row as T
  }

  /**
   * Eager load relations for a set of models
   */
  private static async eagerLoadRelations(
    models: Model[],
    relations: string[]
  ): Promise<void> {
    if (models.length === 0 || relations.length === 0) {
      return
    }

    const tree = Builder.buildRelationTree(relations)

    for (const [relationName, nested] of Object.entries(tree)) {
      const first = models[0]
      const relationMethod = (first as unknown as Record<string, unknown>)[relationName]

      if (typeof relationMethod !== 'function') {
        throw new Error(`Relation ${relationName} does not exist on ${first.constructor.name}`)
      }

      const relation = (relationMethod as () => { eagerLoadForMany: (items: Model[], name: string) => Promise<void> })
        .call(first)

      await relation.eagerLoadForMany(models, relationName)

      if (Object.keys(nested).length > 0) {
        const relatedModels = Builder.collectRelatedModels(models, relationName)
        await Builder.eagerLoadRelations(relatedModels, Builder.flattenRelationTree(nested))
      }
    }
  }

  private static buildRelationTree(relations: string[]): RelationTree {
    const tree: RelationTree = {}

    for (const relation of relations) {
      const parts = relation.split('.')
      let current: RelationTree = tree
      for (const part of parts) {
        if (!current[part]) {
          current[part] = {}
        }
        current = current[part]
      }
    }

    return tree
  }

  private static flattenRelationTree(tree: RelationTree): string[] {
    const relations: string[] = []
    for (const key of Object.keys(tree)) {
      const nested = tree[key]
      const nestedKeys = Object.keys(nested)
      if (nestedKeys.length === 0) {
        relations.push(key)
      } else {
        for (const sub of Builder.flattenRelationTree(nested)) {
          relations.push(`${key}.${sub}`)
        }
      }
    }
    return relations
  }

  private static collectRelatedModels(models: Model[], relationName: string): Model[] {
    const related: Model[] = []
    for (const model of models) {
      const value = model.getRelation(relationName)
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item instanceof Model) {
            related.push(item)
          }
        }
      } else if (value instanceof Model) {
        related.push(value)
      }
    }
    return related
  }

  /**
   * Clone the query builder
   */
  clone(): Builder<T> {
    const cloned = new Builder<T>(this.tableName, this.connectionName)
    cloned.grammar = this.grammar
    cloned.model = this.model
    cloned.columns = [...this.columns]
    cloned.wheres = [...this.wheres]
    cloned.joins = [...this.joins]
    cloned.orders = [...this.orders]
    cloned.limitValue = this.limitValue
    cloned.offsetValue = this.offsetValue
    cloned.distinctFlag = this.distinctFlag
    cloned.eagerLoad = [...this.eagerLoad]
    cloned.softDeleteColumn = this.softDeleteColumn
    cloned.includeTrashed = this.includeTrashed
    cloned.onlyTrashedFlag = this.onlyTrashedFlag
    return cloned
  }
}
