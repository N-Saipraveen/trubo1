/**
 * SQL to NoSQL Converter
 * Converts SQL schema and data to NoSQL (MongoDB-style) format
 */

import { Parser } from 'node-sql-parser';
import {
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
import {
  mapSqlToNoSql,
  sqlToNoSqlFieldName,
  tableToCollectionName,
} from '../utils/dataMapper';

const parser = new Parser();

/**
 * Convert SQL schema to NoSQL schema
 */
export function convertSqlToNoSql(
  sqlSchema: string,
  options: ConversionOptions = {}
): ConversionResult {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Parse SQL
    const tables = parseSqlSchema(sqlSchema);

    if (tables.length === 0) {
      return {
        success: false,
        schema: { collections: [], type: 'mongodb' } as NoSqlSchema,
        errors: ['No tables found in SQL schema'],
      };
    }

    // Convert each table to a collection
    const collections: NoSqlCollection[] = [];

    for (const table of tables) {
      const collection = convertTableToCollection(table, tables, options);
      collections.push(collection);

      // Check for potential embedding opportunities
      if (options.embedRelations) {
        const embeddingWarnings = analyzeEmbeddingOpportunities(table, tables);
        warnings.push(...embeddingWarnings);
      }
    }

    const noSqlSchema: NoSqlSchema = {
      collections,
      type: 'mongodb',
    };

    return {
      success: true,
      schema: noSqlSchema,
      warnings: warnings.length > 0 ? warnings : undefined,
      metadata: {
        sourceType: 'sql',
        targetType: 'nosql',
        tablesOrCollections: collections.length,
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
 * Parse SQL schema into table definitions
 */
function parseSqlSchema(sql: string): SqlTable[] {
  const tables: SqlTable[] = [];

  // Extract CREATE TABLE statements
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?\s*\(([\s\S]*?)\);/gi;
  const matches = sql.matchAll(createTableRegex);

  for (const match of matches) {
    const tableName = match[1];
    const tableBody = match[2];

    const table = parseTableDefinition(tableName, tableBody);
    tables.push(table);
  }

  return tables;
}

/**
 * Parse a single table definition
 */
function parseTableDefinition(tableName: string, tableBody: string): SqlTable {
  const columns: SqlColumn[] = [];
  const primaryKeys: string[] = [];
  const foreignKeys: SqlTable['foreignKeys'] = [];
  const uniqueConstraints: string[][] = [];

  // Split by comma (simplified - doesn't handle nested commas perfectly)
  const lines = tableBody.split(/,\s*(?![^(]*\))/);

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Primary key constraint
    if (/PRIMARY\s+KEY/i.test(trimmedLine)) {
      const pkMatch = trimmedLine.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        const cols = pkMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
        primaryKeys.push(...cols);
      }
      continue;
    }

    // Foreign key constraint
    if (/FOREIGN\s+KEY/i.test(trimmedLine)) {
      const fkMatch = trimmedLine.match(
        /FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(\w+)\s*\(([^)]+)\)/i
      );
      if (fkMatch) {
        foreignKeys.push({
          column: fkMatch[1].trim().replace(/`/g, ''),
          references: {
            table: fkMatch[2],
            column: fkMatch[3].trim().replace(/`/g, ''),
          },
        });
      }
      continue;
    }

    // Unique constraint
    if (/UNIQUE/i.test(trimmedLine) && /CONSTRAINT/i.test(trimmedLine)) {
      const uniqueMatch = trimmedLine.match(/UNIQUE\s*\(([^)]+)\)/i);
      if (uniqueMatch) {
        const cols = uniqueMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
        uniqueConstraints.push(cols);
      }
      continue;
    }

    // Column definition
    const column = parseColumnDefinition(trimmedLine);
    if (column) {
      columns.push(column);
      if (column.primaryKey) {
        primaryKeys.push(column.name);
      }
    }
  }

  return {
    name: tableName,
    columns,
    primaryKeys,
    foreignKeys,
    uniqueConstraints,
    checkConstraints: [],
    indexes: [],
  };
}

/**
 * Parse a column definition
 */
function parseColumnDefinition(columnDef: string): SqlColumn | null {
  // Basic pattern: column_name TYPE [constraints]
  const match = columnDef.match(/^`?(\w+)`?\s+(\w+)(\([^)]+\))?(.*)$/i);
  if (!match) return null;

  const name = match[1];
  const type = match[2];
  const typeParams = match[3] || '';
  const constraints = match[4] || '';

  const column: SqlColumn = {
    name,
    type: type.toUpperCase(),
    nullable: !/NOT\s+NULL/i.test(constraints),
    primaryKey: /PRIMARY\s+KEY/i.test(constraints),
    autoIncrement: /AUTO_INCREMENT|AUTOINCREMENT|SERIAL/i.test(constraints),
    unique: /UNIQUE/i.test(constraints),
  };

  // Extract length/precision
  if (typeParams) {
    const params = typeParams.slice(1, -1).split(',').map(p => parseInt(p.trim()));
    if (params.length > 0) column.length = params[0];
    if (params.length > 1) {
      column.precision = params[0];
      column.scale = params[1];
    }
  }

  // Extract default value
  const defaultMatch = constraints.match(/DEFAULT\s+([^,\s]+)/i);
  if (defaultMatch) {
    column.defaultValue = defaultMatch[1].replace(/'/g, '');
  }

  // Extract foreign key reference (inline)
  const refMatch = constraints.match(/REFERENCES\s+(\w+)\s*\((\w+)\)/i);
  if (refMatch) {
    column.references = {
      table: refMatch[1],
      column: refMatch[2],
    };
  }

  return column;
}

