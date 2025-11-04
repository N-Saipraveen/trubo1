/**
 * Application Constants
 */

// Database Types
export const DATABASE_TYPES = {
  SQL: {
    MYSQL: 'mysql',
    POSTGRESQL: 'postgresql',
    SQLITE: 'sqlite',
    MSSQL: 'mssql',
    ORACLE: 'oracle',
  },
  NOSQL: {
    MONGODB: 'mongodb',
    CASSANDRA: 'cassandra',
    DYNAMODB: 'dynamodb',
    REDIS: 'redis',
  },
  FORMATS: {
    JSON: 'json',
    YAML: 'yaml',
    CSV: 'csv',
    BSON: 'bson',
  },
} as const;

// File Upload Limits
export const FILE_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_EXTENSIONS: ['.sql', '.json', '.bson', '.yaml', '.yml', '.csv'],
  MIME_TYPES: [
    'text/plain',
    'application/json',
    'application/x-yaml',
    'text/yaml',
    'text/csv',
    'application/sql',
  ],
} as const;

// Rate Limiting
export const RATE_LIMITS = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
  AI_REQUESTS: 20, // Stricter limit for AI endpoints
} as const;

// Schema Analysis Thresholds
export const ANALYSIS_THRESHOLDS = {
  MAX_TABLES: 100,
  MAX_COLUMNS: 1000,
  CIRCULAR_DEPENDENCY_DEPTH: 10,
  INDEX_RECOMMENDATION_THRESHOLD: 1000, // rows
} as const;

// AI Configuration
export const AI_CONFIG = {
  DEFAULT_MODEL: 'gpt-3.5-turbo',
  MAX_TOKENS: 4096,
  TEMPERATURE: 0.7,
  TIMEOUT: 30000, // 30 seconds
} as const;

// Normalization Levels
export const NORMALIZATION_LEVELS = {
  '1NF': 'First Normal Form - Atomic values, unique rows',
  '2NF': 'Second Normal Form - No partial dependencies',
  '3NF': 'Third Normal Form - No transitive dependencies',
  'BCNF': 'Boyce-Codd Normal Form - Every determinant is a candidate key',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_FILE_TYPE: 'Invalid file type. Allowed types: .sql, .json, .yaml, .csv',
  FILE_TOO_LARGE: `File size exceeds maximum limit of ${FILE_LIMITS.MAX_SIZE / 1024 / 1024}MB`,
  INVALID_SCHEMA: 'Invalid schema format',
  AI_SERVICE_ERROR: 'AI service temporarily unavailable',
  CONVERSION_FAILED: 'Schema conversion failed',
  PARSE_ERROR: 'Failed to parse input schema',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  CONVERSION_SUCCESS: 'Schema converted successfully',
  ANALYSIS_COMPLETE: 'Schema analysis completed',
  VALIDATION_PASSED: 'Schema validation passed',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;
