/**
 * Conversion API routes - Two-Phase Architecture
 * Phase 1: Parse input → Standardized JSON
 * Phase 2: Convert JSON → Target format
 */

import { Router, Request, Response } from 'express';
import { ConvertRequest, ConvertResponse } from '../types';
import { parseToJson } from '../schema_parser/parseToJson';
import { convertFromJson, TargetFormat } from '../converters/fromJson';
import { MySQLOptions, PostgreSQLOptions, SQLiteOptions, MongoDBOptions } from '../converters/fromJson/types';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/convert
 * Two-phase conversion: Input → Standardized JSON → Target Format
 */
router.post('/', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const request: ConvertRequest = req.body;

    if (!request.input || !request.sourceType || !request.targetType) {
      return res.status(400).json({
        success: false,
        errors: ['Missing required fields: input, sourceType, targetType'],
      } as ConvertResponse);
    }

    logger.info('Starting two-phase conversion', {
      sourceType: request.sourceType,
      targetType: request.targetType,
    });

    // ====== PHASE 1: Parse input to standardized JSON ======
    logger.info('Phase 1: Parsing to standardized JSON...');

    const inputString = typeof request.input === 'string' ? request.input : JSON.stringify(request.input);

    const standardizedSchema = await parseToJson(inputString, {
      sourceType: request.sourceType as any,
      validateOutput: true,
    });

    logger.info('Phase 1 complete', {
      tables: standardizedSchema.tables.length,
      relationships: standardizedSchema.relationships.length,
    });

    // ====== PHASE 2: Convert JSON to target format ======
    logger.info('Phase 2: Converting to target format...');

    const targetFormat = mapTargetType(request.targetType, request.dialect);
    const conversionOptions = buildConversionOptions(request, targetFormat);

    const result = convertFromJson(standardizedSchema, targetFormat, conversionOptions);

    logger.info('Phase 2 complete');

    const conversionTime = Date.now() - startTime;

    // Return response
    const response: ConvertResponse = {
      success: true,
      result: {
        schema: result,
        metadata: {
          sourceType: request.sourceType,
          targetType: request.targetType,
          tablesOrCollections: standardizedSchema.tables.length,
          conversionTime,
          phase1Time: 'Parsed via AI',
          phase2Time: 'Converted from JSON',
        },
        standardizedJson: standardizedSchema, // Include the intermediate JSON
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Conversion error:', error);
    res.status(500).json({
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    } as ConvertResponse);
  }
});

/**
 * Map targetType and dialect to TargetFormat
 */
function mapTargetType(targetType: string, dialect?: string): TargetFormat {
  if (targetType === 'nosql' || targetType === 'mongodb') {
    return 'mongodb';
  }

  if (targetType === 'sql') {
    if (dialect === 'mysql') return 'mysql';
    if (dialect === 'sqlite') return 'sqlite';
    return 'postgresql'; // Default SQL dialect
  }

  // Direct format specification
  if (['mysql', 'postgresql', 'sqlite', 'mongodb'].includes(targetType)) {
    return targetType as TargetFormat;
  }

  // Default fallback
  return 'postgresql';
}

/**
 * Build conversion options for Phase 2
 */
function buildConversionOptions(
  request: ConvertRequest,
  targetFormat: TargetFormat
): MySQLOptions | PostgreSQLOptions | SQLiteOptions | MongoDBOptions {
  const baseOptions = {
    includeDropStatements: request.options?.includeDropStatements ?? false,
    includeIfNotExists: request.options?.includeIfNotExists ?? true,
    includeComments: request.options?.includeComments ?? true,
    indentation: request.options?.indentation ?? '  ',
  };

  switch (targetFormat) {
    case 'mysql':
      return {
        ...baseOptions,
        engine: request.options?.engine || 'InnoDB',
        charset: request.options?.charset || 'utf8mb4',
        collation: request.options?.collation || 'utf8mb4_unicode_ci',
      };

    case 'postgresql':
      return {
        ...baseOptions,
        useSerial: request.options?.useSerial ?? true,
      };

    case 'sqlite':
      return {
        ...baseOptions,
        enableForeignKeys: request.options?.enableForeignKeys ?? true,
        strictMode: request.options?.strictMode ?? false,
      };

    case 'mongodb':
      return {
        ...baseOptions,
        format: request.options?.format || 'json',
        embedSmallRelationships: request.options?.embedSmallRelationships ?? true,
        generateIndexes: request.options?.generateIndexes ?? true,
        generateValidators: request.options?.generateValidators ?? true,
      };

    default:
      return baseOptions;
  }
}

export default router;
