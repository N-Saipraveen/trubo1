/**
 * Intelligent SQL to NoSQL Transformer
 * Implements sophisticated relationship-based transformation strategies
 */

import { SqlSchema, SqlTable, SqlColumn, SqlForeignKey } from '../extract/sqlExtractor';
import { NoSqlSchema, NoSqlCollection, NoSqlField, NoSqlIndex } from '../extract/nosqlExtractor';
import logger from '../../utils/logger';

export interface IntelligentTransformOptions {
  embedOneToOne?: boolean;
  embedSmallOneToMany?: boolean;
  smallTableThreshold?: number; // Max columns for "small" table
  createLinkingCollections?: boolean;
  generateIndexes?: boolean;
  generateValidators?: boolean;
  analyzeQueryPatterns?: boolean;
}

interface RelationshipMetadata {
  type: '1:1' | '1:N' | 'N:M';
  fromTable: string;
  toTable: string;
  fromColumn: string;
  toColumn: string;
  isUnique: boolean;
  isSmall: boolean;
  shouldEmbed: boolean;
  junctionTable?: string;
}

/**
 * Intelligent SQL to NoSQL transformation with relationship semantics
 */
export function intelligentSqlToNoSql(
  schema: SqlSchema,
  options: IntelligentTransformOptions = {}
): NoSqlSchema {
  const {
    embedOneToOne = true,
    embedSmallOneToMany = true,
    smallTableThreshold = 5,
    createLinkingCollections = true,
    generateIndexes = true,
    generateValidators = true,
  } = options;

  logger.info('Starting intelligent SQL to NoSQL transformation');

  // Step 1: Analyze all relationships
  const relationships = analyzeRelationships(schema, smallTableThreshold);

  // Step 2: Detect junction tables (many-to-many)
  const junctionTables = detectJunctionTables(schema);

  // Step 3: Determine embedding strategy
  const embeddingStrategy = determineEmbeddingStrategy(
    relationships,
    junctionTables,
    embedOneToOne,
    embedSmallOneToMany
  );

  // Step 4: Transform tables to collections
  const collections: NoSqlCollection[] = [];
  const processedTables = new Set<string>();

  for (const table of schema.tables) {
    // Skip junction tables if we're creating linking collections
    if (junctionTables.has(table.name) && createLinkingCollections) {
      continue;
    }

    const collection = transformTableWithEmbedding(
      table,
      schema,
      embeddingStrategy,
      relationships,
      generateIndexes,
      generateValidators
    );

    collections.push(collection);
    processedTables.add(table.name);
  }

  // Step 5: Handle many-to-many relationships
  if (createLinkingCollections) {
    for (const junctionTable of junctionTables) {
      const table = schema.tables.find(t => t.name === junctionTable);
      if (!table) continue;

      const linkingCollection = createLinkingCollection(table, schema);
      if (linkingCollection) {
        collections.push(linkingCollection);
      }
    }
  }

  // Step 6: Build final relationship list
  const nosqlRelationships = relationships
    .filter(rel => !junctionTables.has(rel.fromTable))
    .map(rel => ({
      from: `${toCamelCase(rel.fromTable)}.${toCamelCase(rel.fromColumn)}`,
      to: toCamelCase(rel.toTable),
      type: rel.type,
      embedded: rel.shouldEmbed,
    }));

  logger.info(`Transformed ${collections.length} collections with ${nosqlRelationships.length} relationships`);

  return { collections, relationships: nosqlRelationships };
}

/**
 * Analyze all relationships and infer cardinality
 */
function analyzeRelationships(schema: SqlSchema, smallTableThreshold: number): RelationshipMetadata[] {
  const relationships: RelationshipMetadata[] = [];

  for (const table of schema.tables) {
    for (const fk of table.foreignKeys) {
      const referencedTable = schema.tables.find(t => t.name === fk.referencedTable);
      if (!referencedTable) continue;

      // Check if FK column has UNIQUE constraint
      const fkColumn = table.columns.find(c => c.name === fk.columnName);
      const isUnique = fkColumn?.unique || false;

      // Infer cardinality
      let type: '1:1' | '1:N' | 'N:M' = '1:N';
      if (isUnique) {
        type = '1:1';
      }

      // Check if table is "small"
      const isSmall = table.columns.length <= smallTableThreshold;

      relationships.push({
        type,
        fromTable: table.name,
        toTable: fk.referencedTable,
        fromColumn: fk.columnName,
        toColumn: fk.referencedColumn,
        isUnique,
        isSmall,
        shouldEmbed: false, // Will be determined later
      });
    }
  }

  return relationships;
}

/**
 * Detect junction tables for many-to-many relationships
 */
