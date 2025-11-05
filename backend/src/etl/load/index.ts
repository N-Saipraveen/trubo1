/**
 * ETL Load Layer
 * Unified interface for loading and exporting schemas
 */

export * from './sqlLoader';
export * from './nosqlLoader';
export * from './sqliteLoader';

import { SqlSchema } from '../extract/sqlExtractor';
import { NoSqlSchema } from '../extract/nosqlExtractor';
import { loadSqlSchema, SqlLoadOptions } from './sqlLoader';
import { loadNoSqlSchema, NoSqlLoadOptions } from './nosqlLoader';
import { loadSQLiteSchema, SQLiteLoadOptions } from './sqliteLoader';

/**
 * Load schema and generate output based on target format
 */
export async function load(
  schema: SqlSchema | NoSqlSchema,
  format: 'sql' | 'sqlite' | 'nosql' | 'json' | 'yaml' | 'mongoose',
  options: SqlLoadOptions | SQLiteLoadOptions | NoSqlLoadOptions = {}
): Promise<string> {
  if (format === 'sql') {
    return loadSqlSchema(schema as SqlSchema, options as SqlLoadOptions);
  } else if (format === 'sqlite') {
    return loadSQLiteSchema(schema as SqlSchema, options as SQLiteLoadOptions);
  } else {
    const nosqlOptions = options as NoSqlLoadOptions;
    nosqlOptions.format = format as any;
    return loadNoSqlSchema(schema as NoSqlSchema, nosqlOptions);
  }
}
