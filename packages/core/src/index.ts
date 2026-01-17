/**
 * Velvet ORM - Core Package
 *
 * The elegant TypeScript ORM with full type safety and intuitive Active Record pattern.
 *
 * @packageDocumentation
 */

// ==========================================
// CORE EXPORTS
// ==========================================

export { Model } from './Model'
export { Builder } from './Builder'
export { Database } from './Database'
export { Schema, Blueprint } from './Schema'

// ==========================================
// CONNECTION & DRIVERS
// ==========================================

export { ConnectionManager } from './connection/ConnectionManager'
export { Driver } from './drivers/Driver'
export { SqliteDriver } from './drivers/sqlite/SqliteDriver'
export type { DriverContract } from './drivers/contracts/DriverContract'

// ==========================================
// QUERY GRAMMAR
// ==========================================

export { Grammar } from './query/grammar/Grammar'
export { SqliteGrammar } from './query/grammar/SqliteGrammar'

// ==========================================
// TYPES
// ==========================================

export type * from './types'

// ==========================================
// EXCEPTIONS
// ==========================================

export * from './exceptions'
