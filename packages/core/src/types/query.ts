/**
 * Query Type Definitions
 *
 * Type definitions for query building, operators, and results.
 */

/**
 * SQL comparison operators
 */
export type ComparisonOperator =
  | '='
  | '!='
  | '<>'
  | '<'
  | '<='
  | '>'
  | '>='
  | 'LIKE'
  | 'NOT LIKE'
  | 'ILIKE'
  | 'NOT ILIKE'
  | 'IN'
  | 'NOT IN'
  | 'IS'
  | 'IS NOT'

/**
 * SQL logical operators
 */
export type LogicalOperator = 'AND' | 'OR'

/**
 * Sort direction
 */
export type SortDirection = 'ASC' | 'DESC' | 'asc' | 'desc'

/**
 * JOIN types
 */
export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS'

/**
 * Aggregate functions
 */
export type AggregateFunction = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX'

/**
 * WHERE clause definition
 */
export interface WhereClause {
  type: 'basic' | 'in' | 'null' | 'between' | 'exists' | 'raw'
  column?: string
  operator?: ComparisonOperator
  value?: any
  values?: any[]
  boolean: LogicalOperator
  not?: boolean
}

/**
 * JOIN clause definition
 */
export interface JoinClause {
  type: JoinType
  table: string
  first: string
  operator: ComparisonOperator
  second: string
}

/**
 * ORDER BY clause definition
 */
export interface OrderByClause {
  column: string
  direction: SortDirection
}

/**
 * Query bindings
 */
export interface QueryBindings {
  select?: any[]
  from?: any[]
  join?: any[]
  where?: any[]
  having?: any[]
  order?: any[]
  union?: any[]
}

/**
 * Compiled SQL query
 */
export interface CompiledQuery {
  /**
   * The SQL query string
   */
  sql: string

  /**
   * Parameter bindings for prepared statements
   */
  bindings: any[]
}

/**
 * Query result metadata
 */
export interface QueryMetadata {
  /**
   * Execution time in milliseconds
   */
  executionTime?: number

  /**
   * Query type (SELECT, INSERT, UPDATE, DELETE)
   */
  queryType?: string

  /**
   * Was this result from cache?
   */
  fromCache?: boolean
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  /**
   * Total number of records
   */
  total: number

  /**
   * Records per page
   */
  perPage: number

  /**
   * Current page number
   */
  currentPage: number

  /**
   * Last page number
   */
  lastPage: number

  /**
   * First record number on current page
   */
  from: number

  /**
   * Last record number on current page
   */
  to: number
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  /**
   * Data for current page
   */
  data: T[]

  /**
   * Pagination metadata
   */
  meta: PaginationMeta
}
