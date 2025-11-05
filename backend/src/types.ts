/**
 * Backend API type definitions
 */

export interface ConvertRequest {
  input: string | object;
  sourceType: 'sql' | 'nosql' | 'json' | 'mysql' | 'postgresql' | 'sqlite' | 'mongodb';
  targetType: 'sql' | 'nosql' | 'json' | 'mysql' | 'postgresql' | 'sqlite' | 'mongodb';
  dialect?: 'mysql' | 'postgresql' | 'sqlite' | 'mssql';
  options?: {
    // Legacy options
    preserveCase?: boolean;
    generateIds?: boolean;
    embedRelations?: boolean;
    normalizeDepth?: number;
    includeTimestamps?: boolean;

    // Common conversion options (Phase 2)
    includeDropStatements?: boolean;
    includeIfNotExists?: boolean;
    includeComments?: boolean;
    indentation?: string;
    strictMode?: boolean;

    // MySQL-specific
    engine?: 'InnoDB' | 'MyISAM';
    charset?: string;
    collation?: string;

    // PostgreSQL-specific
    useSerial?: boolean;

    // SQLite-specific
    enableForeignKeys?: boolean;

    // MongoDB-specific
    format?: 'json' | 'mongoose' | 'validator';
    embedSmallRelationships?: boolean;
    generateIndexes?: boolean;
    generateValidators?: boolean;
  };
}

export interface ConvertResponse {
  success: boolean;
  result?: {
    schema: any;
    data?: any[];
    metadata?: {
      sourceType: string;
      targetType: string;
      tablesOrCollections: number;
      conversionTime: number;
      phase1Time?: string;
      phase2Time?: string;
    };
    standardizedJson?: any; // The intermediate standardized JSON schema from Phase 1
  };
  errors?: string[];
  warnings?: string[];
}

export interface AnalyzeRequest {
  input: string | object;
}

export interface AnalyzeResponse {
  success: boolean;
  analysis?: {
    type: 'sql' | 'nosql' | 'json' | 'unknown';
    dialect?: string;
    structure: {
      tables?: number;
      collections?: number;
      totalFields: number;
      relationships: number;
      indexes: number;
    };
    quality: {
      hasConstraints: boolean;
      hasIndexes: boolean;
      normalizedLevel?: number;
    };
    suggestions?: string[];
  };
  errors?: string[];
}

export interface VisualizeRequest {
  input: string | object;
  type: 'sql' | 'nosql' | 'json';
}

export interface VisualizeResponse {
  success: boolean;
  graph?: {
    nodes: Array<{
      id: string;
      label: string;
      type: 'table' | 'collection' | 'field';
      data: any;
    }>;
    edges: Array<{
      source: string;
      target: string;
      label?: string;
      type: 'relationship' | 'reference' | 'nested';
    }>;
  };
  errors?: string[];
}
