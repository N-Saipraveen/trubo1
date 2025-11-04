/**
 * JSON Data Extractor
 * Infers schema from JSON data
 */

import logger from '../../utils/logger';
import { NoSqlCollection, inferSchemaFromData } from './nosqlExtractor';

export interface JsonSchema {
  rootType: 'array' | 'object';
  structure: any;
  inferred?: NoSqlCollection;
}

/**
 * Extract schema from JSON data
 */
export async function extractJsonSchema(data: any, collectionName: string = 'data'): Promise<JsonSchema> {
  try {
    const rootType = Array.isArray(data) ? 'array' : 'object';

    // Build structure map
    const structure = buildStructure(data);

    // Infer NoSQL-style schema if data is an array of objects
    let inferred: NoSqlCollection | undefined;
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      inferred = inferSchemaFromData(data, collectionName);
    }

    logger.info(`Extracted JSON schema, root type: ${rootType}`);

    return {
      rootType,
      structure,
      inferred,
    };
  } catch (error) {
    logger.error('Failed to extract JSON schema:', error);
    throw new Error('Failed to parse JSON schema');
  }
}

/**
 * Build structure map from data
 */
function buildStructure(data: any, maxDepth = 5, currentDepth = 0): any {
  if (currentDepth >= maxDepth) {
    return { type: typeof data, truncated: true };
  }

  if (data === null || data === undefined) {
    return { type: 'null' };
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return { type: 'array', items: { type: 'unknown' } };
    }

    // Analyze first few items to infer array item type
    const samples = data.slice(0, Math.min(10, data.length));
    const itemTypes = new Set(samples.map(item => typeof item));

    if (itemTypes.size === 1 && itemTypes.has('object')) {
      // Array of objects - merge their structures
      const merged = mergeObjectStructures(samples, maxDepth, currentDepth);
      return {
        type: 'array',
        items: merged,
        count: data.length,
      };
    } else {
      // Array of primitives or mixed
      return {
        type: 'array',
        items: { type: Array.from(itemTypes).join(' | ') },
        count: data.length,
      };
    }
  }

  if (typeof data === 'object') {
    const properties: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      properties[key] = buildStructure(value, maxDepth, currentDepth + 1);
    }

    return {
      type: 'object',
      properties,
    };
  }

  // Primitive types
  return {
    type: typeof data,
    example: data,
  };
}

/**
 * Merge structures of multiple objects
 */
function mergeObjectStructures(objects: any[], maxDepth: number, currentDepth: number): any {
  const merged: Record<string, Set<string>> = {};

  for (const obj of objects) {
    if (typeof obj !== 'object' || obj === null) continue;

    for (const key of Object.keys(obj)) {
      if (!merged[key]) {
        merged[key] = new Set();
      }
      merged[key].add(typeof obj[key]);
    }
  }

  const properties: Record<string, any> = {};
  for (const [key, types] of Object.entries(merged)) {
    const typeArray = Array.from(types);
    if (typeArray.length === 1 && typeArray[0] === 'object') {
      // Recurse for nested objects
      const nestedObjects = objects
        .map(o => o[key])
        .filter(v => typeof v === 'object' && v !== null);

      if (nestedObjects.length > 0) {
        properties[key] = mergeObjectStructures(nestedObjects, maxDepth, currentDepth + 1);
      } else {
        properties[key] = { type: 'object' };
      }
    } else {
      properties[key] = {
        type: typeArray.join(' | '),
        optional: objects.some(o => !(key in o)),
      };
    }
  }

  return {
    type: 'object',
    properties,
  };
}

/**
 * Convert JSON schema to OpenAPI schema format
 */
export function toOpenApiSchema(jsonSchema: JsonSchema): any {
  const convert = (structure: any): any => {
    if (!structure || !structure.type) {
      return { type: 'string' };
    }

    if (structure.type === 'array') {
      return {
        type: 'array',
        items: structure.items ? convert(structure.items) : { type: 'string' },
      };
    }

    if (structure.type === 'object') {
      const properties: Record<string, any> = {};
      const required: string[] = [];

      if (structure.properties) {
        for (const [key, value] of Object.entries(structure.properties)) {
          properties[key] = convert(value);
          if (!(value as any).optional) {
            required.push(key);
          }
        }
      }

      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
      };
    }

    // Map types to OpenAPI types
    const typeMap: Record<string, string> = {
      string: 'string',
      number: 'number',
      boolean: 'boolean',
      null: 'null',
    };

    return {
      type: typeMap[structure.type] || 'string',
      example: structure.example,
    };
  };

  return convert(jsonSchema.structure);
}
