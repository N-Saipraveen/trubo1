/**
 * Schema validation utilities
 */

import Ajv from 'ajv';
import {
  SqlSchema,
  NoSqlSchema,
  JsonSchema,
  SchemaAnalysis,
} from '../types';

const ajv = new Ajv({ allErrors: true });

/**
 * Validate JSON Schema
 */
export function validateJsonSchema(schema: any): { valid: boolean; errors?: string[] } {
  try {
    const isValid = ajv.validateSchema(schema);
    if (!isValid && ajv.errors) {
      return {
        valid: false,
        errors: ajv.errors.map(err => `${err.instancePath} ${err.message}`),
      };
    }
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : 'Unknown validation error'],
    };
  }
}

/**
 * Analyze schema structure and quality
 */
export function analyzeSchema(input: string | object): SchemaAnalysis {
  try {
    // Try to detect SQL
    if (typeof input === 'string') {
      if (isSqlSchema(input)) {
        return analyzeSqlSchema(input);
      }
    }

    // Try to detect NoSQL/JSON
    if (typeof input === 'object') {
      if (isNoSqlSchema(input)) {
        return analyzeNoSqlSchema(input as NoSqlSchema);
      }
      if (isJsonSchema(input)) {
        return analyzeJsonSchemaStructure(input as JsonSchema);
      }
    }

    return {
      type: 'unknown',
      structure: {
        totalFields: 0,
        relationships: 0,
        indexes: 0,
      },
      quality: {
        hasConstraints: false,
        hasIndexes: false,
      },
      suggestions: ['Unable to determine schema type. Please check format.'],
    };
  } catch (error) {
    return {
      type: 'unknown',
      structure: {
        totalFields: 0,
        relationships: 0,
        indexes: 0,
      },
      quality: {
        hasConstraints: false,
        hasIndexes: false,
      },
      suggestions: ['Error analyzing schema: ' + (error instanceof Error ? error.message : 'Unknown error')],
    };
  }
}

function isSqlSchema(input: string): boolean {
  const sqlKeywords = /\b(CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|PRIMARY\s+KEY|FOREIGN\s+KEY)\b/i;
  return sqlKeywords.test(input);
}

function isNoSqlSchema(input: any): boolean {
  return input && (
    (Array.isArray(input.collections) && input.collections.length > 0) ||
    input.type === 'mongodb' ||
    input.type === 'dynamodb'
  );
}

function isJsonSchema(input: any): boolean {
  return input && (
    input.$schema ||
    (input.type && input.properties) ||
    input.definitions
  );
}

function analyzeSqlSchema(sql: string): SchemaAnalysis {
  const tableMatches = sql.match(/CREATE\s+TABLE/gi) || [];
  const fkMatches = sql.match(/FOREIGN\s+KEY/gi) || [];
  const indexMatches = sql.match(/CREATE\s+INDEX/gi) || [];
  const constraintMatches = sql.match(/CONSTRAINT|CHECK|UNIQUE|NOT\s+NULL/gi) || [];

  return {
    type: 'sql',
    dialect: detectSqlDialect(sql),
    structure: {
      tables: tableMatches.length,
      totalFields: (sql.match(/\w+\s+(INT|VARCHAR|TEXT|DECIMAL|DATE)/gi) || []).length,
      relationships: fkMatches.length,
      indexes: indexMatches.length,
    },
    quality: {
      hasConstraints: constraintMatches.length > 0,
      hasIndexes: indexMatches.length > 0,
      normalizedLevel: fkMatches.length > 0 ? 3 : 1,
    },
    suggestions: generateSqlSuggestions(fkMatches.length, indexMatches.length),
  };
}

function analyzeNoSqlSchema(schema: NoSqlSchema): SchemaAnalysis {
  const totalFields = schema.collections.reduce(
    (sum, col) => sum + col.fields.length,
    0
  );
  const relationships = schema.collections.reduce(
    (sum, col) => sum + col.fields.filter(f => f.ref).length,
    0
  );
  const totalIndexes = schema.collections.reduce(
    (sum, col) => sum + (col.indexes?.length || 0),
    0
  );

  return {
    type: 'nosql',
    dialect: schema.type,
    structure: {
      collections: schema.collections.length,
      totalFields,
      relationships,
      indexes: totalIndexes,
    },
    quality: {
      hasConstraints: schema.collections.some(col => col.validationRules),
      hasIndexes: totalIndexes > 0,
    },
    suggestions: generateNoSqlSuggestions(relationships, totalIndexes),
  };
}

function analyzeJsonSchemaStructure(schema: JsonSchema): SchemaAnalysis {
  const properties = schema.properties || {};
  const totalFields = Object.keys(properties).length;

  return {
    type: 'json',
    structure: {
      totalFields,
      relationships: 0,
      indexes: 0,
    },
    quality: {
      hasConstraints: !!schema.required && schema.required.length > 0,
      hasIndexes: false,
    },
    suggestions: ['JSON Schema detected. Can be converted to SQL or NoSQL format.'],
  };
}

function detectSqlDialect(sql: string): string {
  if (/AUTOINCREMENT/i.test(sql)) return 'sqlite';
  if (/SERIAL|BIGSERIAL/i.test(sql)) return 'postgresql';
  if (/AUTO_INCREMENT/i.test(sql)) return 'mysql';
  if (/IDENTITY/i.test(sql)) return 'mssql';
  return 'generic';
}

function generateSqlSuggestions(fkCount: number, indexCount: number): string[] {
  const suggestions: string[] = [];
  if (fkCount === 0) {
    suggestions.push('Consider adding foreign keys to maintain referential integrity');
  }
  if (indexCount === 0) {
    suggestions.push('Add indexes on frequently queried columns for better performance');
  }
  return suggestions;
}

function generateNoSqlSuggestions(refCount: number, indexCount: number): string[] {
  const suggestions: string[] = [];
  if (refCount === 0) {
    suggestions.push('Consider adding references between collections for relationships');
  }
  if (indexCount === 0) {
    suggestions.push('Add indexes on frequently queried fields');
  }
  return suggestions;
}

/**
 * Validate SQL syntax (basic check)
 */
export function validateSqlSyntax(sql: string): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  // Check for balanced parentheses
  let parenCount = 0;
  for (const char of sql) {
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (parenCount < 0) {
      errors.push('Unbalanced parentheses: closing parenthesis without opening');
      break;
    }
  }
  if (parenCount > 0) {
    errors.push('Unbalanced parentheses: unclosed opening parenthesis');
  }

  // Check for required keywords in CREATE TABLE statements
  const createTableRegex = /CREATE\s+TABLE\s+(\w+)/gi;
  const matches = sql.matchAll(createTableRegex);
  for (const match of matches) {
    const tableName = match[1];
    const tableDefStart = match.index! + match[0].length;
    const nextTableMatch = sql.indexOf('CREATE TABLE', tableDefStart);
    const tableDefEnd = nextTableMatch === -1 ? sql.length : nextTableMatch;
    const tableDef = sql.substring(tableDefStart, tableDefEnd);

    if (!tableDef.includes('(') || !tableDef.includes(')')) {
      errors.push(`Table '${tableName}' missing column definitions`);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
