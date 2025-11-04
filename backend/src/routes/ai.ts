/**
 * AI Routes
 * API endpoints for AI-powered schema intelligence
 */

import express, { Request, Response } from 'express';
import { mapSchemaWithAI, getSchemaImprovementSuggestions, explainRelationships } from '../ai/aiService';
import { aiRateLimiter, asyncHandler } from '../middleware/security';
import logger from '../utils/logger';

const router = express.Router();

/**
 * POST /api/ai/map-schema
 * AI-powered schema mapping
 */
router.post('/map-schema', aiRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { schemaText, targetType, dialect } = req.body;

  if (!schemaText || !targetType) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: schemaText, targetType',
    });
  }

  if (!['sql', 'nosql'].includes(targetType)) {
    return res.status(400).json({
      success: false,
      error: 'targetType must be either "sql" or "nosql"',
    });
  }

  logger.info('AI schema mapping requested', { targetType, dialect });

  try {
    const mappedSchema = await mapSchemaWithAI(schemaText, targetType, dialect);

    res.json({
      success: true,
      data: {
        mappedSchema,
        targetType,
        dialect,
      },
    });
  } catch (error) {
    logger.error('AI schema mapping failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Schema mapping failed',
    });
  }
}));

/**
 * POST /api/ai/suggest-improvements
 * Get AI suggestions for schema improvements
 */
router.post('/suggest-improvements', aiRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { schemaText, analysisResult } = req.body;

  if (!schemaText) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: schemaText',
    });
  }

  logger.info('AI improvement suggestions requested');

  try {
    const suggestions = await getSchemaImprovementSuggestions(schemaText, analysisResult || {});

    res.json({
      success: true,
      data: {
        suggestions,
        count: suggestions.length,
      },
    });
  } catch (error) {
    logger.error('AI suggestions failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate suggestions',
    });
  }
}));

/**
 * POST /api/ai/explain-relationships
 * Get AI explanation of schema relationships
 */
router.post('/explain-relationships', aiRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { schemaText } = req.body;

  if (!schemaText) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: schemaText',
    });
  }

  logger.info('AI relationship explanation requested');

  try {
    const explanation = await explainRelationships(schemaText);

    res.json({
      success: true,
      data: {
        explanation,
      },
    });
  } catch (error) {
    logger.error('AI explanation failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate explanation',
    });
  }
}));

/**
 * GET /api/ai/status
 * Check AI service availability
 */
router.get('/status', asyncHandler(async (_req: Request, res: Response) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const apiBaseUrl = process.env.API_BASE_URL;

  const isConfigured = !!(apiKey && apiBaseUrl);

  res.json({
    success: true,
    data: {
      available: isConfigured,
      model: process.env.AI_MODEL || 'gpt-3.5-turbo',
      configured: isConfigured,
    },
  });
}));

export default router;
