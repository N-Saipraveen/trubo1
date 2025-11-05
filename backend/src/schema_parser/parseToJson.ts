/**
 * Phase 1: Parse any input schema to standardized JSON
 * Uses Claude API for intelligent schema extraction
 */

import axios from 'axios';
import logger from '../utils/logger';
import { StandardizedSchema } from './types';
import { validateStandardizedSchema } from './validator';

// Use provided API credentials directly
const OPENAI_API_KEY = 'sk-Wa6KkAFngRs0h8B17opjRljBhDNxHlxWBo7pVwGmIhnxwo8A';
const API_BASE_URL = 'https://api.chatanywhere.tech/v1';

export interface ParseToJsonOptions {
  sourceType?: 'mysql' | 'postgresql' | 'sqlite' | 'mongodb' | 'json' | 'auto';
  timeout?: number;
  validateOutput?: boolean;
}

/**
 * Parse any schema input to standardized JSON format
 * This is Phase 1 of the two-phase conversion architecture
 */
export async function parseToJson(
  schemaInput: string,
  options: ParseToJsonOptions = {}
): Promise<StandardizedSchema> {
  const {
    sourceType = 'auto',
    timeout = 30000,
    validateOutput = true,
  } = options;

  logger.info('Starting schema parsing to standardized JSON', { sourceType });

  try {
    // Step 1: Detect source type if auto
    const detectedType = sourceType === 'auto' ? detectSourceType(schemaInput) : sourceType;
    logger.info(`Detected source type: ${detectedType}`);

    // Step 2: Call Claude API with schema extraction prompt
    const standardizedSchema = await callClaudeForExtraction(schemaInput, detectedType, timeout);

    // Step 3: Validate the output
    if (validateOutput) {
      const validation = validateStandardizedSchema(standardizedSchema);
      if (!validation.valid) {
        logger.error('Schema validation failed', { errors: validation.errors });
        throw new Error(`Invalid schema format: ${validation.errors?.join(', ')}`);
      }
    }

    logger.info('Schema successfully parsed to standardized JSON', {
      tables: standardizedSchema.tables.length,
      relationships: standardizedSchema.relationships.length,
    });

    return standardizedSchema;
  } catch (error) {
    logger.error('Failed to parse schema to JSON', { error });
    throw new Error(`Schema parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Call Claude API for schema extraction
 * NOTE: The user will provide the actual prompt next
 */
async function callClaudeForExtraction(
  schemaInput: string,
  sourceType: string,
  timeout: number
): Promise<StandardizedSchema> {
  logger.info('Calling Claude API for schema extraction');

  // TODO: User will provide the extraction prompt
  // For now, this is a placeholder structure
  const systemPrompt = `You are TurboDbx Schema Extractor.
Your task is to analyze the provided database schema and extract it into a standardized JSON format.

[EXTRACTION PROMPT WILL BE PROVIDED BY USER]

Output ONLY valid JSON matching the StandardizedSchema format.`;

  const userPrompt = `Extract this ${sourceType} schema into standardized JSON format:

${schemaInput}

Return ONLY the JSON object, no additional text or markdown.`;

  try {
    const response = await axios.post(
      `${API_BASE_URL}/chat/completions`,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1, // Low temperature for consistent structured output
        max_tokens: 4000,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout,
      }
    );

    const content = response.data.choices[0]?.message?.content || '';

    // Extract JSON from response (might be wrapped in markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const standardizedSchema = JSON.parse(jsonMatch[0]);

    // Add metadata
    standardizedSchema.metadata = {
      ...standardizedSchema.metadata,
      sourceType,
      extractedAt: new Date().toISOString(),
      extractedBy: 'ai',
    };

    return standardizedSchema;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error('Claude API error', {
        status: error.response?.status,
        message: error.message,
      });
    }
    throw new Error(`AI extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Auto-detect the source schema type
 */
function detectSourceType(schemaInput: string): string {
  const input = schemaInput.trim().toLowerCase();

  // SQL patterns
  if (input.includes('create table') || input.includes('alter table')) {
    if (input.includes('autoincrement')) return 'sqlite';
    if (input.includes('auto_increment')) return 'mysql';
    return 'postgresql';
  }

  // MongoDB patterns
  if (input.includes('collections') || input.includes('_id') || input.includes('objectid')) {
    return 'mongodb';
  }

  // JSON/array pattern
  if (input.startsWith('[') || input.startsWith('{')) {
    return 'json';
  }

  return 'auto';
}
