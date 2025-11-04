/**
 * NoSQL to SQL Transformer
 * Transforms NoSQL (MongoDB) schemas to SQL format
 */

import { NoSqlSchema, NoSqlCollection, NoSqlField } from '../extract/nosqlExtractor';
import { SqlSchema, SqlTable, SqlColumn, SqlForeignKey } from '../extract/sqlExtractor';
import { mongoToSqlType } from '../../utils/typeMapper';
import logger from '../../utils/logger';

export interface NoSqlToSqlOptions {
  dialect?: 'mysql' | 'postgresql' | 'sqlite';
  snakeCase?: boolean;
  flattenEmbedded?: boolean;
  createJunctionTables?: boolean;
}

/**
 * Transform NoSQL schema to SQL schema
 */
export function transformNoSqlToSql(nosqlSchema: NoSqlSchema, options: NoSqlToSqlOptions = {}): SqlSchema {
  const {
    dialect = 'postgresql',
    snakeCase = true,
    flattenEmbedded = true,
    createJunctionTables = true,
  } = options;

  const tables: SqlTable[] = [];

  // Convert each collection to a table
  for (const collection of nosqlSchema.collections) {
    const table = transformCollectionToTable(collection, options);
    tables.push(table);
  }

  // Handle relationships
  const relationships = [];
  for (const rel of nosqlSchema.relationships) {
    if (!rel.embedded) {
      // Create foreign key relationship
      relationships.push({
        from: rel.from,
        to: rel.to,
        type: rel.type,
      });

      // Create junction table for N:M relationships
      if (rel.type === 'N:M' && createJunctionTables) {
        const junctionTable = createJunctionTable(rel.from, rel.to, snakeCase);
        tables.push(junctionTable);
      }
    } else if (flattenEmbedded) {
      // Flatten embedded documents into columns
      // This is handled in transformCollectionToTable
    }
  }

  logger.info(`Transformed ${tables.length} NoSQL collections to SQL tables`);

  return { tables, relationships };
}

/**
 * Transform NoSQL collection to SQL table
 */
function transformCollectionToTable(collection: NoSqlCollection, options: NoSqlToSqlOptions): SqlTable {
  const { dialect = 'postgresql', snakeCase = true } = options;

  const columns: SqlColumn[] = [];
  const foreignKeys: SqlForeignKey[] = [];
  let primaryKey: string[] = [];

  // Transform fields
  for (const field of collection.fields) {
    if (field.name === '_id') {
      // MongoDB _id -> SQL primary key
      if (dialect === 'postgresql') {
        columns.push({
          name: snakeCase ? 'id' : 'id',
          type: 'SERIAL',
          nullable: false,
          autoIncrement: true,
        });
      } else if (dialect === 'mysql') {
        columns.push({
          name: snakeCase ? 'id' : 'id',
          type: 'INT',
          nullable: false,
          autoIncrement: true,
        });
      } else {
        columns.push({
          name: snakeCase ? 'id' : 'id',
          type: 'INTEGER',
          nullable: false,
          autoIncrement: true,
        });
      }
      primaryKey.push('id');
      continue;
    }

    // Check if field is a reference
    if (field.ref) {
      const columnName = snakeCase ? toSnakeCase(field.name) : field.name;
      const refColumnName = `${columnName}_id`;

      columns.push({
        name: refColumnName,
        type: dialect === 'postgresql' ? 'INTEGER' : 'INT',
        nullable: !field.required,
      });

      foreignKeys.push({
        columnName: refColumnName,
        referencedTable: snakeCase ? toSnakeCase(field.ref) : field.ref,
        referencedColumn: 'id',
        onDelete: field.required ? 'CASCADE' : 'SET NULL',
        onUpdate: 'CASCADE',
      });
    } else {
      // Regular field
      columns.push(transformFieldToColumn(field, dialect, snakeCase));
    }
  }

  return {
    name: snakeCase ? toSnakeCase(collection.name) : collection.name,
    columns,
    primaryKey,
    foreignKeys,
    indexes: [],
    constraints: [],
  };
}

/**
 * Transform NoSQL field to SQL column
 */
function transformFieldToColumn(field: NoSqlField, dialect: string, snakeCase: boolean): SqlColumn {
  const column: SqlColumn = {
    name: snakeCase ? toSnakeCase(field.name) : field.name,
    type: mongoToSqlType(field.type, dialect as 'mysql' | 'postgresql'),
    nullable: !field.required,
  };

  if (field.unique) {
    column.unique = true;
  }

  if (field.default !== undefined) {
    column.defaultValue = field.default;
  }

  return column;
}

/**
 * Create junction table for N:M relationships
 */
function createJunctionTable(from: string, to: string, snakeCase: boolean): SqlTable {
  const fromParts = from.split('.');
  const fromTable = fromParts[0];
  const toTable = to;

  const tableName = snakeCase
    ? `${toSnakeCase(fromTable)}_${toSnakeCase(toTable)}`
    : `${fromTable}_${toTable}`;

  const columns: SqlColumn[] = [
    {
      name: 'id',
      type: 'SERIAL',
      nullable: false,
      autoIncrement: true,
    },
    {
      name: `${toSnakeCase(fromTable)}_id`,
      type: 'INTEGER',
      nullable: false,
    },
    {
      name: `${toSnakeCase(toTable)}_id`,
      type: 'INTEGER',
      nullable: false,
    },
  ];

  const foreignKeys: SqlForeignKey[] = [
    {
      columnName: `${toSnakeCase(fromTable)}_id`,
      referencedTable: toSnakeCase(fromTable),
      referencedColumn: 'id',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    {
      columnName: `${toSnakeCase(toTable)}_id`,
      referencedTable: toSnakeCase(toTable),
      referencedColumn: 'id',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  ];

  return {
    name: tableName,
    columns,
    primaryKey: ['id'],
    foreignKeys,
    indexes: [],
    constraints: [],
  };
}

/**
 * Convert string to snake_case
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Detect normalization opportunities
 */
export function detectNormalizationOpportunities(nosqlSchema: NoSqlSchema): {
  opportunities: Array<{
    collection: string;
    issue: string;
    recommendation: string;
  }>;
} {
  const opportunities: Array<{
    collection: string;
    issue: string;
    recommendation: string;
  }> = [];

  for (const collection of nosqlSchema.collections) {
    // Check for embedded arrays of objects (potential separate table)
    for (const field of collection.fields) {
      if (field.type === 'array' && !field.ref) {
        opportunities.push({
          collection: collection.name,
          issue: `Field '${field.name}' is an embedded array`,
          recommendation: 'Consider extracting to a separate table with foreign key relationship',
        });
      }

      if (field.type === 'object' && !field.ref) {
        opportunities.push({
          collection: collection.name,
          issue: `Field '${field.name}' is an embedded object`,
          recommendation: 'Consider extracting to a separate table if data is reusable',
        });
      }
    }

    // Check for duplicate field patterns across collections
    const fieldNames = collection.fields.map(f => f.name);
    if (fieldNames.filter(n => n.includes('address')).length > 1) {
      opportunities.push({
        collection: collection.name,
        issue: 'Multiple address-related fields detected',
        recommendation: 'Consider creating an Address table to avoid data duplication',
      });
    }
  }

  return { opportunities };
}
