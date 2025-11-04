/**
 * JSON Converters
 * Convert JSON data/schema to SQL or NoSQL formats
 */

import {
  JsonSchema,
  SqlSchema,
  SqlTable,
  SqlColumn,
  NoSqlSchema,
  NoSqlCollection,
  NoSqlField,
  NoSqlDataType,
  ConversionOptions,
  ConversionResult,
} from '../types';
import { mapNoSqlToSql, mapSqlToJsonType, sanitizeIdentifier } from '../utils/dataMapper';
import { convertNoSqlToSql } from './noSqlToSql';

/**
 * Convert JSON data to SQL schema
 */
export function convertJsonToSql(
  jsonData: any | any[],
  tableName: string = 'data',
  dialect: 'mysql' | 'postgresql' | 'sqlite' | 'mssql' = 'postgresql',
  options: ConversionOptions = {}
): ConversionResult {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
    if (dataArray.length === 0) {
      return {
        success: false,
        schema: '',
        errors: ['No data provided'],
      };
    }

    // Infer schema from JSON data
    const inferredSchema = inferSchemaFromJson(dataArray);

    // Convert to SQL table
    const table = jsonSchemaToTable(inferredSchema, tableName, dialect, options);

    // Generate DDL
    const ddl = generateTableDDL(table, dialect);

    // Generate INSERT statements
    const inserts = generateInsertStatements(dataArray, table);

    const fullSql = ddl + '\n\n' + inserts;

    return {
      success: true,
      schema: fullSql,
      data: dataArray,
      metadata: {
        sourceType: 'json',
        targetType: 'sql',
        tablesOrCollections: 1,
        conversionTime: Date.now() - startTime,
      },
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error during conversion');
    return {
      success: false,
      schema: '',
      errors,
    };
  }
}

/**
 * Convert JSON data to NoSQL schema
 */
export function convertJsonToNoSql(
  jsonData: any | any[],
  collectionName: string = 'data',
  options: ConversionOptions = {}
): ConversionResult {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
    if (dataArray.length === 0) {
      return {
        success: false,
        schema: { collections: [], type: 'mongodb' } as NoSqlSchema,
        errors: ['No data provided'],
      };
    }

    // Infer schema from JSON data
    const inferredSchema = inferSchemaFromJson(dataArray);

    // Convert to NoSQL collection
    const collection = jsonSchemaToCollection(inferredSchema, collectionName, options);

    const noSqlSchema: NoSqlSchema = {
      collections: [collection],
      type: 'mongodb',
    };

    return {
      success: true,
      schema: noSqlSchema,
      data: dataArray,
      metadata: {
        sourceType: 'json',
        targetType: 'nosql',
        tablesOrCollections: 1,
        conversionTime: Date.now() - startTime,
      },
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error during conversion');
    return {
      success: false,
      schema: { collections: [], type: 'mongodb' } as NoSqlSchema,
      errors,
    };
  }
}

/**
 * Convert SQL schema to JSON Schema
 */
export function convertSqlToJson(sql: string): ConversionResult {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    // This is simplified - parse basic CREATE TABLE
    const tableMatch = sql.match(/CREATE\s+TABLE\s+(\w+)\s*\(([\s\S]+?)\);/i);
    if (!tableMatch) {
      return {
        success: false,
        schema: { type: 'object', properties: {} } as JsonSchema,
        errors: ['No valid CREATE TABLE statement found'],
      };
    }

    const tableName = tableMatch[1];
    const tableBody = tableMatch[2];

    const jsonSchema: JsonSchema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {},
      required: [],
    };

    // Parse columns
    const lines = tableBody.split(/,\s*(?![^(]*\))/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (/PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CONSTRAINT/i.test(trimmed)) {
        continue;
      }

      const match = trimmed.match(/^(\w+)\s+(\w+)(\([^)]+\))?(.*)$/i);
      if (match) {
        const columnName = match[1];
        const columnType = match[2];
        const constraints = match[4] || '';

        const jsonType = mapSqlToJsonType(columnType);
        jsonSchema.properties![columnName] = { type: jsonType };

        if (/NOT\s+NULL/i.test(constraints)) {
          jsonSchema.required!.push(columnName);
        }
      }
    }

    return {
      success: true,
      schema: jsonSchema,
      metadata: {
        sourceType: 'sql',
        targetType: 'json',
        tablesOrCollections: 1,
        conversionTime: Date.now() - startTime,
      },
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error during conversion');
    return {
      success: false,
      schema: { type: 'object', properties: {} } as JsonSchema,
      errors,
    };
  }
}

