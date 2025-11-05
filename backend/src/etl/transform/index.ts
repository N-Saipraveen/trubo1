/**
 * ETL Transform Layer
 * Unified interface for transforming schemas between formats
 */

export * from './sqlToNoSqlTransformer';
export * from './noSqlToSqlTransformer';
export * from './intelligentSqlToNoSqlTransformer';

import { SqlSchema } from '../extract/sqlExtractor';
import { NoSqlSchema } from '../extract/nosqlExtractor';
import { transformSqlToNoSql, TransformOptions } from './sqlToNoSqlTransformer';
import { transformNoSqlToSql, NoSqlToSqlOptions } from './noSqlToSqlTransformer';
import { intelligentSqlToNoSql, IntelligentTransformOptions } from './intelligentSqlToNoSqlTransformer';

/**
 * Transform schema from one format to another
 */
export async function transform(
  schema: SqlSchema | NoSqlSchema,
  targetFormat: 'sql' | 'nosql',
  options: TransformOptions | NoSqlToSqlOptions | IntelligentTransformOptions = {}
): Promise<SqlSchema | NoSqlSchema> {
  if (targetFormat === 'nosql') {
    // Check if intelligent transformation is requested
    if ('analyzeQueryPatterns' in options || 'embedSmallOneToMany' in options) {
      return intelligentSqlToNoSql(schema as SqlSchema, options as IntelligentTransformOptions);
    }
    return transformSqlToNoSql(schema as SqlSchema, options as TransformOptions);
  } else {
    return transformNoSqlToSql(schema as NoSqlSchema, options as NoSqlToSqlOptions);
  }
}
