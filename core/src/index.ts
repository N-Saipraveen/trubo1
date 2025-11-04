/**
 * TurboDbx Core - Database Conversion Engine
 * Universal converter for SQL ↔ NoSQL ↔ JSON
 */

// Export types
export * from './types';

// Export converters
export { convertSqlToNoSql, convertSqlDataToNoSql } from './converters/sqlToNoSql';
export { convertNoSqlToSql } from './converters/noSqlToSql';
export {
  convertJsonToSql,
  convertJsonToNoSql,
  convertSqlToJson,
} from './converters/jsonConverters';

// Export utilities
export {
  validateJsonSchema,
  validateSqlSyntax,
  analyzeSchema,
} from './utils/schemaValidator';

export {
  mapSqlToNoSql,
  mapNoSqlToSql,
  mapSqlToJsonType,
  mapNoSqlToJsonType,
  sqlToNoSqlFieldName,
  noSqlToSqlFieldName,
  tableToCollectionName,
  collectionToTableName,
  sanitizeIdentifier,
} from './utils/dataMapper';
