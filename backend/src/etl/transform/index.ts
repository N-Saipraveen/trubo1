/**
 * ETL Transform Layer
 * Unified interface for transforming schemas between formats
 */

export * from './sqlToNoSqlTransformer';
export * from './noSqlToSqlTransformer';

import { SqlSchema } from '../extract/sqlExtractor';
import { NoSqlSchema } from '../extract/nosqlExtractor';
import { transformSqlToNoSql, TransformOptions } from './sqlToNoSqlTransformer';
import { transformNoSqlToSql, NoSqlToSqlOptions } from './noSqlToSqlTransformer';

/**
 * Transform schema from one format to another
 */
export async function transform(
  schema: SqlSchema | NoSqlSchema,
  targetFormat: 'sql' | 'nosql',
  options: TransformOptions | NoSqlToSqlOptions = {}
): Promise<SqlSchema | NoSqlSchema> {
  if (targetFormat === 'nosql') {
    return transformSqlToNoSql(schema as SqlSchema, options as TransformOptions);
  } else {
    return transformNoSqlToSql(schema as NoSqlSchema, options as NoSqlToSqlOptions);
  }
}