/**
 * Convert SQL table to NoSQL collection
 */
function convertTableToCollection(
  table: SqlTable,
  allTables: SqlTable[],
  options: ConversionOptions
): NoSqlCollection {
  const fields: NoSqlField[] = [];

  // Add _id field (MongoDB convention)
  if (options.generateIds !== false) {
    fields.push({
      name: '_id',
      type: NoSqlDataType.OBJECTID,
      required: true,
      unique: true,
    });
  }

  // Convert columns to fields
  for (const column of table.columns) {
    // Skip auto-increment primary keys (replaced by _id)
    if (column.autoIncrement && column.primaryKey && options.generateIds !== false) {
      continue;
    }

    const field = convertColumnToField(column, allTables, options);
    fields.push(field);
  }

  // Add timestamps if requested (only if they don't already exist)
  if (options.includeTimestamps) {
    const hasCreatedAt = fields.some(f => f.name === 'createdAt');
    const hasUpdatedAt = fields.some(f => f.name === 'updatedAt');

    if (!hasCreatedAt) {
      fields.push({
        name: 'createdAt',
        type: NoSqlDataType.DATE,
        required: true,
        default: 'Date.now',
      });
    }

    if (!hasUpdatedAt) {
      fields.push({
        name: 'updatedAt',
        type: NoSqlDataType.DATE,
        required: true,
        default: 'Date.now',
      });
    }
  }

  // Create indexes
  const indexes: NoSqlCollection['indexes'] = [];

  // Index on unique fields
  for (const field of fields) {
    if (field.unique && field.name !== '_id') {
      indexes.push({
        fields: { [field.name]: 1 },
        unique: true,
      });
    }
  }

  // Index on foreign keys
  for (const fk of table.foreignKeys) {
    const fieldName = options.preserveCase
      ? fk.column
      : sqlToNoSqlFieldName(fk.column);
    indexes.push({
      fields: { [fieldName]: 1 },
    });
  }

  const collectionName = options.preserveCase
    ? table.name
    : tableToCollectionName(table.name);

  return {
    name: collectionName,
    fields,
    indexes,
  };
}

/**
 * Normalize default values for MongoDB/Mongoose compatibility
 */
function normalizeDefaultValue(defaultValue: any, fieldType: NoSqlDataType): any {
  if (defaultValue === undefined || defaultValue === null) {
    return undefined;
  }

  const strValue = String(defaultValue).toUpperCase();

  // Convert boolean strings to actual booleans
  if (strValue === 'TRUE') return true;
  if (strValue === 'FALSE') return false;

  // Convert SQL-style date/timestamp defaults to MongoDB style
  if (strValue === 'CURRENT_TIMESTAMP' ||
      strValue === 'CURRENT_DATE' ||
      strValue === 'NOW()' ||
      strValue === 'GETDATE()' ||
      strValue === 'SYSDATE') {
    return 'Date.now';
  }

  // For date fields, if it's a function-like default, use Date.now
  if (fieldType === NoSqlDataType.DATE && strValue.includes('()')) {
    return 'Date.now';
  }

  // Return original value for other cases
  return defaultValue;
}

/**
 * Convert SQL column to NoSQL field
 */
function convertColumnToField(
  column: SqlColumn,
  allTables: SqlTable[],
  options: ConversionOptions
): NoSqlField {
  const fieldName = options.preserveCase
    ? column.name
    : sqlToNoSqlFieldName(column.name);

  const fieldType = mapSqlToNoSql(column.type);

  const field: NoSqlField = {
    name: fieldName,
    type: fieldType,
    required: !column.nullable,
  };

  if (column.unique) {
    field.unique = true;
  }

  if (column.defaultValue !== undefined) {
    field.default = normalizeDefaultValue(column.defaultValue, fieldType);
  }

  // Handle foreign key as reference
  if (column.references) {
    field.ref = options.preserveCase
      ? column.references.table
      : tableToCollectionName(column.references.table);
    field.type = NoSqlDataType.OBJECTID; // Assume reference by ID
  }

  return field;
}

/**
 * Analyze opportunities for embedding related data
 */
function analyzeEmbeddingOpportunities(
  table: SqlTable,
  allTables: SqlTable[]
): string[] {
  const warnings: string[] = [];

  // Find tables that reference this table
  for (const otherTable of allTables) {
    for (const fk of otherTable.foreignKeys) {
      if (fk.references.table === table.name) {
        warnings.push(
          `Consider embedding '${otherTable.name}' documents into '${table.name}' ` +
          `if the relationship is one-to-few and data is always accessed together`
        );
      }
    }
  }

  return warnings;
}

/**
 * Convert SQL data to NoSQL documents
 */
export function convertSqlDataToNoSql(
  sqlData: string,
  schema: NoSqlSchema
): any[] {
  const documents: any[] = [];

  // Parse INSERT statements
  const insertRegex = /INSERT\s+INTO\s+`?(\w+)`?\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi;
  const matches = sqlData.matchAll(insertRegex);

  for (const match of matches) {
    const tableName = match[1];
    const columns = match[2].split(',').map(c => c.trim().replace(/`/g, ''));
    const values = match[3].split(',').map(v => v.trim().replace(/^'|'$/g, ''));

    const doc: any = {};
    columns.forEach((col, i) => {
      const fieldName = sqlToNoSqlFieldName(col);
      doc[fieldName] = parseValue(values[i]);
    });

    documents.push(doc);
  }

  return documents;
}

function parseValue(value: string): any {
  if (value === 'NULL') return null;
  if (value === 'TRUE') return true;
  if (value === 'FALSE') return false;
  if (!isNaN(Number(value))) return Number(value);
  return value;
}
