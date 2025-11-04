/**
 * SQL to NoSQL Transformer
 * Transforms SQL schemas to NoSQL (MongoDB) format
 */

import { SqlSchema, SqlTable } from '../extract/sqlExtractor';
import { NoSqlSchema, NoSqlCollection, NoSqlField } from '../extract/nosqlExtractor';
import { sqlToMongoType } from '../../utils/typeMapper';
import logger from '../../utils/logger';

export interface TransformOptions {
  preserveRelationships?: boolean;
  embedOneToOne?: boolean;
  embedOneToMany?: boolean;
  camelCase?: boolean;
  addTimestamps?: boolean;
}

/**
 * Transform SQL schema to NoSQL schema
 */
export function transformSqlToNoSql(sqlSchema: SqlSchema, options: TransformOptions = {}): NoSqlSchema {
  const {
    preserveRelationships = true,
    embedOneToOne = true,
    embedOneToMany = false,
    camelCase = true,
    addTimestamps = true,
  } = options;

  const collections: NoSqlCollection[] = [];

  // Convert each table to a collection
  for (const table of sqlSchema.tables) {
    const collection = transformTableToCollection(table, options);
    collections.push(collection);
  }

  // Transform relationships
  const relationships = sqlSchema.relationships.map(rel => {
    const fromParts = rel.from.split('.');
    const toParts = rel.to.split('.');

    return {
      from: camelCase
        ? `${toCamelCase(fromParts[0])}.${toCamelCase(fromParts[1])}`
        : rel.from,
      to: camelCase ? toCamelCase(toParts[0]) : toParts[0],
      type: rel.type,
      embedded: (rel.type === '1:1' && embedOneToOne) || (rel.type === '1:N' && embedOneToMany),
    };
  });

  logger.info(`Transformed ${collections.length} SQL tables to NoSQL collections`);

  return { collections, relationships };
}

/**
 * Transform SQL table to NoSQL collection
 */
function transformTableToCollection(table: SqlTable, options: TransformOptions): NoSqlCollection {
  const { camelCase = true, addTimestamps = true } = options;

  const fields: NoSqlField[] = [];

  // Add _id field (MongoDB primary key)
  const primaryKeyFields = table.primaryKey || [];
  if (primaryKeyFields.length === 1 && table.columns.find(c => c.autoIncrement)) {
    // Auto-increment primary key -> use ObjectId
    fields.push({
      name: '_id',
      type: 'objectId',
      required: true,
    });
  } else if (primaryKeyFields.length > 0) {
    // Composite or regular primary key -> keep original fields
    for (const pkField of primaryKeyFields) {
      const column = table.columns.find(c => c.name === pkField);
      if (column) {
        fields.push(transformColumnToField(column, true, camelCase));
      }
    }
  } else {
    // No primary key -> add _id
    fields.push({
      name: '_id',
      type: 'objectId',
      required: true,
    });
  }

  // Transform other columns
  for (const column of table.columns) {
    // Skip if already added as primary key
    if (primaryKeyFields.includes(column.name)) continue;

    // Check if this is a foreign key
    const fk = table.foreignKeys.find(fk => fk.columnName === column.name);

    if (fk) {
      // Foreign key -> create reference field
      fields.push({
        name: camelCase ? toCamelCase(column.name) : column.name,
        type: 'objectId',
        required: !column.nullable,
        ref: camelCase ? toCamelCase(fk.referencedTable) : fk.referencedTable,
      });
    } else {
      // Regular column
      fields.push(transformColumnToField(column, false, camelCase));
    }
  }

  // Add timestamps if requested
  if (addTimestamps) {
    if (!fields.some(f => f.name === 'createdAt')) {
      fields.push({
        name: 'createdAt',
        type: 'timestamp',
        required: true,
      });
    }
    if (!fields.some(f => f.name === 'updatedAt')) {
      fields.push({
        name: 'updatedAt',
        type: 'timestamp',
        required: true,
      });
    }
  }

  return {
    name: camelCase ? toCamelCase(table.name) : table.name,
    fields,
  };
}

/**
 * Transform SQL column to NoSQL field
 */
function transformColumnToField(column: any, isPrimaryKey: boolean, camelCase: boolean): NoSqlField {
  const field: NoSqlField = {
    name: camelCase ? toCamelCase(column.name) : column.name,
    type: sqlToMongoType(column.type),
    required: !column.nullable || isPrimaryKey,
  };

  if (column.unique) {
    field.unique = true;
  }

  if (column.defaultValue !== undefined) {
    field.default = column.defaultValue;
  }

  return field;
}

/**
 * Convert string to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/^[A-Z]/, letter => letter.toLowerCase());
}

/**
 * Suggest embedding strategy based on relationship analysis
 */
export function suggestEmbeddingStrategy(sqlSchema: SqlSchema): {
  suggestions: Array<{
    table: string;
    strategy: 'embed' | 'reference';
    reason: string;
    target?: string;
  }>;
} {
  const suggestions: Array<{
    table: string;
    strategy: 'embed' | 'reference';
    reason: string;
    target?: string;
  }> = [];

  // Analyze each table
  for (const table of sqlSchema.tables) {
    // Tables with few foreign keys and small size -> candidates for embedding
    if (table.foreignKeys.length === 1 && table.columns.length <= 5) {
      const fk = table.foreignKeys[0];
      suggestions.push({
        table: table.name,
        strategy: 'embed',
        reason: 'Small table with single foreign key - good candidate for embedding',
        target: fk.referencedTable,
      });
    }

    // Junction tables (N:M relationships) -> keep as references
    if (table.foreignKeys.length >= 2 && table.columns.length <= 4) {
      suggestions.push({
        table: table.name,
        strategy: 'reference',
        reason: 'Junction table for many-to-many relationship - keep as separate collection',
      });
    }

    // Tables with many relationships -> keep as references
    if (table.foreignKeys.length > 2) {
      suggestions.push({
        table: table.name,
        strategy: 'reference',
        reason: 'Complex relationships - better kept as separate collection',
      });
    }
  }

  return { suggestions };
}