function detectJunctionTables(schema: SqlSchema): Set<string> {
  const junctionTables = new Set<string>();

  for (const table of schema.tables) {
    // A junction table typically has:
    // 1. Exactly 2 foreign keys
    // 2. Few or no other columns (usually just the 2 FKs + maybe timestamps)
    // 3. Composite primary key on the 2 FK columns

    if (table.foreignKeys.length === 2) {
      const nonFkColumns = table.columns.filter(col => {
        const isFk = table.foreignKeys.some(fk => fk.columnName === col.name);
        const isTimestamp = col.name.toLowerCase().match(/created|updated|timestamp/);
        return !isFk && !isTimestamp;
      });

      // If there are 2 or fewer non-FK, non-timestamp columns, it's likely a junction table
      if (nonFkColumns.length <= 2) {
        junctionTables.add(table.name);
        logger.info(`Detected junction table: ${table.name}`);
      }
    }
  }

  return junctionTables;
}

/**
 * Determine embedding strategy for each relationship
 */
function determineEmbeddingStrategy(
  relationships: RelationshipMetadata[],
  junctionTables: Set<string>,
  embedOneToOne: boolean,
  embedSmallOneToMany: boolean
): Map<string, RelationshipMetadata> {
  const strategy = new Map<string, RelationshipMetadata>();

  for (const rel of relationships) {
    // Skip relationships involving junction tables
    if (junctionTables.has(rel.fromTable)) {
      continue;
    }

    // Decide whether to embed
    let shouldEmbed = false;

    if (rel.type === '1:1' && embedOneToOne) {
      shouldEmbed = true;
      logger.info(`Embedding 1:1 relationship: ${rel.fromTable}.${rel.fromColumn} → ${rel.toTable}`);
    } else if (rel.type === '1:N' && embedSmallOneToMany && rel.isSmall) {
      shouldEmbed = true;
      logger.info(`Embedding small 1:N relationship: ${rel.fromTable} → ${rel.toTable}`);
    } else {
      logger.info(`Using reference for relationship: ${rel.fromTable}.${rel.fromColumn} → ${rel.toTable}`);
    }

    rel.shouldEmbed = shouldEmbed;
    const key = `${rel.fromTable}.${rel.fromColumn}`;
    strategy.set(key, rel);
  }

  return strategy;
}

/**
 * Transform table to collection with embedding
 */
function transformTableWithEmbedding(
  table: SqlTable,
  schema: SqlSchema,
  embeddingStrategy: Map<string, RelationshipMetadata>,
  relationships: RelationshipMetadata[],
  generateIndexes: boolean,
  generateValidators: boolean
): NoSqlCollection {
  const fields: NoSqlField[] = [];
  const indexes: NoSqlIndex[] = [];

  // Add _id field
  fields.push({
    name: '_id',
    type: 'objectId',
    required: true,
  });

  // Process each column
  for (const column of table.columns) {
    // Skip auto-increment primary keys (replaced by _id)
    if (column.autoIncrement && table.primaryKey?.includes(column.name)) {
      continue;
    }

    // Check if this column is a foreign key
    const fk = table.foreignKeys.find(fk => fk.columnName === column.name);

    if (fk) {
      const strategyKey = `${table.name}.${column.name}`;
      const strategy = embeddingStrategy.get(strategyKey);

      if (strategy?.shouldEmbed) {
        // Embed the referenced table
        const referencedTable = schema.tables.find(t => t.name === fk.referencedTable);
        if (referencedTable) {
          fields.push({
            name: toCamelCase(singularize(fk.referencedTable)),
            type: strategy.type === '1:N' ? 'array' : 'object',
            required: !column.nullable,
            // Embedded document structure would be inferred from referenced table
          });
        }
      } else {
        // Use reference (ObjectId)
        fields.push({
          name: toCamelCase(column.name),
          type: 'objectId',
          required: !column.nullable,
          ref: toCamelCase(fk.referencedTable),
        });

        // Add index for reference field
        if (generateIndexes) {
          indexes.push({
            fields: { [toCamelCase(column.name)]: 1 },
            unique: false,
          });
        }
      }
    } else {
      // Regular column
      fields.push({
        name: toCamelCase(column.name),
        type: sqlTypeToMongoType(column.type),
        required: !column.nullable,
        unique: column.unique,
        default: column.defaultValue,
      });

      // Add index for unique columns
      if (column.unique && generateIndexes) {
        indexes.push({
          fields: { [toCamelCase(column.name)]: 1 },
          unique: true,
        });
      }
    }
  }

  // Add timestamps
  if (!fields.some(f => f.name === 'createdAt')) {
    fields.push({
      name: 'createdAt',
      type: 'date',
      required: true,
      default: 'Date.now',
    });
  }

  if (!fields.some(f => f.name === 'updatedAt')) {
    fields.push({
      name: 'updatedAt',
      type: 'date',
      required: true,
      default: 'Date.now',
    });
  }

  // Generate validator if requested
  let validator;
  if (generateValidators) {
    validator = generateMongoValidator(fields);
  }

  return {
    name: toCamelCase(table.name),
    fields,
    indexes: indexes.length > 0 ? indexes : undefined,
    validator,
  };
}

/**
 * Create linking collection for many-to-many
 */
