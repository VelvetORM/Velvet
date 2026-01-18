/**
 * ModelGenerator
 *
 * Generates a model class and attributes interface from a Blueprint.
 */

import type { Blueprint } from "../Schema";
import type { ColumnDefinition, ColumnType } from "../types";

type TypeMap = {
  type: string;
  cast?: string;
};

const COLUMN_TYPE_MAP: Record<ColumnType, TypeMap> = {
  string: { type: "string" },
  text: { type: "string" },
  integer: { type: "number" },
  bigInteger: { type: "number" },
  float: { type: "number" },
  double: { type: "number" },
  decimal: { type: "number" },
  boolean: { type: "boolean", cast: "boolean" },
  date: { type: "Date", cast: "date" },
  datetime: { type: "Date", cast: "datetime" },
  timestamp: { type: "Date", cast: "timestamp" },
  time: { type: "string" },
  json: { type: "Record<string, unknown>", cast: "json" },
  jsonb: { type: "Record<string, unknown>", cast: "json" },
  uuid: { type: "string" },
  binary: { type: "Uint8Array" },
  enum: { type: "string" }
};

const toPascalCase = (value: string): string =>
  value
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const singularize = (value: string): string => {
  if (value.endsWith("ies")) {
    return value.slice(0, -3) + "y";
  }
  if (value.endsWith("s") && value.length > 1) {
    return value.slice(0, -1);
  }
  return value;
};

const inferColumnType = (column: Partial<ColumnDefinition>): TypeMap => {
  const type = column.type || "string";
  return COLUMN_TYPE_MAP[type];
};

export class ModelGenerator {
  static generateModel(blueprint: Blueprint): string {
    const tableName = blueprint.tableName;
    const modelName = toPascalCase(singularize(tableName));
    const columns = blueprint.getColumns();

    const attributes = columns
      .map((column) => this.buildAttributeLine(column))
      .filter((line) => line.length > 0)
      .join("\n");

    const casts = columns
      .map((column) => this.buildCastEntry(column))
      .filter((line) => line.length > 0)
      .join("\n");

    const hasCasts = casts.length > 0;

    const imports = [
      "import { Model } from \"@velvet/core\";",
      hasCasts ? "import type { CastMap } from \"@velvet/core\";" : ""
    ].filter((line) => line.length > 0);

    return [
      ...imports,
      "",
      `export interface ${modelName}Attributes {`,
      attributes || "  //",
      "}",
      "",
      `export class ${modelName} extends Model<${modelName}Attributes> {`,
      `  static table = \"${tableName}\";`,
      hasCasts ? "  protected casts: CastMap = {" : "",
      hasCasts ? casts : "",
      hasCasts ? "  };" : "",
      "}",
      ""
    ]
      .filter((line) => line !== "")
      .join("\n");
  }

  private static buildAttributeLine(column: Partial<ColumnDefinition>): string {
    if (!column.name) {
      return "";
    }

    const { type } = inferColumnType(column);
    const nullable = column.nullable ? " | null" : "";
    return `  ${column.name}: ${type}${nullable};`;
  }

  private static buildCastEntry(column: Partial<ColumnDefinition>): string {
    if (!column.name || !column.type) {
      return "";
    }

    const { cast } = inferColumnType(column);
    if (!cast) {
      return "";
    }

    return `    ${column.name}: \"${cast}\",`;
  }
}