/**
 * Infer JSON Schema from sample data
 */
function inferSchemaFromJson(data: any[]): JsonSchema {
  const schema: JsonSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    required: [],
  };

  // Collect all keys from all objects
  const allKeys = new Set<string>();
  const keyTypes = new Map<string, Set<string>>();
  const keyRequired = new Map<string, number>();

  for (const item of data) {
    if (typeof item !== 'object' || item === null) continue;

    const keys = Object.keys(item);
    for (const key of keys) {
      allKeys.add(key);

      const value = item[key];
      const type = getJsonType(value);

      if (!keyTypes.has(key)) {
        keyTypes.set(key, new Set());
      }
      keyTypes.get(key)!.add(type);

      keyRequired.set(key, (keyRequired.get(key) || 0) + 1);
    }
  }

  // Build properties
  for (const key of allKeys) {
    const types = Array.from(keyTypes.get(key)!);
    const type = types.length === 1 ? types[0] : 'string'; // Default to string if mixed types

    schema.properties![key] = { type };

    // Mark as required if present in all objects
    if (keyRequired.get(key) === data.length) {
      schema.required!.push(key);
    }

    // Handle arrays and objects
    const sampleValue = data.find(item => item[key] !== undefined && item[key] !== null)?.[key];
    if (type === 'array' && Array.isArray(sampleValue) && sampleValue.length > 0) {
      const itemType = getJsonType(sampleValue[0]);
      schema.properties![key].items = { type: itemType };
    } else if (type === 'object' && sampleValue && typeof sampleValue === 'object') {
      schema.properties![key].properties = inferObjectProperties(sampleValue);
    }
  }

  return schema;
}

/**
 * Get JSON type from value
 */
function getJsonType(value: any): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'string') {
    // Check if it's a date
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'string'; // ISO date
  }
  return 'string';
}

/**
 * Infer properties from object
 */
function inferObjectProperties(obj: any): Record<string, any> {
  const properties: Record<string, any> = {};
  for (const key in obj) {
    const type = getJsonType(obj[key]);
    properties[key] = { type };
  }
  return properties;
}

/**
 * Convert JSON Schema to SQL table
 */
function jsonSchemaToTable(
  jsonSchema: JsonSchema,
  tableName: string,
  dialect: 'mysql' | 'postgresql' | 'sqlite' | 'mssql',
  options: ConversionOptions
): SqlTable {
  const columns: SqlColumn[] = [];

  // Add auto-increment ID
  columns.push({
    name: 'id',
    type: dialect === 'postgresql' ? 'SERIAL' : 'INTEGER',
    nullable: false,
    primaryKey: true,
    autoIncrement: true,
    unique: true,
  });

  // Convert properties to columns
  if (jsonSchema.properties) {
    for (const [key, prop] of Object.entries(jsonSchema.properties)) {
      const sqlType = jsonTypeToSqlType(prop.type, dialect);
      const column: SqlColumn = {
        name: sanitizeIdentifier(key),
        type: sqlType,
        nullable: !jsonSchema.required?.includes(key),
        primaryKey: false,
        autoIncrement: false,
        unique: false,
      };
      columns.push(column);
    }
  }

  // Add timestamps if requested
  if (options.includeTimestamps) {
    columns.push(
      {
        name: 'created_at',
        type: 'TIMESTAMP',
        nullable: false,
        primaryKey: false,
        autoIncrement: false,
        unique: false,
        defaultValue: 'CURRENT_TIMESTAMP',
      }
    );
  }

  return {
    name: sanitizeIdentifier(tableName),
    columns,
    primaryKeys: ['id'],
    foreignKeys: [],
    uniqueConstraints: [],
    checkConstraints: [],
    indexes: [],
  };
}

/**
 * Convert JSON Schema to NoSQL collection
 */