function createLinkingCollection(junctionTable: SqlTable, schema: SqlSchema): NoSqlCollection | null {
  if (junctionTable.foreignKeys.length !== 2) {
    return null;
  }

  const [fk1, fk2] = junctionTable.foreignKeys;

  const fields: NoSqlField[] = [
    {
      name: '_id',
      type: 'objectId',
      required: true,
    },
    {
      name: toCamelCase(fk1.columnName),
      type: 'objectId',
      required: true,
      ref: toCamelCase(fk1.referencedTable),
    },
    {
      name: toCamelCase(fk2.columnName),
      type: 'objectId',
      required: true,
      ref: toCamelCase(fk2.referencedTable),
    },
  ];

  // Add any additional columns from the junction table
  for (const column of junctionTable.columns) {
    const isFk = junctionTable.foreignKeys.some(fk => fk.columnName === column.name);
    if (!isFk && !column.autoIncrement) {
      fields.push({
        name: toCamelCase(column.name),
        type: sqlTypeToMongoType(column.type),
        required: !column.nullable,
      });
    }
  }

  // Add compound index on both foreign keys
  const indexes: NoSqlIndex[] = [
    {
      fields: {
        [toCamelCase(fk1.columnName)]: 1,
        [toCamelCase(fk2.columnName)]: 1,
      },
      unique: true,
    },
  ];

  return {
    name: toCamelCase(junctionTable.name),
    fields,
    indexes,
  };
}

/**
 * Generate MongoDB JSON Schema validator
 */
function generateMongoValidator(fields: NoSqlField[]): any {
  const properties: any = {};
  const required: string[] = [];

  for (const field of fields) {
    if (field.name === '_id') continue;

    properties[field.name] = {
      bsonType: mongoTypeToBsonType(field.type),
    };

    if (field.required) {
      required.push(field.name);
    }

    if (field.enum) {
      properties[field.name].enum = field.enum;
    }
  }

  return {
    $jsonSchema: {
      bsonType: 'object',
      required,
      properties,
    },
  };
}

/**
 * Convert SQL type to MongoDB type
 */
function sqlTypeToMongoType(sqlType: string): string {
  const baseType = sqlType.replace(/\([^)]*\)/g, '').trim().toUpperCase();

  const typeMap: Record<string, string> = {
    INT: 'number',
    INTEGER: 'number',
    BIGINT: 'long',
    SMALLINT: 'number',
    TINYINT: 'number',
    DECIMAL: 'decimal',
    FLOAT: 'double',
    DOUBLE: 'double',
    VARCHAR: 'string',
    CHAR: 'string',
    TEXT: 'string',
    DATE: 'date',
    DATETIME: 'date',
    TIMESTAMP: 'date',
    BOOLEAN: 'bool',
    BLOB: 'binData',
    JSON: 'object',
  };

  return typeMap[baseType] || 'string';
}

/**
 * Convert MongoDB type to BSON type
 */
function mongoTypeToBsonType(mongoType: string): string {
  const typeMap: Record<string, string> = {
    string: 'string',
    number: 'int',
    long: 'long',
    double: 'double',
    decimal: 'decimal',
    bool: 'bool',
    date: 'date',
    objectId: 'objectId',
    array: 'array',
    object: 'object',
    binData: 'binData',
  };

  return typeMap[mongoType] || 'string';
}

/**
 * Convert to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/^[A-Z]/, letter => letter.toLowerCase());
}

/**
 * Simple singularize (remove trailing 's')
 */
function singularize(str: string): string {
  if (str.endsWith('ies')) {
    return str.slice(0, -3) + 'y';
  }
  if (str.endsWith('ses') || str.endsWith('xes') || str.endsWith('zes')) {
    return str.slice(0, -2);
  }
  if (str.endsWith('s') && !str.endsWith('ss')) {
    return str.slice(0, -1);
  }
  return str;
}

/**
 * Generate conversion summary report
 */
export function generateConversionReport(
  sqlSchema: SqlSchema,
  nosqlSchema: NoSqlSchema,
  relationships: RelationshipMetadata[]
): string {
  const lines: string[] = [];

  lines.push('=== SQL to MongoDB Conversion Report ===\n');
  lines.push(`Tables: ${sqlSchema.tables.length} → Collections: ${nosqlSchema.collections.length}\n`);

  lines.push('\n--- Relationship Transformations ---');
  for (const rel of relationships) {
    const strategy = rel.shouldEmbed ? '🔗 EMBEDDED' : '📎 REFERENCED';
    lines.push(`${strategy} ${rel.type}: ${rel.fromTable}.${rel.fromColumn} → ${rel.toTable}`);
  }

  lines.push('\n--- Index Recommendations ---');
  for (const collection of nosqlSchema.collections) {
    if (collection.indexes && collection.indexes.length > 0) {
      lines.push(`Collection: ${collection.name}`);
      for (const index of collection.indexes) {
        const fields = Object.keys(index.fields).join(', ');
        const unique = index.unique ? ' (UNIQUE)' : '';
        lines.push(`  - Index on: ${fields}${unique}`);
      }
    }
  }

  return lines.join('\n');
}
