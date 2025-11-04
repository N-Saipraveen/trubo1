/**
 * Core type definitions for TurboDbx
 */

// SQL Data Types
export enum SqlDataType {
  INTEGER = 'INTEGER',
  BIGINT = 'BIGINT',
  VARCHAR = 'VARCHAR',
  TEXT = 'TEXT',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  TIMESTAMP = 'TIMESTAMP',
  DECIMAL = 'DECIMAL',
  FLOAT = 'FLOAT',
  DOUBLE = 'DOUBLE',
  JSON = 'JSON',
  BLOB = 'BLOB',
}

// NoSQL Data Types (MongoDB-style)
export enum NoSqlDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  OBJECT = 'object',
  ARRAY = 'array',
  OBJECTID = 'objectId',
  NULL = 'null',
  BINARY = 'binary',
  MIXED = 'mixed',
}

// SQL Column Definition
export interface SqlColumn {
  name: string;
  type: SqlDataType | string;
  length?: number;
  precision?: number;
  scale?: number;
  nullable: boolean;
  primaryKey: boolean;
  autoIncrement: boolean;
  unique: boolean;
  defaultValue?: any;
  references?: {
    table: string;
    column: string;
  };
  check?: string;
}

// SQL Table Definition
export interface SqlTable {
  name: string;
  columns: SqlColumn[];
  primaryKeys: string[];
  foreignKeys: Array<{
    column: string;
    references: {
      table: string;
      column: string;
    };
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  }>;
  uniqueConstraints: string[][];
  checkConstraints: Array<{
    name?: string;
    expression: string;
  }>;
  indexes: Array<{
    name: string;
    columns: string[];
    unique: boolean;
  }>;
}

// SQL Schema
export interface SqlSchema {
  tables: SqlTable[];
  dialect: 'mysql' | 'postgresql' | 'sqlite' | 'mssql';
}

// NoSQL Field Definition
export interface NoSqlField {
  name: string;
  type: NoSqlDataType | string;
  required: boolean;
  unique?: boolean;
  default?: any;
  nested?: NoSqlField[];
  arrayOf?: NoSqlDataType | string;
  ref?: string; // Reference to another collection
  index?: boolean;
  enum?: any[];
}

// NoSQL Collection Definition
export interface NoSqlCollection {
  name: string;
  fields: NoSqlField[];
  indexes: Array<{
    fields: Record<string, 1 | -1>;
    unique?: boolean;
    sparse?: boolean;
  }>;
  validationRules?: any;
}

// NoSQL Schema
export interface NoSqlSchema {
  collections: NoSqlCollection[];
  type: 'mongodb' | 'dynamodb' | 'cassandra';
}

// JSON Schema (JSON Schema Draft 7 compliant)
export interface JsonSchema {
  $schema?: string;
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  items?: any;
  additionalProperties?: boolean;
  definitions?: Record<string, any>;
}

// Conversion Options
export interface ConversionOptions {
  preserveCase?: boolean;
  generateIds?: boolean;
  embedRelations?: boolean; // For SQL to NoSQL: embed related data
  normalizeDepth?: number; // For NoSQL to SQL: how many levels to normalize
  includeTimestamps?: boolean;
  strictMode?: boolean;
}

// Conversion Result
export interface ConversionResult {
  success: boolean;
  schema: SqlSchema | NoSqlSchema | JsonSchema | string;
  data?: any[];
  errors?: string[];
  warnings?: string[];
  metadata?: {
    sourceType: string;
    targetType: string;
    tablesOrCollections: number;
    conversionTime: number;
  };
}

// Schema Analysis Result
export interface SchemaAnalysis {
  type: 'sql' | 'nosql' | 'json' | 'unknown';
  dialect?: string;
  structure: {
    tables?: number;
    collections?: number;
    totalFields: number;
    relationships: number;
    indexes: number;
  };
  quality: {
    hasConstraints: boolean;
    hasIndexes: boolean;
    normalizedLevel?: number;
  };
  suggestions?: string[];
}
