/**
 * Backend API type definitions
 */

export interface ConvertRequest {
  input: string | object;
  sourceType: 'sql' | 'nosql' | 'json';
  targetType: 'sql' | 'nosql' | 'json';
  dialect?: 'mysql' | 'postgresql' | 'sqlite' | 'mssql';
  options?: {
    preserveCase?: boolean;
    generateIds?: boolean;
    embedRelations?: boolean;
    normalizeDepth?: number;
    includeTimestamps?: boolean;
    strictMode?: boolean;
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
    };
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
