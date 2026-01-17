/**
 * Model Type Definitions
 *
 * Type definitions for Active Record models, attributes, and casting.
 */

import type { Constructor } from "./utils";

/**
 * Attribute cast types
 */
export type CastType =
  | "string"
  | "number"
  | "int"
  | "integer"
  | "float"
  | "double"
  | "boolean"
  | "bool"
  | "date"
  | "datetime"
  | "timestamp"
  | "json"
  | "array"
  | "object";

/**
 * Model casting configuration
 */
export type ModelCasts = Record<string, CastType>;

/**
 * Model attributes (raw data)
 */
export type ModelAttributes<T = any> = Record<string, T>;

/**
 * Model lifecycle events
 */
export type ModelEvent =
  | "creating"
  | "created"
  | "updating"
  | "updated"
  | "saving"
  | "saved"
  | "deleting"
  | "deleted"
  | "restoring"
  | "restored";

/**
 * Model event handler
 */
export type ModelEventHandler = () => void | Promise<void>;

/**
 * Model options
 */
export interface ModelOptions {
  /**
   * Table name
   */
  table?: string;

  /**
   * Primary key column
   */
  primaryKey?: string;

  /**
   * Database connection name
   */
  connection?: string;

  /**
   * Enable timestamps (created_at, updated_at)
   */
  timestamps?: boolean;

  /**
   * Enable soft deletes
   */
  softDeletes?: boolean;

  /**
   * Created at column name
   */
  createdAtColumn?: string;

  /**
   * Updated at column name
   */
  updatedAtColumn?: string;

  /**
   * Deleted at column name
   */
  deletedAtColumn?: string;
}

/**
 * Relation types
 */
export type RelationType =
  | "hasOne"
  | "hasMany"
  | "belongsTo"
  | "belongsToMany"
  | "morphTo";

/**
 * Relation configuration
 */
export interface RelationConfig {
  /**
   * Relation type
   */
  type: RelationType;

  /**
   * Related model constructor
   */
  related: Constructor;

  /**
   * Foreign key column
   */
  foreignKey?: string;

  /**
   * Local key column
   */
  localKey?: string;

  /**
   * Pivot table name (belongsToMany)
   */
  pivotTable?: string;

  /**
   * Foreign pivot key (belongsToMany)
   */
  foreignPivotKey?: string;

  /**
   * Related pivot key (belongsToMany)
   */
  relatedPivotKey?: string;
}

/**
 * Extract model attributes type
 */
export type ModelAttributesType<T> = {
  [K in keyof T]: T[K] extends Function ? never : T[K];
};

/**
 * Extract model methods type
 */
export type ModelMethodsType<T> = {
  [K in keyof T]: T[K] extends Function ? T[K] : never;
};
