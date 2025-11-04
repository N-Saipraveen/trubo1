/**
 * Zustand store for global state management
 */

import { create } from 'zustand';

export type SchemaType = 'sql' | 'nosql' | 'json' | null;
export type SqlDialect = 'mysql' | 'postgresql' | 'sqlite' | 'mssql';

interface AppState {
  // Input
  inputContent: string;
  setInputContent: (content: string) => void;
  sourceType: SchemaType;
  setSourceType: (type: SchemaType) => void;

  // Output
  outputContent: string;
  setOutputContent: (content: string) => void;
  targetType: SchemaType;
  setTargetType: (type: SchemaType) => void;

  // SQL Dialect
  sqlDialect: SqlDialect;
  setSqlDialect: (dialect: SqlDialect) => void;
  sourceSqlDialect: SqlDialect;
  setSourceSqlDialect: (dialect: SqlDialect) => void;
  targetSqlDialect: SqlDialect;
  setTargetSqlDialect: (dialect: SqlDialect) => void;

  // Conversion Options
  options: {
    preserveCase: boolean;
    generateIds: boolean;
    embedRelations: boolean;
    normalizeDepth: number;
    includeTimestamps: boolean;
    strictMode: boolean;
  };
  setOptions: (options: Partial<AppState['options']>) => void;

  // Analysis
  analysis: any | null;
  setAnalysis: (analysis: any) => void;

  // Visualization
  graphData: any | null;
  setGraphData: (data: any) => void;

  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Error state
  error: string | null;
  setError: (error: string | null) => void;

  // Warnings
  warnings: string[];
  setWarnings: (warnings: string[]) => void;

  // File info
  fileInfo: {
    name: string;
    size: number;
  } | null;
  setFileInfo: (info: AppState['fileInfo']) => void;

  // Reset
  reset: () => void;
}

const defaultOptions = {
  preserveCase: false,
  generateIds: true,
  embedRelations: false,
  normalizeDepth: 1,
  includeTimestamps: true,
  strictMode: false,
};

export const useStore = create<AppState>((set) => ({
  // Input
  inputContent: '',
  setInputContent: (content) => set({ inputContent: content }),
  sourceType: null,
  setSourceType: (type) => set({ sourceType: type }),

  // Output
  outputContent: '',
  setOutputContent: (content) => set({ outputContent: content }),
  targetType: null,
  setTargetType: (type) => set({ targetType: type }),

  // SQL Dialect
  sqlDialect: 'postgresql',
  setSqlDialect: (dialect) => set({ sqlDialect: dialect }),
  sourceSqlDialect: 'mysql',
  setSourceSqlDialect: (dialect) => set({ sourceSqlDialect: dialect }),
  targetSqlDialect: 'postgresql',
  setTargetSqlDialect: (dialect) => set({ targetSqlDialect: dialect }),

  // Conversion Options
  options: defaultOptions,
  setOptions: (options) =>
    set((state) => ({
      options: { ...state.options, ...options },
    })),

  // Analysis
  analysis: null,
  setAnalysis: (analysis) => set({ analysis }),

  // Visualization
  graphData: null,
  setGraphData: (data) => set({ graphData: data }),

  // Loading state
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  // Error state
  error: null,
  setError: (error) => set({ error }),

  // Warnings
  warnings: [],
  setWarnings: (warnings) => set({ warnings }),

  // File info
  fileInfo: null,
  setFileInfo: (info) => set({ fileInfo: info }),

  // Reset
  reset: () =>
    set({
      inputContent: '',
      outputContent: '',
      sourceType: null,
      targetType: null,
      analysis: null,
      graphData: null,
      error: null,
      warnings: [],
      fileInfo: null,
      options: defaultOptions,
    }),
}));
