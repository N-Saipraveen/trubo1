/**
 * NoSQL to SQL Converter
 * Converts NoSQL (MongoDB-style) schema to SQL DDL
 */

import {
  NoSqlSchema,
  NoSqlCollection,
  NoSqlField,
  NoSqlDataType,
  SqlSchema,
  SqlTable,
  SqlColumn,
  SqlDataType,
  ConversionOptions,
  ConversionResult,
} from '../types';
import {
  mapNoSqlToSql,
  noSqlToSqlFieldName,
  collectionToTableName,
  sanitizeIdentifier,
} from '../utils/dataMapper';

/**
 * Convert NoSQL schema to SQL schema
 */
export function convertNoSqlToSql(
  noSqlSchema: NoSqlSchema,
  dialect: 'mysql' | 'postgresql' | 'sqlite' | 'mssql' = 'postgresql',
  options: ConversionOptions = {}
): ConversionResult {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const tables: SqlTable[] = [];

    // First pass: create tables from collections
    for (const collection of noSqlSchema.collections) {
      const table = convertCollectionToTable(collection, dialect, options);
      tables.push(table);

      // Detect nested objects that need normalization
      const nestedFields = collection.fields.filter(
        f => f.type === NoSqlDataType.OBJECT || f.type === NoSqlDataType.ARRAY
      );

      if (nestedFields.length > 0) {
        const depth = options.normalizeDepth ?? 1;
        if (depth > 0) {
          const normalizedTables = normalizeNestedFields(
            collection,
            nestedFields,
            table,
            dialect,
            depth,
            options
          );
          tables.push(...normalizedTables);
        } else {
          warnings.push(
            `Collection '${collection.name}' has nested fields that will be stored as JSON. ` +
            `Consider increasing normalizeDepth for better normalization.`
          );
        }
      }
    }

    const sqlSchema: SqlSchema = {
      tables,
      dialect,
    };

    // Generate DDL string
    const ddl = generateDDL(sqlSchema);

    return {
      success: true,
      schema: ddl,
      warnings: warnings.length > 0 ? warnings : undefined,
      metadata: {
        sourceType: 'nosql',
        targetType: 'sql',
        tablesOrCollections: tables.length,
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
 * Convert NoSQL collection to SQL table
 */
function convertCollectionToTable(
  collection: NoSqlCollection,
  dialect: 'mysql' | 'postgresql' | 'sqlite' | 'mssql',
  options: ConversionOptions
): SqlTable {
  const columns: SqlColumn[] = [];
  const primaryKeys: string[] = [];
  const foreignKeys: SqlTable['foreignKeys'] = [];
  const uniqueConstraints: string[][] = [];
  const indexes: SqlTable['indexes'] = [];

  // Convert fields to columns
  for (const field of collection.fields) {
    // Handle _id field
    if (field.name === '_id') {
      const idColumn: SqlColumn = {
        name: 'id',
        type: getAutoIncrementType(dialect),
        nullable: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
      };
      columns.push(idColumn);
      primaryKeys.push('id');
      continue;
    }

    // Skip deeply nested objects (will be normalized separately)
    if (field.nested && field.nested.length > 0) {
      continue;
    }

    const column = convertFieldToColumn(field, dialect, options);
    columns.push(column);

    if (field.unique) {
      uniqueConstraints.push([column.name]);
    }

    // Handle references
    if (field.ref) {
      foreignKeys.push({
        column: column.name,
        references: {
          table: options.preserveCase
            ? field.ref
            : collectionToTableName(field.ref),
          column: 'id',
        },
        onDelete: 'CASCADE',
      });
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
      },
      {
        name: 'updated_at',
        type: 'TIMESTAMP',
        nullable: false,
        primaryKey: false,
        autoIncrement: false,
        unique: false,
        defaultValue: 'CURRENT_TIMESTAMP',
      }
    );
  }

  // Convert NoSQL indexes to SQL indexes
  if (collection.indexes) {
    for (let i = 0; i < collection.indexes.length; i++) {
      const index = collection.indexes[i];
      const indexColumns = Object.keys(index.fields);

      indexes.push({
        name: `idx_${collection.name}_${indexColumns.join('_')}_${i}`,
        columns: indexColumns,
        unique: index.unique || false,
      });
    }
  }

  const tableName = options.preserveCase
    ? collection.name
    : collectionToTableName(collection.name);

  return {
    name: sanitizeIdentifier(tableName),
    columns,
    primaryKeys,
    foreignKeys,
    uniqueConstraints,
    checkConstraints: [],
    indexes,
  };
}

/**
 * Convert NoSQL field to SQL column
 */
function convertFieldToColumn(
  field: NoSqlField,
  dialect: 'mysql' | 'postgresql' | 'sqlite' | 'mssql',
  options: ConversionOptions
): SqlColumn {
  const columnName = options.preserveCase
    ? field.name
    : noSqlToSqlFieldName(field.name);

  let sqlType = mapNoSqlToSql(field.type, dialect);

  // Handle arrays (store as JSON or create junction table)
  if (field.type === NoSqlDataType.ARRAY) {
    if (field.arrayOf && isPrimitiveType(field.arrayOf)) {
      // Store primitive arrays as JSON
      sqlType = dialect === 'postgresql' ? 'JSONB' : 'JSON';
    } else {
      // Complex arrays should be normalized (handled separately)
      sqlType = dialect === 'postgresql' ? 'JSONB' : 'JSON';
    }
  }

  const column: SqlColumn = {
    name: sanitizeIdentifier(columnName),
    type: sqlType,
    nullable: !field.required,
    primaryKey: false,
    autoIncrement: false,
    unique: field.unique || false,
  };

  if (field.default !== undefined && field.default !== 'Date.now') {
    column.defaultValue = field.default;
  }

  return column;
}

/**
 * Normalize nested fields into separate tables
 */
function normalizeNestedFields(
  collection: NoSqlCollection,
  nestedFields: NoSqlField[],
  parentTable: SqlTable,
  dialect: 'mysql' | 'postgresql' | 'sqlite' | 'mssql',
  depth: number,
  options: ConversionOptions
): SqlTable[] {
  const normalizedTables: SqlTable[] = [];

  for (const field of nestedFields) {
    if (field.type === NoSqlDataType.OBJECT && field.nested) {
      // Create a new table for nested object
      const nestedTableName = `${parentTable.name}_${field.name}`;
      const nestedColumns: SqlColumn[] = [
        {
          name: 'id',
          type: getAutoIncrementType(dialect),
          nullable: false,
          primaryKey: true,
          autoIncrement: true,
          unique: true,
        },
        {
          name: `${parentTable.name}_id`,
          type: 'INTEGER',
          nullable: false,
          primaryKey: false,
          autoIncrement: false,
          unique: false,
        },
      ];

      // Add nested fields as columns
      for (const nestedField of field.nested) {
        const col = convertFieldToColumn(nestedField, dialect, options);
        nestedColumns.push(col);
      }

      normalizedTables.push({
        name: sanitizeIdentifier(nestedTableName),
        columns: nestedColumns,
        primaryKeys: ['id'],
        foreignKeys: [
          {
            column: `${parentTable.name}_id`,
            references: {
              table: parentTable.name,
              column: 'id',
            },
            onDelete: 'CASCADE',
          },
        ],
        uniqueConstraints: [],
        checkConstraints: [],
        indexes: [],
      });
    } else if (field.type === NoSqlDataType.ARRAY && field.arrayOf && !isPrimitiveType(field.arrayOf)) {
      // Create junction table for arrays of complex objects
      const junctionTableName = `${parentTable.name}_${field.name}`;
      normalizedTables.push({
        name: sanitizeIdentifier(junctionTableName),
        columns: [
          {
            name: 'id',
            type: getAutoIncrementType(dialect),
            nullable: false,
            primaryKey: true,
            autoIncrement: true,
            unique: true,
          },
          {
            name: `${parentTable.name}_id`,
            type: 'INTEGER',
            nullable: false,
            primaryKey: false,
            autoIncrement: false,
            unique: false,
          },
          {
            name: 'value',
            type: mapNoSqlToSql(field.arrayOf as NoSqlDataType, dialect),
            nullable: true,
            primaryKey: false,
            autoIncrement: false,
            unique: false,
          },
        ],
        primaryKeys: ['id'],
        foreignKeys: [
          {
            column: `${parentTable.name}_id`,
            references: {
              table: parentTable.name,
              column: 'id',
            },
            onDelete: 'CASCADE',
          },
        ],
        uniqueConstraints: [],
        checkConstraints: [],
        indexes: [],
      });
    }
  }

  return normalizedTables;
}

/**
 * Generate SQL DDL from schema
 */
function generateDDL(schema: SqlSchema): string {
  let ddl = `-- Generated SQL DDL (${schema.dialect})\n\n`;

  for (const table of schema.tables) {
    ddl += generateTableDDL(table, schema.dialect);
    ddl += '\n\n';
  }

  // Generate indexes
  for (const table of schema.tables) {
    for (const index of table.indexes) {
      ddl += generateIndexDDL(table.name, index, schema.dialect);
      ddl += '\n';
    }
  }

  return ddl.trim();
}

/**
 * Generate DDL for a single table
 */
function generateTableDDL(
  table: SqlTable,
  dialect: 'mysql' | 'postgresql' | 'sqlite' | 'mssql'
): string {
  let ddl = `CREATE TABLE ${table.name} (\n`;

  // Columns
  const columnDefs: string[] = table.columns.map(col => generateColumnDDL(col, dialect));

  // Primary key constraint
  if (table.primaryKeys.length > 0) {
    columnDefs.push(`  PRIMARY KEY (${table.primaryKeys.join(', ')})`);
  }

  // Foreign key constraints
  for (const fk of table.foreignKeys) {
    const onDelete = fk.onDelete ? ` ON DELETE ${fk.onDelete}` : '';
    const onUpdate = fk.onUpdate ? ` ON UPDATE ${fk.onUpdate}` : '';
    columnDefs.push(
      `  FOREIGN KEY (${fk.column}) REFERENCES ${fk.references.table}(${fk.references.column})${onDelete}${onUpdate}`
    );
  }

  // Unique constraints
  for (const uc of table.uniqueConstraints) {
    columnDefs.push(`  UNIQUE (${uc.join(', ')})`);
  }

  ddl += columnDefs.join(',\n');
  ddl += '\n);';

  return ddl;
}

/**
 * Generate DDL for a column
 */
function generateColumnDDL(
  column: SqlColumn,
  dialect: 'mysql' | 'postgresql' | 'sqlite' | 'mssql'
): string {
  let ddl = `  ${column.name} ${column.type}`;

  if (!column.nullable) {
    ddl += ' NOT NULL';
  }

  if (column.autoIncrement) {
    if (dialect === 'mysql') ddl += ' AUTO_INCREMENT';
    if (dialect === 'sqlite') ddl += ' AUTOINCREMENT';
    // PostgreSQL uses SERIAL type
  }

  if (column.unique && !column.primaryKey) {
    ddl += ' UNIQUE';
  }

  if (column.defaultValue !== undefined) {
    if (typeof column.defaultValue === 'string') {
      ddl += ` DEFAULT '${column.defaultValue}'`;
    } else {
      ddl += ` DEFAULT ${column.defaultValue}`;
    }
  }

  return ddl;
}

/**
 * Generate DDL for an index
 */
function generateIndexDDL(
  tableName: string,
  index: SqlTable['indexes'][0],
  dialect: 'mysql' | 'postgresql' | 'sqlite' | 'mssql'
): string {
  const unique = index.unique ? 'UNIQUE ' : '';
  return `CREATE ${unique}INDEX ${index.name} ON ${tableName} (${index.columns.join(', ')});`;
}

/**
 * Get auto-increment type for the dialect
 */
function getAutoIncrementType(dialect: 'mysql' | 'postgresql' | 'sqlite' | 'mssql'): string {
  switch (dialect) {
    case 'postgresql':
      return 'SERIAL';
    case 'mysql':
    case 'sqlite':
      return 'INTEGER';
    case 'mssql':
      return 'INT IDENTITY(1,1)';
    default:
      return 'INTEGER';
  }
}

/**
 * Check if a type is primitive
 */
function isPrimitiveType(type: NoSqlDataType | string): boolean {
  const primitives = [
    NoSqlDataType.STRING,
    NoSqlDataType.NUMBER,
    NoSqlDataType.BOOLEAN,
    NoSqlDataType.DATE,
    'string',
    'number',
    'boolean',
    'date',
  ];
  return primitives.includes(type as NoSqlDataType);
}
