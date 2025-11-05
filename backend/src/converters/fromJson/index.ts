/**
 * Phase 2 Converters: From Standardized JSON to Target Formats
 */

export * from './types';
export * from './jsonToMySQL';
export * from './jsonToPostgreSQL';
export * from './jsonToSQLite';
export * from './jsonToMongoDB';

import { StandardizedSchema } from '../../schema_parser/types';
import { jsonToMySQL } from './jsonToMySQL';
import { jsonToPostgreSQL } from './jsonToPostgreSQL';
import { jsonToSQLite } from './jsonToSQLite';
import { jsonToMongoDB } from './jsonToMongoDB';
import { MySQLOptions, PostgreSQLOptions, SQLiteOptions, MongoDBOptions } from './types';

export type TargetFormat = 'mysql' | 'postgresql' | 'sqlite' | 'mongodb';
export type ConversionOptionsMap = {
  mysql: MySQLOptions;
  postgresql: PostgreSQLOptions;
  sqlite: SQLiteOptions;
  mongodb: MongoDBOptions;
};

/**
 * Universal converter function
 * Routes to the appropriate converter based on target format
 */
export function convertFromJson(
  schema: StandardizedSchema,
  targetFormat: TargetFormat,
  options: any = {}
): string {
  switch (targetFormat) {
    case 'mysql':
      return jsonToMySQL(schema, options as MySQLOptions);

    case 'postgresql':
      return jsonToPostgreSQL(schema, options as PostgreSQLOptions);

    case 'sqlite':
      return jsonToSQLite(schema, options as SQLiteOptions);

    case 'mongodb':
      return jsonToMongoDB(schema, options as MongoDBOptions);

    default:
      throw new Error(`Unsupported target format: ${targetFormat}`);
  }
}
