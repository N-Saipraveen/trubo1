/**
 * NoSQL Schema Extractor
 * Extracts schema information from MongoDB and other NoSQL databases
 */

import logger from '../../utils/logger';

export interface NoSqlCollection {
  name: string;
  fields: NoSqlField[];
  indexes?: NoSqlIndex[];
  validator?: any;
}

export interface NoSqlField {
  name: string;
  type: string;
  required?: boolean;
  unique?: boolean;
  ref?: string; // Reference to another collection
  default?: any;
  enum?: string[];
}

export interface NoSqlIndex {
  fields: Record<string, 1 | -1>; // 1 for ascending, -1 for descending
  unique?: boolean;
  sparse?: boolean;
}

export interface NoSqlSchema {
  collections: NoSqlCollection[];
  relationships: NoSqlRelationship[];
}

export interface NoSqlRelationship {
  from: string; // collection.field
  to: string; // collection
  type: '1:1' | '1:N' | 'N:M';
  embedded?: boolean;
}

/**
 * Extract schema from MongoDB-style JSON
 */
export async function extractNoSqlSchema(data: any): Promise<NoSqlSchema> {
  try {
    const collections: NoSqlCollection[] = [];
    const relationships: NoSqlRelationship[] = [];

    // Handle different input formats
    if (Array.isArray(data.collections)) {
      // Format: { collections: [...] }
      for (const coll of data.collections) {
        const collection = parseCollection(coll);
        collections.push(collection);
      }
    } else if (typeof data === 'object' && !Array.isArray(data)) {
      // Format: { collectionName: { fields: [...] }, ... }
      for (const [name, schema] of Object.entries(data)) {
        if (typeof schema === 'object') {
          const collection = parseCollection({ name, ...schema });
          collections.push(collection);
        }
      }
    }

    // Extract relationships from ref fields
    for (const collection of collections) {
      for (const field of collection.fields) {
        if (field.ref) {
          relationships.push({
            from: `${collection.name}.${field.name}`,
            to: field.ref,
            type: field.type === 'array' ? '1:N' : '1:1',
            embedded: false,
          });
        }

        // Check for embedded documents
        if (field.type === 'object' || field.type === 'array') {
          // Potentially embedded relationship
          relationships.push({
            from: `${collection.name}.${field.name}`,
            to: field.name,
            type: field.type === 'array' ? '1:N' : '1:1',
            embedded: true,
          });
        }
      }
    }

    logger.info(`Extracted ${collections.length} collections with ${relationships.length} relationships`);

    return { collections, relationships };
  } catch (error) {
    logger.error('Failed to extract NoSQL schema:', error);
    throw new Error('Failed to parse NoSQL schema');
  }
}

/**
 * Parse collection definition
 */
function parseCollection(data: any): NoSqlCollection {
  const collection: NoSqlCollection = {
    name: data.name || 'unknown',
    fields: [],
    indexes: data.indexes || [],
    validator: data.validator,
  };

  // Parse fields
  if (Array.isArray(data.fields)) {
    collection.fields = data.fields.map(parseField);
  } else if (data.schema && Array.isArray(data.schema)) {
    collection.fields = data.schema.map(parseField);
  } else if (typeof data === 'object') {
    // Infer fields from object structure
    for (const [key, value] of Object.entries(data)) {
      if (key !== 'name' && key !== 'indexes' && key !== 'validator') {
        collection.fields.push(inferField(key, value));
      }
    }
  }

  return collection;
}

/**
 * Parse field definition
 */
function parseField(data: any): NoSqlField {
  if (typeof data === 'string') {
    return {
      name: data,
      type: 'string',
    };
  }

  return {
    name: data.name || data.field || 'unknown',
    type: normalizeType(data.type || 'string'),
    required: data.required || false,
    unique: data.unique || false,
    ref: data.ref || data.reference,
    default: data.default,
    enum: data.enum,
  };
}

/**
 * Infer field from value
 */
function inferField(name: string, value: any): NoSqlField {
  let type = 'string';

  if (typeof value === 'object' && value !== null) {
    if (value.type) {
      type = normalizeType(value.type);
    } else if (Array.isArray(value)) {
      type = 'array';
    } else {
      type = 'object';
    }

    return {
      name,
      type,
      required: value.required,
      unique: value.unique,
      ref: value.ref,
      default: value.default,
    };
  }

  if (typeof value === 'string') {
    type = normalizeType(value);
  }

  return { name, type };
}

/**
 * Normalize BSON type to standard type
 */
function normalizeType(type: string): string {
  const typeMap: Record<string, string> = {
    string: 'string',
    str: 'string',
    text: 'string',

    number: 'number',
    int: 'number',
    integer: 'number',
    float: 'number',
    double: 'number',
    decimal: 'decimal',

    boolean: 'boolean',
    bool: 'boolean',

    date: 'date',
    datetime: 'date',
    timestamp: 'timestamp',

    objectId: 'objectId',
    objectid: 'objectId',
    _id: 'objectId',

    array: 'array',
    list: 'array',

    object: 'object',
    document: 'object',
    embedded: 'object',

    binary: 'binData',
    buffer: 'binData',
  };

  return typeMap[type.toLowerCase()] || 'string';
}

/**
 * Infer schema from sample data
 */
export function inferSchemaFromData(data: any[], collectionName: string = 'collection'): NoSqlCollection {
  const fieldMap = new Map<string, { types: Set<string>; nullable: boolean }>();

  // Analyze all documents
  for (const doc of data) {
    analyzeDocument(doc, fieldMap);
  }

  // Build field list
  const fields: NoSqlField[] = [];
  for (const [name, info] of fieldMap.entries()) {
    const types = Array.from(info.types);
    const type = types.length === 1 ? types[0] : 'string'; // Default to string if multiple types

    fields.push({
      name,
      type,
      required: !info.nullable,
    });
  }

  return {
    name: collectionName,
    fields,
  };
}

/**
 * Analyze document to extract field information
 */
function analyzeDocument(doc: any, fieldMap: Map<string, { types: Set<string>; nullable: boolean }>, prefix = '') {
  for (const [key, value] of Object.entries(doc)) {
    const fieldName = prefix ? `${prefix}.${key}` : key;
    const type = getValueType(value);

    if (!fieldMap.has(fieldName)) {
      fieldMap.set(fieldName, { types: new Set(), nullable: false });
    }

    const fieldInfo = fieldMap.get(fieldName)!;
    fieldInfo.types.add(type);

    if (value === null || value === undefined) {
      fieldInfo.nullable = true;
    }

    // Recurse for nested objects
    if (type === 'object' && value !== null) {
      analyzeDocument(value, fieldMap, fieldName);
    }
  }
}

/**
 * Get type of value
 */
function getValueType(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'string';
}