function jsonSchemaToCollection(
  jsonSchema: JsonSchema,
  collectionName: string,
  options: ConversionOptions
): NoSqlCollection {
  const fields: NoSqlField[] = [];

  // Add _id field
  fields.push({
    name: '_id',
    type: NoSqlDataType.OBJECTID,
    required: true,
    unique: true,
  });

  // Convert properties to fields
  if (jsonSchema.properties) {
    for (const [key, prop] of Object.entries(jsonSchema.properties)) {
      const noSqlType = jsonTypeToNoSqlType(prop.type);
      const field: NoSqlField = {
        name: key,
        type: noSqlType,
        required: jsonSchema.required?.includes(key) || false,
      };

      if (prop.type === 'array' && prop.items) {
        field.arrayOf = jsonTypeToNoSqlType(prop.items.type);
      }

      fields.push(field);
    }
  }

  return {
    name: collectionName,
    fields,
    indexes: [],
  };
}

/**
 * Map JSON type to SQL type
 */
function jsonTypeToSqlType(
  jsonType: string,
  dialect: 'mysql' | 'postgresql' | 'sqlite' | 'mssql'
): string {
  switch (jsonType) {
    case 'string':
      return 'VARCHAR(255)';
    case 'number':
      return dialect === 'postgresql' ? 'NUMERIC' : 'DECIMAL(10,2)';
    case 'integer':
      return 'INTEGER';
    case 'boolean':
      return 'BOOLEAN';
    case 'object':
      return dialect === 'postgresql' ? 'JSONB' : 'JSON';
    case 'array':
      return dialect === 'postgresql' ? 'JSONB' : 'JSON';
    default:
      return 'TEXT';
  }
}

/**
 * Map JSON type to NoSQL type
 */
function jsonTypeToNoSqlType(jsonType: string): NoSqlDataType {
  switch (jsonType) {
    case 'string':
      return NoSqlDataType.STRING;
    case 'number':
    case 'integer':
      return NoSqlDataType.NUMBER;
    case 'boolean':
      return NoSqlDataType.BOOLEAN;
    case 'object':
      return NoSqlDataType.OBJECT;
    case 'array':
      return NoSqlDataType.ARRAY;
    default:
      return NoSqlDataType.STRING;
  }
}

/**
 * Generate table DDL
 */
function generateTableDDL(
  table: SqlTable,
  dialect: 'mysql' | 'postgresql' | 'sqlite' | 'mssql'
): string {
  let ddl = `CREATE TABLE ${table.name} (\n`;

  const columnDefs: string[] = table.columns.map(col => {
    let def = `  ${col.name} ${col.type}`;
    if (!col.nullable) def += ' NOT NULL';
    if (col.autoIncrement && dialect === 'mysql') def += ' AUTO_INCREMENT';
    if (col.autoIncrement && dialect === 'sqlite') def += ' AUTOINCREMENT';
    if (col.unique && !col.primaryKey) def += ' UNIQUE';
    if (col.defaultValue !== undefined) {
      def += ` DEFAULT ${typeof col.defaultValue === 'string' ? `'${col.defaultValue}'` : col.defaultValue}`;
    }
    return def;
  });

  if (table.primaryKeys.length > 0) {
    columnDefs.push(`  PRIMARY KEY (${table.primaryKeys.join(', ')})`);
  }

  ddl += columnDefs.join(',\n');
  ddl += '\n);';

  return ddl;
}

/**
 * Generate INSERT statements from data
 */
function generateInsertStatements(data: any[], table: SqlTable): string {
  const inserts: string[] = [];

  for (const item of data) {
    const columns: string[] = [];
    const values: string[] = [];

    for (const col of table.columns) {
      if (col.autoIncrement) continue; // Skip auto-increment columns

      if (item[col.name] !== undefined) {
        columns.push(col.name);
        const value = item[col.name];

        if (value === null) {
          values.push('NULL');
        } else if (typeof value === 'string') {
          values.push(`'${value.replace(/'/g, "''")}'`);
        } else if (typeof value === 'object') {
          values.push(`'${JSON.stringify(value).replace(/'/g, "''")}'`);
        } else {
          values.push(String(value));
        }
      }
    }

    if (columns.length > 0) {
      inserts.push(
        `INSERT INTO ${table.name} (${columns.join(', ')}) VALUES (${values.join(', ')});`
      );
    }
  }

  return inserts.join('\n');
}
