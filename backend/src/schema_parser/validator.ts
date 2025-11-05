/**
 * Validator for Standardized JSON Schema
 */

import { StandardizedSchema, Table, Column, Relationship } from './types';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Validate standardized schema structure
 */
export function validateStandardizedSchema(schema: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required top-level fields
  if (!schema.version) {
    errors.push('Missing required field: version');
  }

  if (!schema.metadata) {
    errors.push('Missing required field: metadata');
  } else {
    if (!schema.metadata.sourceType) {
      errors.push('Missing required field: metadata.sourceType');
    }
    if (!schema.metadata.extractedAt) {
      errors.push('Missing required field: metadata.extractedAt');
    }
  }

  if (!schema.tables || !Array.isArray(schema.tables)) {
    errors.push('Missing or invalid field: tables (must be array)');
  } else {
    // Validate each table
    schema.tables.forEach((table: any, index: number) => {
      const tableErrors = validateTable(table, index);
      errors.push(...tableErrors);
    });
  }

  if (!schema.relationships || !Array.isArray(schema.relationships)) {
    warnings.push('Missing or invalid field: relationships (should be array)');
  } else {
    // Validate each relationship
    schema.relationships.forEach((rel: any, index: number) => {
      const relErrors = validateRelationship(rel, index, schema.tables || []);
      errors.push(...relErrors);
    });
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate a single table
 */
function validateTable(table: any, index: number): string[] {
  const errors: string[] = [];
  const prefix = `tables[${index}]`;

  if (!table.name || typeof table.name !== 'string') {
    errors.push(`${prefix}: Missing or invalid 'name' field`);
  }

  if (!table.columns || !Array.isArray(table.columns)) {
    errors.push(`${prefix}: Missing or invalid 'columns' field (must be array)`);
  } else {
    table.columns.forEach((col: any, colIndex: number) => {
      const colErrors = validateColumn(col, `${prefix}.columns[${colIndex}]`);
      errors.push(...colErrors);
    });
  }

  if (table.foreignKeys && !Array.isArray(table.foreignKeys)) {
    errors.push(`${prefix}: Invalid 'foreignKeys' field (must be array)`);
  }

  if (table.indexes && !Array.isArray(table.indexes)) {
    errors.push(`${prefix}: Invalid 'indexes' field (must be array)`);
  }

  return errors;
}

/**
 * Validate a single column
 */
function validateColumn(column: any, prefix: string): string[] {
  const errors: string[] = [];

  if (!column.name || typeof column.name !== 'string') {
    errors.push(`${prefix}: Missing or invalid 'name' field`);
  }

  if (!column.type || typeof column.type !== 'string') {
    errors.push(`${prefix}: Missing or invalid 'type' field`);
  }

  if (typeof column.nullable !== 'boolean') {
    errors.push(`${prefix}: Missing or invalid 'nullable' field (must be boolean)`);
  }

  if (typeof column.unique !== 'boolean') {
    errors.push(`${prefix}: Missing or invalid 'unique' field (must be boolean)`);
  }

  return errors;
}

/**
 * Validate a single relationship
 */
function validateRelationship(rel: any, index: number, tables: Table[]): string[] {
  const errors: string[] = [];
  const prefix = `relationships[${index}]`;

  if (!rel.id) {
    errors.push(`${prefix}: Missing 'id' field`);
  }

  if (!rel.type || !['one_to_one', 'one_to_many', 'many_to_many'].includes(rel.type)) {
    errors.push(`${prefix}: Invalid 'type' field (must be one_to_one, one_to_many, or many_to_many)`);
  }

  if (!rel.from || !rel.from.table) {
    errors.push(`${prefix}: Missing 'from.table' field`);
  } else {
    // Check if table exists
    const fromTableExists = tables.some(t => t.name === rel.from.table);
    if (!fromTableExists) {
      errors.push(`${prefix}: Referenced table '${rel.from.table}' does not exist`);
    }
  }

  if (!rel.to || !rel.to.table) {
    errors.push(`${prefix}: Missing 'to.table' field`);
  } else {
    // Check if table exists
    const toTableExists = tables.some(t => t.name === rel.to.table);
    if (!toTableExists) {
      errors.push(`${prefix}: Referenced table '${rel.to.table}' does not exist`);
    }
  }

  return errors;
}
