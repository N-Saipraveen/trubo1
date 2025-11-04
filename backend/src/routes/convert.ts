/**
 * Conversion API routes
 */

import { Router, Request, Response } from 'express';
import {
  convertSqlToNoSql,
  convertNoSqlToSql,
  convertJsonToSql,
  convertJsonToNoSql,
  convertSqlToJson,
} from '@turbodbx/core';
import { ConvertRequest, ConvertResponse } from '../types';

const router = Router();

/**
 * POST /api/convert
 * Convert between SQL, NoSQL, and JSON formats
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const request: ConvertRequest = req.body;

    if (!request.input || !request.sourceType || !request.targetType) {
      return res.status(400).json({
        success: false,
        errors: ['Missing required fields: input, sourceType, targetType'],
      } as ConvertResponse);
    }

    let result;

    // SQL to NoSQL
    if (request.sourceType === 'sql' && request.targetType === 'nosql') {
      if (typeof request.input !== 'string') {
        return res.status(400).json({
          success: false,
          errors: ['SQL input must be a string'],
        } as ConvertResponse);
      }
      result = convertSqlToNoSql(request.input, request.options);
    }
    // NoSQL to SQL
    else if (request.sourceType === 'nosql' && request.targetType === 'sql') {
      if (typeof request.input === 'string') {
        try {
          request.input = JSON.parse(request.input);
        } catch {
          return res.status(400).json({
            success: false,
            errors: ['Invalid NoSQL JSON input'],
          } as ConvertResponse);
        }
      }
      result = convertNoSqlToSql(
        request.input as any,
        request.dialect || 'postgresql',
        request.options
      );
    }
    // JSON to SQL
    else if (request.sourceType === 'json' && request.targetType === 'sql') {
      if (typeof request.input === 'string') {
        try {
          request.input = JSON.parse(request.input);
        } catch {
          return res.status(400).json({
            success: false,
            errors: ['Invalid JSON input'],
          } as ConvertResponse);
        }
      }
      result = convertJsonToSql(
        request.input,
        'data',
        request.dialect || 'postgresql',
        request.options
      );
    }
    // JSON to NoSQL
    else if (request.sourceType === 'json' && request.targetType === 'nosql') {
      if (typeof request.input === 'string') {
        try {
          request.input = JSON.parse(request.input);
        } catch {
          return res.status(400).json({
            success: false,
            errors: ['Invalid JSON input'],
          } as ConvertResponse);
        }
      }
      result = convertJsonToNoSql(request.input, 'data', request.options);
    }
    // SQL to JSON
    else if (request.sourceType === 'sql' && request.targetType === 'json') {
      if (typeof request.input !== 'string') {
        return res.status(400).json({
          success: false,
          errors: ['SQL input must be a string'],
        } as ConvertResponse);
      }
      result = convertSqlToJson(request.input);
    }
    // NoSQL to JSON (direct pass-through with formatting)
    else if (request.sourceType === 'nosql' && request.targetType === 'json') {
      if (typeof request.input === 'string') {
        try {
          request.input = JSON.parse(request.input);
        } catch {
          return res.status(400).json({
            success: false,
            errors: ['Invalid NoSQL JSON input'],
          } as ConvertResponse);
        }
      }
      result = {
        success: true,
        schema: request.input,
        metadata: {
          sourceType: 'nosql',
          targetType: 'json',
          tablesOrCollections: 1,
          conversionTime: 0,
        },
      };
    } else {
      return res.status(400).json({
        success: false,
        errors: ['Invalid source/target type combination'],
      } as ConvertResponse);
    }

    const response: ConvertResponse = {
      success: result.success,
      result: result.success
        ? {
            schema: result.schema,
            data: result.data,
            metadata: result.metadata,
          }
        : undefined,
      errors: result.errors,
      warnings: result.warnings,
    };

    res.json(response);
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    } as ConvertResponse);
  }
});

export default router;
