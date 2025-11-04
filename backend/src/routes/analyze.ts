/**
 * Schema analysis API routes
 */

import { Router, Request, Response } from 'express';
import { analyzeSchema } from '@turbodbx/core';
import { AnalyzeRequest, AnalyzeResponse } from '../types';

const router = Router();

/**
 * POST /api/analyze
 * Analyze a schema to detect type, structure, and quality
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const request: AnalyzeRequest = req.body;

    if (!request.input) {
      return res.status(400).json({
        success: false,
        errors: ['Missing required field: input'],
      } as AnalyzeResponse);
    }

    let input = request.input;

    // If input is a string, try to parse it as JSON
    if (typeof input === 'string') {
      try {
        input = JSON.parse(input);
      } catch {
        // Keep as string (likely SQL)
      }
    }

    const analysis = analyzeSchema(input);

    const response: AnalyzeResponse = {
      success: true,
      analysis,
    };

    res.json(response);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    } as AnalyzeResponse);
  }
});

export default router;
