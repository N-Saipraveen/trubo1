/**
 * Data type mapping utilities between SQL, NoSQL, and JSON
 */

import { SqlDataType, NoSqlDataType } from '../types';

/**
 * Map SQL data type to NoSQL data type
 */
export function mapSqlToNoSql(sqlType: string): NoSqlDataType {
  const type = sqlType.toUpperCase();

  if (type.includes('INT') || type.includes('SERIAL')) {
    return NoSqlDataType.NUMBER;
  }
  if (type.includes('VARCHAR') || type.includes('CHAR') || type.includes('TEXT')) {
    return NoSqlDataType.STRING;
  }
  if (type.includes('BOOL')) {
    return NoSqlDataType.BOOLEAN;
  }
  if (type.includes('DATE') || type.includes('TIME')) {
    return NoSqlDataType.DATE;
  }
  if (type.includes('DECIMAL') || type.includes('FLOAT') || type.includes('DOUBLE') || type.includes('NUMERIC')) {
    return NoSqlDataType.NUMBER;
  }
  if (type.includes('JSON') || type.includes('JSONB')) {
    return NoSqlDataType.OBJECT;
  }
  if (type.includes('BLOB') || type.includes('BINARY')) {
    return NoSqlDataType.BINARY;
  }

  return NoSqlDataType.MIXED;
}

/**
 * Map NoSQL data type to SQL data type
 */
export function mapNoSqlToSql(
  noSqlType: NoSqlDataType | string,
  dialect: 'mysql' | 'postgresql' | 'sqlite' | 'mssql' = 'postgresql'
): string {
  const type = typeof noSqlType === 'string' ? noSqlType.toLowerCase() : noSqlType;

  switch (type) {
    case NoSqlDataType.STRING:
    case 'string':
      return 'VARCHAR(255)';

    case NoSqlDataType.NUMBER:
    case 'number':
      return dialect === 'postgresql' ? 'NUMERIC' : 'DECIMAL(10,2)';

    case NoSqlDataType.BOOLEAN:
    case 'boolean':
      return 'BOOLEAN';

    case NoSqlDataType.DATE:
    case 'date':
      return 'TIMESTAMP';

    case NoSqlDataType.OBJECT:
    case 'object':
      if (dialect === 'postgresql') return 'JSONB';
      if (dialect === 'mysql') return 'JSON';
      return 'TEXT'; // SQLite fallback

    case NoSqlDataType.ARRAY:
    case 'array':
      if (dialect === 'postgresql') return 'JSONB';
      if (dialect === 'mysql') return 'JSON';
      return 'TEXT';

    case NoSqlDataType.OBJECTID:
    case 'objectId':
      return 'VARCHAR(24)'; // MongoDB ObjectId is 24 hex characters

    case NoSqlDataType.BINARY:
    case 'binary':
      return 'BYTEA';

    default:
      return 'TEXT';
  }
}

/**
 * Map SQL type to JSON Schema type
 */
export function mapSqlToJsonType(sqlType: string): string {
  const type = sqlType.toUpperCase();

  if (type.includes('INT') || type.includes('SERIAL') ||
      type.includes('DECIMAL') || type.includes('FLOAT') ||
      type.includes('DOUBLE') || type.includes('NUMERIC')) {
    return 'number';
  }
  if (type.includes('VARCHAR') || type.includes('CHAR') || type.includes('TEXT')) {
    return 'string';
  }
  if (type.includes('BOOL')) {
    return 'boolean';
  }
  if (type.includes('DATE') || type.includes('TIME')) {
    return 'string'; // ISO date format
  }
  if (type.includes('JSON') || type.includes('JSONB')) {
    return 'object';
  }

  return 'string';
}

/**
 * Map NoSQL type to JSON Schema type
 */
export function mapNoSqlToJsonType(noSqlType: NoSqlDataType | string): string {
  const type = typeof noSqlType === 'string' ? noSqlType.toLowerCase() : noSqlType;

  switch (type) {
    case NoSqlDataType.STRING:
    case 'string':
    case NoSqlDataType.OBJECTID:
    case 'objectId':
      return 'string';

    case NoSqlDataType.NUMBER:
    case 'number':
      return 'number';

    case NoSqlDataType.BOOLEAN:
    case 'boolean':
      return 'boolean';

    case NoSqlDataType.DATE:
    case 'date':
      return 'string';

    case NoSqlDataType.OBJECT:
    case 'object':
      return 'object';

    case NoSqlDataType.ARRAY:
    case 'array':
      return 'array';

    case NoSqlDataType.NULL:
    case 'null':
      return 'null';

    default:
      return 'string';
  }
}

/**
 * Convert SQL column name to NoSQL field name (camelCase)
 */
export function sqlToNoSqlFieldName(sqlName: string): string {
  // Convert snake_case or UPPER_CASE to camelCase
  return sqlName
    .toLowerCase()
    .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert NoSQL field name to SQL column name (snake_case)
 */
export function noSqlToSqlFieldName(noSqlName: string): string {
  // Convert camelCase to snake_case
  return noSqlName
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Sanitize identifier (table/column name)
 */
export function sanitizeIdentifier(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^[0-9]/, '_$&'); // Can't start with number
}

/**
 * Generate MongoDB-style collection name from SQL table name
 */
export function tableToCollectionName(tableName: string): string {
  // Convert to camelCase and optionally pluralize
  const camelCase = sqlToNoSqlFieldName(tableName);
  // Simple pluralization (not perfect but reasonable)
  if (!camelCase.endsWith('s') && !camelCase.endsWith('data')) {
    return camelCase + 's';
  }
  return camelCase;
}

/**
 * Generate SQL table name from NoSQL collection name
 */
export function collectionToTableName(collectionName: string): string {
  // Convert to snake_case and optionally singularize
  let tableName = noSqlToSqlFieldName(collectionName);
  // Simple singularization
  if (tableName.endsWith('ies')) {
    tableName = tableName.slice(0, -3) + 'y';
  } else if (tableName.endsWith('s') && !tableName.endsWith('ss')) {
    tableName = tableName.slice(0, -1);
  }
  return tableName.toUpperCase();
}
