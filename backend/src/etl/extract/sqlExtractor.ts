/**
 * SQL Schema Extractor
 * Parses SQL DDL statements and extracts schema information
 */

import { Parser } from 'node-sql-parser';
import logger from '../../utils/logger';

export interface SqlTable {
  name: string;
  columns: SqlColumn[];
  primaryKey?: string[];
  foreignKeys: SqlForeignKey[];
  indexes: SqlIndex[];
  constraints: SqlConstraint[];
}

export interface SqlColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  autoIncrement?: boolean;
  unique?: boolean;
  comment?: string;
}

export interface SqlForeignKey {
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete?: string;
  onUpdate?: string;
}

export interface SqlIndex {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface SqlConstraint {
  name?: string;
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK';
  definition: string;
}

export interface SqlSchema {
  tables: SqlTable[];
  relationships: Relationship[];
}

export interface Relationship {
  from: string; // table.column
  to: string; // table.column
  type: '1:1' | '1:N' | 'N:M';
}

/**
 * Extract schema from SQL DDL
 */
export async function extractSqlSchema(sql: string): Promise<SqlSchema> {
  const parser = new Parser();
  const tables: SqlTable[] = [];
  const relationships: Relationship[] = [];

  try {
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      if (statement.toUpperCase().includes('CREATE TABLE')) {
        const table = parseCreateTable(statement);
        if (table) {
          tables.push(table);
        }
      }
    }

    // Extract relationships from foreign keys
    for (const table of tables) {
      for (const fk of table.foreignKeys) {
        relationships.push({
          from: `${table.name}.${fk.columnName}`,
          to: `${fk.referencedTable}.${fk.referencedColumn}`,
          type: '1:N', // Default to 1:N, can be refined later
        });
      }
    }

    logger.info(`Extracted ${tables.length} tables with ${relationships.length} relationships`);

    return { tables, relationships };
  } catch (error) {
    logger.error('Failed to extract SQL schema:', error);
    throw new Error('Failed to parse SQL schema');
  }
}

/**
 * Parse CREATE TABLE statement
 */
function parseCreateTable(sql: string): SqlTable | null {
  try {
    // Extract table name
    const tableNameMatch = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/i);
    if (!tableNameMatch) return null;

    const tableName = tableNameMatch[1];

    // Extract column definitions
    const columnsSection = sql.match(/\(([^)]+(?:\([^)]*\)[^)]*)*)\)/)?.[1];
    if (!columnsSection) return null;

    const columns: SqlColumn[] = [];
    const foreignKeys: SqlForeignKey[] = [];
    const indexes: SqlIndex[] = [];
    const constraints: SqlConstraint[] = [];
    let primaryKey: string[] | undefined;

    // Split by comma, but respect parentheses
    const parts = splitByComma(columnsSection);

    for (const part of parts) {
      const trimmed = part.trim();

      // Check if it's a constraint
      if (trimmed.toUpperCase().startsWith('PRIMARY KEY')) {
        primaryKey = extractColumnsFromConstraint(trimmed);
        constraints.push({
          type: 'PRIMARY KEY',
          definition: trimmed,
        });
      } else if (trimmed.toUpperCase().startsWith('FOREIGN KEY')) {
        const fk = parseForeignKey(trimmed);
        if (fk) foreignKeys.push(fk);
      } else if (trimmed.toUpperCase().startsWith('UNIQUE')) {
        constraints.push({
          type: 'UNIQUE',
          definition: trimmed,
        });
      } else if (trimmed.toUpperCase().startsWith('CHECK')) {
        constraints.push({
          type: 'CHECK',
          definition: trimmed,
        });
      } else if (trimmed.toUpperCase().startsWith('KEY') || trimmed.toUpperCase().startsWith('INDEX')) {
        // Handle index definitions
        const indexMatch = trimmed.match(/(?:KEY|INDEX)\s+`?(\w+)`?\s*\(([^)]+)\)/i);
        if (indexMatch) {
          indexes.push({
            name: indexMatch[1],
            columns: indexMatch[2].split(',').map(c => c.trim().replace(/`/g, '')),
            unique: false,
          });
        }
      } else {
        // It's a column definition
        const column = parseColumn(trimmed);
        if (column) columns.push(column);
      }
    }

    return {
      name: tableName,
      columns,
      primaryKey,
      foreignKeys,
      indexes,
      constraints,
    };
  } catch (error) {
    logger.error('Failed to parse CREATE TABLE:', error);
    return null;
  }
}

/**
 * Parse column definition
 */
function parseColumn(definition: string): SqlColumn | null {
  const parts = definition.split(/\s+/);
  if (parts.length < 2) return null;

  const name = parts[0].replace(/`/g, '');
  const type = parts[1].toUpperCase();

  const column: SqlColumn = {
    name,
    type,
    nullable: !definition.toUpperCase().includes('NOT NULL'),
  };

  // Check for PRIMARY KEY
  if (definition.toUpperCase().includes('PRIMARY KEY')) {
    column.nullable = false;
  }

  // Check for AUTO_INCREMENT
  if (definition.toUpperCase().includes('AUTO_INCREMENT') || definition.toUpperCase().includes('SERIAL')) {
    column.autoIncrement = true;
  }

  // Check for UNIQUE
  if (definition.toUpperCase().includes('UNIQUE')) {
    column.unique = true;
  }

  // Extract DEFAULT value
  const defaultMatch = definition.match(/DEFAULT\s+([^,\s]+)/i);
  if (defaultMatch) {
    column.defaultValue = defaultMatch[1].replace(/'/g, '');
  }

  return column;
}

/**
 * Parse FOREIGN KEY constraint
 */
function parseForeignKey(definition: string): SqlForeignKey | null {
  const match = definition.match(
    /FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+`?(\w+)`?\s*\(([^)]+)\)(?:\s+ON\s+DELETE\s+(\w+))?(?:\s+ON\s+UPDATE\s+(\w+))?/i
  );

  if (!match) return null;

  return {
    columnName: match[1].trim().replace(/`/g, ''),
    referencedTable: match[2],
    referencedColumn: match[3].trim().replace(/`/g, ''),
    onDelete: match[4],
    onUpdate: match[5],
  };
}

/**
 * Extract column names from PRIMARY KEY constraint
 */
function extractColumnsFromConstraint(constraint: string): string[] {
  const match = constraint.match(/\(([^)]+)\)/);
  if (!match) return [];

  return match[1]
    .split(',')
    .map(col => col.trim().replace(/`/g, ''));
}

/**
 * Split string by comma, respecting parentheses
 */
function splitByComma(str: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (char === '(') {
      depth++;
      current += char;
    } else if (char === ')') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    result.push(current.trim());
  }

  return result;
}
