/**
 * ETL Load Layer
 * Unified interface for loading and exporting schemas
 */

export * from './sqlLoader';
export * from './nosqlLoader';

import { SqlSchema } from '../extract/sqlExtractor';
import { NoSqlSchema } from '../extract/nosqlExtractor';
import { loadSqlSchema, SqlLoadOptions } from './sqlLoader';
import { loadNoSqlSchema, NoSqlLoadOptions } from './nosqlLoader';

/**
 * Load schema and generate output based on target format
 */
export async function load(
  schema: SqlSchema | NoSqlSchema,
  format: 'sql' | 'nosql' | 'json' | 'yaml' | 'mongoose',
  options: SqlLoadOptions | NoSqlLoadOptions = {}
): Promise<string> {
  if (format === 'sql') {
    return loadSqlSchema(schema as SqlSchema, options as SqlLoadOptions);
  } else {
    const nosqlOptions = options as NoSqlLoadOptions;
    nosqlOptions.format = format as any;
    return loadNoSqlSchema(schema as NoSqlSchema, nosqlOptions);
  }
}
