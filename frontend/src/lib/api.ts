/**
 * API service for TurboDbx backend
 */

const API_BASE_URL = '/api';

export interface ConversionOptions {
  preserveCase?: boolean;
  generateIds?: boolean;
  embedRelations?: boolean;
  normalizeDepth?: number;
  includeTimestamps?: boolean;
  strictMode?: boolean;
}

export interface ConvertRequest {
  input: string | object;
  sourceType: 'sql' | 'nosql' | 'json';
  targetType: 'sql' | 'nosql' | 'json';
  dialect?: 'mysql' | 'postgresql' | 'sqlite' | 'mssql';
  options?: ConversionOptions;
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

class ApiService {
  async convert(request: ConvertRequest): Promise<ConvertResponse> {
    const response = await fetch(`${API_BASE_URL}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async analyze(input: string | object): Promise<AnalyzeResponse> {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async visualize(
    input: string | object,
    type: 'sql' | 'nosql' | 'json'
  ): Promise<VisualizeResponse> {
    const response = await fetch(`${API_BASE_URL}/visualize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, type }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async uploadFile(file: File): Promise<{ success: boolean; data?: any; error?: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async healthCheck(): Promise<{ status: string; service: string; version: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

export const api = new ApiService();
