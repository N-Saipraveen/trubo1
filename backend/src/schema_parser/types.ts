/**
 * Standardized JSON Schema Types
 * This is the "source of truth" for all schema conversions
 */

export interface StandardizedSchema {
  version: string; // Schema format version
  metadata: SchemaMetadata;
  tables: Table[];
  relationships: Relationship[];
}

export interface SchemaMetadata {
  sourceType: 'mysql' | 'postgresql' | 'sqlite' | 'mongodb' | 'json' | 'unknown';
  databaseName?: string;
  extractedAt: string; // ISO timestamp
  extractedBy: 'ai' | 'manual' | 'parser';
}

export interface Table {
  name: string;
  type: 'table' | 'collection' | 'view';
  columns: Column[];
  primaryKey?: PrimaryKey;
  foreignKeys: ForeignKey[];
  indexes: Index[];
  constraints: Constraint[];
  metadata?: TableMetadata;
}

export interface Column {
  name: string;
  type: string; // Normalized type (e.g., "string", "integer", "decimal", etc.)
  originalType?: string; // Original SQL/NoSQL type
  nullable: boolean;
  unique: boolean;
  autoIncrement?: boolean;
  defaultValue?: any;
  length?: number;
  precision?: number;
  scale?: number;
  enum?: string[];
  comment?: string;
}

export interface PrimaryKey {
  columns: string[];
  name?: string;
}

export interface ForeignKey {
  name?: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface Index {
  name: string;
  columns: string[];
  unique: boolean;
  type?: 'BTREE' | 'HASH' | 'FULLTEXT' | 'SPATIAL';
}

export interface Constraint {
  name?: string;
  type: 'CHECK' | 'UNIQUE' | 'PRIMARY KEY' | 'FOREIGN KEY';
  definition: string;
  columns?: string[];
}

export interface TableMetadata {
  rowCount?: number;
  engine?: string;
  charset?: string;
  collation?: string;
  comment?: string;
}

export interface Relationship {
  id: string;
  type: 'one_to_one' | 'one_to_many' | 'many_to_many';
  from: RelationshipEnd;
  to: RelationshipEnd;
  metadata?: RelationshipMetadata;
}

export interface RelationshipEnd {
  table: string;
  columns: string[];
}

export interface RelationshipMetadata {
  junctionTable?: string;
  cascade?: boolean;
  description?: string;
}

/**
 * Normalized type mapping
 */
export const NORMALIZED_TYPES = {
  STRING: 'string',
  TEXT: 'text',
  INTEGER: 'integer',
  BIGINT: 'bigint',
  DECIMAL: 'decimal',
  FLOAT: 'float',
  DOUBLE: 'double',
  BOOLEAN: 'boolean',
  DATE: 'date',
  DATETIME: 'datetime',
  TIMESTAMP: 'timestamp',
  TIME: 'time',
  BLOB: 'blob',
  JSON: 'json',
  UUID: 'uuid',
  ENUM: 'enum',
} as const;

export type NormalizedType = typeof NORMALIZED_TYPES[keyof typeof NORMALIZED_TYPES];
