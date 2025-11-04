/**
 * Type Mapping Utilities
 * Maps data types between SQL and NoSQL databases
 */

// SQL to MongoDB type mapping
export const sqlToMongoTypeMap: Record<string, string> = {
  // Numeric types
  INT: 'number',
  INTEGER: 'number',
  BIGINT: 'long',
  SMALLINT: 'number',
  TINYINT: 'number',
  DECIMAL: 'decimal',
  NUMERIC: 'decimal',
  FLOAT: 'double',
  DOUBLE: 'double',
  REAL: 'double',

  // String types
  VARCHAR: 'string',
  CHAR: 'string',
  TEXT: 'string',
  TINYTEXT: 'string',
  MEDIUMTEXT: 'string',
  LONGTEXT: 'string',

  // Date/Time types
  DATE: 'date',
  DATETIME: 'date',
  TIMESTAMP: 'timestamp',
  TIME: 'string',
  YEAR: 'number',

  // Binary types
  BLOB: 'binData',
  BINARY: 'binData',
  VARBINARY: 'binData',

  // Boolean
  BOOLEAN: 'bool',
  BOOL: 'bool',

  // Special types
  JSON: 'object',
  JSONB: 'object',
  UUID: 'string',
  ENUM: 'string',
};

// MongoDB to SQL type mapping (PostgreSQL style)
export const mongoToSqlTypeMap: Record<string, string> = {
  // BSON types to SQL
  string: 'VARCHAR(255)',
  number: 'INTEGER',
  long: 'BIGINT',
  double: 'DOUBLE PRECISION',
  decimal: 'DECIMAL(10,2)',

  bool: 'BOOLEAN',
  boolean: 'BOOLEAN',

  date: 'TIMESTAMP',
  timestamp: 'TIMESTAMP',

  object: 'JSONB',
  array: 'JSONB',

  objectid: 'VARCHAR(24)',
  objectId: 'VARCHAR(24)',
  bindata: 'BYTEA',
  binData: 'BYTEA',

  null: 'NULL',
  undefined: 'NULL',
};

// MySQL to PostgreSQL type mapping
export const mysqlToPostgresTypeMap: Record<string, string> = {
  INT: 'INTEGER',
  TINYINT: 'SMALLINT',
  SMALLINT: 'SMALLINT',
  MEDIUMINT: 'INTEGER',
  BIGINT: 'BIGINT',

  FLOAT: 'REAL',
  DOUBLE: 'DOUBLE PRECISION',
  DECIMAL: 'DECIMAL',

  CHAR: 'CHAR',
  VARCHAR: 'VARCHAR',
  TEXT: 'TEXT',
  TINYTEXT: 'TEXT',
  MEDIUMTEXT: 'TEXT',
  LONGTEXT: 'TEXT',

  DATE: 'DATE',
  DATETIME: 'TIMESTAMP',
  TIMESTAMP: 'TIMESTAMP',
  TIME: 'TIME',
  YEAR: 'INTEGER',

  BLOB: 'BYTEA',
  TINYBLOB: 'BYTEA',
  MEDIUMBLOB: 'BYTEA',
  LONGBLOB: 'BYTEA',

  JSON: 'JSONB',
  BOOLEAN: 'BOOLEAN',
  ENUM: 'VARCHAR',
};

// PostgreSQL to MySQL type mapping
export const postgresToMysqlTypeMap: Record<string, string> = {
  INTEGER: 'INT',
  SMALLINT: 'SMALLINT',
  BIGINT: 'BIGINT',

  REAL: 'FLOAT',
  'DOUBLE PRECISION': 'DOUBLE',
  DECIMAL: 'DECIMAL',
  NUMERIC: 'DECIMAL',

  CHAR: 'CHAR',
  VARCHAR: 'VARCHAR',
  TEXT: 'TEXT',

  DATE: 'DATE',
  TIMESTAMP: 'DATETIME',
  'TIMESTAMP WITH TIME ZONE': 'DATETIME',
  'TIMESTAMP WITHOUT TIME ZONE': 'DATETIME',
  TIME: 'TIME',

  BYTEA: 'BLOB',

  JSONB: 'JSON',
  JSON: 'JSON',
  BOOLEAN: 'BOOLEAN',
  UUID: 'VARCHAR(36)',
};

/**
 * Normalize SQL type string (remove size, constraints, etc.)
 */
export function normalizeSqlType(type: string): string {
  // Remove parentheses and everything inside them
  const baseType = type.replace(/\([^)]*\)/g, '').trim().toUpperCase();

  // Handle special cases
  if (baseType.includes('INT')) return 'INTEGER';
  if (baseType.includes('CHAR')) return 'VARCHAR';
  if (baseType.includes('TEXT')) return 'TEXT';

  return baseType;
}

/**
 * Get MongoDB type from SQL type
 */
export function sqlToMongoType(sqlType: string): string {
  const normalized = normalizeSqlType(sqlType);
  return sqlToMongoTypeMap[normalized] || 'string';
}

/**
 * Get SQL type from MongoDB type
 */
export function mongoToSqlType(mongoType: string, dialect: 'mysql' | 'postgresql' = 'postgresql'): string {
  return mongoToSqlTypeMap[mongoType.toLowerCase()] || 'VARCHAR(255)';
}

/**
 * Convert MySQL type to PostgreSQL
 */
export function mysqlToPostgresType(mysqlType: string): string {
  const normalized = normalizeSqlType(mysqlType);
  return mysqlToPostgresTypeMap[normalized] || mysqlType;
}

/**
 * Convert PostgreSQL type to MySQL
 */
export function postgresToMysqlType(postgresType: string): string {
  const normalized = postgresType.toUpperCase();
  return postgresToMysqlTypeMap[normalized] || postgresType;
}

/**
 * Infer database type from schema structure
 */
export function inferDatabaseType(schema: any): 'sql' | 'nosql' | 'json' | 'unknown' {
  if (typeof schema === 'string') {
    if (schema.trim().toUpperCase().startsWith('CREATE TABLE')) {
      return 'sql';
    }
  }

  if (typeof schema === 'object') {
    if (schema.collections || schema.type === 'mongodb' || schema._id) {
      return 'nosql';
    }
    if (Array.isArray(schema) || schema.data) {
      return 'json';
    }
  }

  return 'unknown';
}

/**
 * Extract size from type definition (e.g., VARCHAR(255) -> 255)
 */
export function extractTypeSize(type: string): number | null {
  const match = type.match(/\((\d+)\)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Build SQL type with size (e.g., buildSqlType('VARCHAR', 255) -> 'VARCHAR(255)')
 */
export function buildSqlType(baseType: string, size?: number): string {
  if (size && ['VARCHAR', 'CHAR', 'DECIMAL', 'NUMERIC'].includes(baseType.toUpperCase())) {
    return `${baseType}(${size})`;
  }
  return baseType;
}
