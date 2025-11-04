/**
 * ETL Extract Layer
 * Unified interface for extracting schemas from different sources
 */

export * from './sqlExtractor';
export * from './nosqlExtractor';
export * from './jsonExtractor';

import { extractSqlSchema, SqlSchema } from './sqlExtractor';
import { extractNoSqlSchema, NoSqlSchema } from './nosqlExtractor';
import { extractJsonSchema, JsonSchema } from './jsonExtractor';
import logger from '../../utils/logger';

export type ExtractedSchema = SqlSchema | NoSqlSchema | JsonSchema;

/**
 * Auto-detect and extract schema from input
 */
export async function autoExtract(input: string | any): Promise<{
  type: 'sql' | 'nosql' | 'json';
  schema: ExtractedSchema;
}> {
  try {
    // If input is a string, try to parse as SQL first
    if (typeof input === 'string') {
      const trimmed = input.trim().toUpperCase();

      if (trimmed.startsWith('CREATE TABLE') || trimmed.includes('CREATE TABLE')) {
        logger.info('Detected SQL schema');
        const schema = await extractSqlSchema(input);
        return { type: 'sql', schema };
      }

      // Try parsing as JSON
      try {
        const parsed = JSON.parse(input);
        return autoExtract(parsed);
      } catch {
        throw new Error('Unable to parse input as SQL or JSON');
      }
    }

    // If input is an object
    if (typeof input === 'object' && input !== null) {
      // Check if it's NoSQL format
      if (input.collections || input.type === 'mongodb') {
        logger.info('Detected NoSQL schema');
        const schema = await extractNoSqlSchema(input);
        return { type: 'nosql', schema };
      }

      // Otherwise treat as JSON data
      logger.info('Detected JSON data');
      const schema = await extractJsonSchema(input);
      return { type: 'json', schema };
    }

    throw new Error('Unsupported input format');
  } catch (error) {
    logger.error('Auto-extraction failed:', error);
    throw error;
  }
}
