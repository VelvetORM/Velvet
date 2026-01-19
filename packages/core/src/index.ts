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
export type { ModelAttributesOf, ModelStatic, ModelConstructor, ModelClass } from './Model'
export { Builder } from './Builder'
export { Database } from './Database'
export { Schema, Blueprint } from './Schema'
export { ModelGenerator } from './schema/ModelGenerator'
export { SchemaRegistry } from './schema/SchemaRegistry'

// ==========================================
// MODEL COMPONENTS
// ==========================================

export { AttributeBag } from './model/AttributeBag'
export type { CastMap, MutatorRegistry, AccessorRegistry, AttributeBagConfig } from './model/AttributeBag'
export { ModelSerializer } from './model/ModelSerializer'
export type { Serializable, SerializationOptions } from './model/ModelSerializer'
export { ModelEventDispatcher, ModelEvents } from './model/ModelEventDispatcher'
export type { EventPriority, EventDispatchResult } from './model/ModelEventDispatcher'
export { ModelPersister } from './model/ModelPersister'
export { ModelValidator } from './model/ModelValidator'
export { QueryProxy } from './model/QueryProxy'
export { Repository } from './model/Repository'
export { ModelHydrator } from './model/ModelHydrator'
export { RelationLoader } from './model/RelationLoader'
export { RelationStore } from './model/concerns/RelationStore'
export { EventRegistrar } from './model/concerns/EventRegistrar'

// ==========================================
// CONTRACTS
// ==========================================

export type {
  Attributes,
  CastType,
  ModelConfiguration,
  ModelEvent,
  ModelEventHandler,
  AttributeMutator,
  AttributeAccessor,
  ModelContract,
  ModelStaticContract
} from './contracts/ModelContract'

export type { BuilderContract } from './contracts/BuilderContract'
export type { RelationContract } from './contracts/RelationContract'
export type { HydratableModel, HydratableModelConstructor } from './contracts/HydratableModel'
export type { RepositoryContract } from './contracts/RepositoryContract'
export type { QueryExecutorContract } from './contracts/QueryExecutorContract'
export type {
  ScopeFunction,
  ScopeRegistry,
  TypedScopeRegistry,
  Scopeable,
  ScopeableStatic,
  InferScopes,
  InferBuilder
} from './contracts/ScopeContract'
export { defineScopes } from './contracts/ScopeContract'

// ==========================================
// CONNECTION & DRIVERS
// ==========================================

export { ConnectionManager } from './connection/ConnectionManager'
export { ConnectionPool } from './connection/ConnectionPool'
export { Driver } from './drivers/Driver'
export { SqliteDriver } from './drivers/sqlite/SqliteDriver'
export type { DriverContract } from './drivers/contracts/DriverContract'

// ==========================================
// RELATIONS
// ==========================================

export { Relation } from './relations/Relation'
export { HasMany } from './relations/HasMany'
export { HasOne } from './relations/HasOne'
export { BelongsTo } from './relations/BelongsTo'
export { BelongsToMany } from './relations/BelongsToMany'

// ==========================================
// QUERY GRAMMAR
// ==========================================

export { Grammar } from './query/grammar/Grammar'
export { GrammarFactory } from './query/grammar/GrammarFactory'
export { SqliteGrammar } from './query/grammar/SqliteGrammar'
export { QueryCompiler } from './query/QueryCompiler'
export { QueryState } from './query/QueryState'
export { QueryExecutor } from './query/QueryExecutor'

// ==========================================
// TYPES
// ==========================================

export type * from './types'

// ==========================================
// SUPPORT
// ==========================================

export { Collection } from './support/Collection'

// ==========================================
// EXCEPTIONS
// ==========================================

export * from './exceptions'

// ==========================================
// TESTING UTILITIES
// ==========================================

export {
  MockDriver,
  MockConnectionResolver,
  TestHelper,
  ModelFactory,
  FactoryRegistry,
  setConnectionResolver,
  resetConnectionResolver,
  getConnectionResolver,
  resolveConnection,
  type ConnectionResolverContract,
  type RecordedQuery,
  type MockResponse,
  type FactoryDefinition,
  type FactoryState
} from './testing'
