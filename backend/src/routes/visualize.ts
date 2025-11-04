/**
 * Schema visualization API routes
 */

import { Router, Request, Response } from 'express';
import { VisualizeRequest, VisualizeResponse } from '../types';

const router = Router();

/**
 * POST /api/visualize
 * Generate graph data for schema visualization
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const request: VisualizeRequest = req.body;

    if (!request.input || !request.type) {
      return res.status(400).json({
        success: false,
        errors: ['Missing required fields: input, type'],
      } as VisualizeResponse);
    }

    let input = request.input;

    // Parse string input if needed
    if (typeof input === 'string') {
      if (request.type !== 'sql') {
        try {
          input = JSON.parse(input);
        } catch {
          return res.status(400).json({
            success: false,
            errors: ['Invalid JSON input'],
          } as VisualizeResponse);
        }
      }
    }

    // Generate graph based on type
    let graph;

    if (request.type === 'sql') {
      graph = generateSqlGraph(input as string);
    } else if (request.type === 'nosql') {
      graph = generateNoSqlGraph(input as any);
    } else if (request.type === 'json') {
      graph = generateJsonGraph(input as any);
    } else {
      return res.status(400).json({
        success: false,
        errors: ['Invalid type. Must be sql, nosql, or json'],
      } as VisualizeResponse);
    }

    const response: VisualizeResponse = {
      success: true,
      graph,
    };

    res.json(response);
  } catch (error) {
    console.error('Visualization error:', error);
    res.status(500).json({
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    } as VisualizeResponse);
  }
});

/**
 * Generate graph from SQL schema
 */
function generateSqlGraph(sql: string): NonNullable<VisualizeResponse['graph']> {
  const nodes: NonNullable<VisualizeResponse['graph']>['nodes'] = [];
  const edges: NonNullable<VisualizeResponse['graph']>['edges'] = [];

  // Extract tables
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?\s*\(([\s\S]*?)\);/gi;
  const matches = Array.from(sql.matchAll(tableRegex));

  for (const match of matches) {
    const tableName = match[1];
    const tableBody = match[2];

    // Add table node
    nodes.push({
      id: tableName,
      label: tableName,
      type: 'table',
      data: { body: tableBody },
    });

    // Extract foreign keys
    const fkRegex = /FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(\w+)\s*\(([^)]+)\)/gi;
    const fkMatches = Array.from(tableBody.matchAll(fkRegex));

    for (const fkMatch of fkMatches) {
      const column = fkMatch[1].trim();
      const refTable = fkMatch[2];
      const refColumn = fkMatch[3].trim();

      edges.push({
        source: tableName,
        target: refTable,
        label: `${column} → ${refColumn}`,
        type: 'relationship',
      });
    }
  }

  return { nodes, edges };
}

/**
 * Generate graph from NoSQL schema
 */
function generateNoSqlGraph(schema: any): NonNullable<VisualizeResponse['graph']> {
  const nodes: NonNullable<VisualizeResponse['graph']>['nodes'] = [];
  const edges: NonNullable<VisualizeResponse['graph']>['edges'] = [];

  if (!schema.collections || !Array.isArray(schema.collections)) {
    return { nodes, edges };
  }

  for (const collection of schema.collections) {
    // Add collection node
    nodes.push({
      id: collection.name,
      label: collection.name,
      type: 'collection',
      data: { fields: collection.fields },
    });

    // Extract references
    if (collection.fields) {
      for (const field of collection.fields) {
        if (field.ref) {
          edges.push({
            source: collection.name,
            target: field.ref,
            label: field.name,
            type: 'reference',
          });
        }

        // Handle nested fields
        if (field.nested) {
          nodes.push({
            id: `${collection.name}.${field.name}`,
            label: field.name,
            type: 'field',
            data: { nested: field.nested },
          });

          edges.push({
            source: collection.name,
            target: `${collection.name}.${field.name}`,
            type: 'nested',
          });
        }
      }
    }
  }

  return { nodes, edges };
}

/**
 * Generate graph from JSON schema
 */
function generateJsonGraph(schema: any): NonNullable<VisualizeResponse['graph']> {
  const nodes: NonNullable<VisualizeResponse['graph']>['nodes'] = [];
  const edges: NonNullable<VisualizeResponse['graph']>['edges'] = [];

  // Add root node
  nodes.push({
    id: 'root',
    label: 'JSON Schema',
    type: 'table',
    data: schema,
  });

  if (schema.properties) {
    for (const [key, value] of Object.entries(schema.properties)) {
      const prop = value as any;
      nodes.push({
        id: key,
        label: `${key} (${prop.type})`,
        type: 'field',
        data: prop,
      });

      edges.push({
        source: 'root',
        target: key,
        type: 'nested',
      });

      // Handle nested objects
      if (prop.type === 'object' && prop.properties) {
        for (const [nestedKey, nestedValue] of Object.entries(prop.properties)) {
          const nestedProp = nestedValue as any;
          nodes.push({
            id: `${key}.${nestedKey}`,
            label: `${nestedKey} (${nestedProp.type})`,
            type: 'field',
            data: nestedProp,
          });

          edges.push({
            source: key,
            target: `${key}.${nestedKey}`,
            type: 'nested',
          });
        }
      }
    }
  }

  return { nodes, edges };
}

export default router;
