/**
 * Types for converters from standardized JSON
 */

export interface ConversionOptions {
  includeDropStatements?: boolean;
  includeIfNotExists?: boolean;
  indentation?: string;
  includeComments?: boolean;
}

export interface MySQLOptions extends ConversionOptions {
  engine?: 'InnoDB' | 'MyISAM';
  charset?: string;
  collation?: string;
}

export interface PostgreSQLOptions extends ConversionOptions {
  useSerial?: boolean;
}

export interface SQLiteOptions extends ConversionOptions {
  enableForeignKeys?: boolean;
  strictMode?: boolean;
}

export interface MongoDBOptions extends ConversionOptions {
  format?: 'json' | 'mongoose' | 'validator';
  embedSmallRelationships?: boolean;
  generateIndexes?: boolean;
  generateValidators?: boolean;
}
