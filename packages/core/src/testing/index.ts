/**
 * Testing Utilities
 *
 * Tools for testing Velvet ORM models and queries.
 */

// Connection mocking
export {
  type ConnectionResolverContract,
  DefaultConnectionResolver,
  getConnectionResolver,
  setConnectionResolver,
  resetConnectionResolver,
  resolveConnection
} from './ConnectionResolver'

// Mock driver
export { MockDriver, type RecordedQuery, type MockResponse } from './MockDriver'

// Mock connection resolver
export { MockConnectionResolver } from './MockConnectionResolver'

// Model factories
export { ModelFactory, FactoryRegistry, type FactoryDefinition, type FactoryState } from './ModelFactory'

// Test helpers
export { TestHelper } from './TestHelper'
