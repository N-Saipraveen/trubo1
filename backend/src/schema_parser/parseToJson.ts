/**
 * Phase 1: Parse any input schema to standardized JSON
 * Uses OpenAI API (via ChatAnywhere) for intelligent schema extraction
 */

import axios from 'axios';
import logger from '../utils/logger';
import { StandardizedSchema } from './types';
import { validateStandardizedSchema } from './validator';

// OpenAI API credentials via ChatAnywhere
const OPENAI_API_KEY = 'sk-Wa6KkAFngRs0h8B17opjRljBhDNxHlxWBo7pVwGmIhnxwo8A';
const API_BASE_URL = 'https://api.chatanywhere.tech/v1';

export interface ParseToJsonOptions {
  sourceType?: 'mysql' | 'postgresql' | 'sqlite' | 'mongodb' | 'json' | 'auto';
  timeout?: number;
  validateOutput?: boolean;
}

/**
 * Parse any schema input to standardized JSON format
 * This is Phase 1 of the two-phase conversion architecture
 */
export async function parseToJson(
  schemaInput: string,
  options: ParseToJsonOptions = {}
): Promise<StandardizedSchema> {
  const {
    sourceType = 'auto',
    timeout = 30000,
    validateOutput = true,
  } = options;

  logger.info('Starting schema parsing to standardized JSON', { sourceType });

  try {
    // Step 1: Detect source type if auto
    const detectedType = sourceType === 'auto' ? detectSourceType(schemaInput) : sourceType;
    logger.info(`Detected source type: ${detectedType}`);

    // Step 2: Call OpenAI API with schema extraction prompt
    const standardizedSchema = await callOpenAIForExtraction(schemaInput, detectedType, timeout);

    // Step 3: Validate the output
    if (validateOutput) {
      const validation = validateStandardizedSchema(standardizedSchema);
      if (!validation.valid) {
        logger.error('Schema validation failed', { errors: validation.errors });
        throw new Error(`Invalid schema format: ${validation.errors?.join(', ')}`);
      }
    }

    logger.info('Schema successfully parsed to standardized JSON', {
      tables: standardizedSchema.tables.length,
      relationships: standardizedSchema.relationships.length,
    });

    return standardizedSchema;
  } catch (error) {
    logger.error('Failed to parse schema to JSON', { error });
    throw new Error(`Schema parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Call OpenAI API for schema extraction
 */
async function callOpenAIForExtraction(
  schemaInput: string,
  sourceType: string,
  timeout: number
): Promise<StandardizedSchema> {
  logger.info('Calling OpenAI API for schema extraction');

  const systemPrompt = `You are TurboDbx Schema Extractor, an expert database architect AI.

Your task: Analyze the provided database schema and extract it into a standardized JSON format.

IMPORTANT INSTRUCTIONS:

1. EXTRACT ALL INFORMATION:
   - Table/collection names
   - All columns/fields with their types, constraints, defaults
   - Primary keys (single or composite)
   - Foreign keys with referenced tables and columns
   - Indexes (unique and non-unique)
   - Check constraints, unique constraints

2. NORMALIZE DATA TYPES to these standard types:
   - string (VARCHAR, CHAR, TEXT in SQL; String in MongoDB)
   - text (TEXT, LONGTEXT, MEDIUMTEXT)
   - integer (INT, INTEGER, SMALLINT, TINYINT)
   - bigint (BIGINT)
   - decimal (DECIMAL, NUMERIC)
   - float (FLOAT)
   - double (DOUBLE, DOUBLE PRECISION)
   - boolean (BOOLEAN, BOOL, TINYINT(1))
   - date (DATE)
   - datetime (DATETIME)
   - timestamp (TIMESTAMP)
   - time (TIME)
   - blob (BLOB, BINARY, BYTEA)
   - json (JSON, JSONB)
   - uuid (UUID)
   - enum (ENUM with values)

3. INFER RELATIONSHIP TYPES (CRITICAL):

   A. **ONE-TO-ONE** relationship:
      - Foreign key column has UNIQUE constraint
      - Example: user_profile(user_id UNIQUE) → users(id)
      - Type: "one_to_one"

   B. **ONE-TO-MANY** relationship:
      - Foreign key column WITHOUT unique constraint
      - Example: posts(user_id) → users(id) (many posts per user)
      - Type: "one_to_many"

   C. **MANY-TO-MANY** relationship:
      - Junction/pivot table with exactly 2 foreign keys
      - Junction table has only: 2 FKs + maybe id + maybe timestamps
      - Example: student_courses(student_id, course_id) linking students ↔ courses
      - Type: "many_to_many"
      - Include junctionTable in metadata

4. OUTPUT FORMAT:
   Return ONLY valid JSON (no markdown, no explanation) matching this exact structure:

{
  "version": "1.0",
  "metadata": {
    "sourceType": "mysql|postgresql|sqlite|mongodb|json",
    "extractedAt": "ISO timestamp",
    "extractedBy": "ai"
  },
  "tables": [
    {
      "name": "table_name",
      "type": "table",
      "columns": [
        {
          "name": "column_name",
          "type": "normalized_type",
          "originalType": "original SQL type",
          "nullable": true/false,
          "unique": true/false,
          "autoIncrement": true/false,
          "defaultValue": "value if any",
          "length": 255,
          "precision": 10,
          "scale": 2,
          "enum": ["value1", "value2"],
          "comment": "column comment"
        }
      ],
      "primaryKey": {
        "columns": ["id"]
      },
      "foreignKeys": [
        {
          "name": "fk_name",
          "columns": ["foreign_key_col"],
          "referencedTable": "referenced_table",
          "referencedColumns": ["id"],
          "onDelete": "CASCADE|SET NULL|RESTRICT|NO ACTION",
          "onUpdate": "CASCADE|SET NULL|RESTRICT|NO ACTION"
        }
      ],
      "indexes": [
        {
          "name": "idx_name",
          "columns": ["col1", "col2"],
          "unique": true/false,
          "type": "BTREE|HASH"
        }
      ],
      "constraints": [
        {
          "name": "constraint_name",
          "type": "CHECK|UNIQUE",
          "definition": "full constraint SQL",
          "columns": ["col1"]
        }
      ]
    }
  ],
  "relationships": [
    {
      "id": "rel_1",
      "type": "one_to_one|one_to_many|many_to_many",
      "from": {
        "table": "source_table",
        "columns": ["fk_column"]
      },
      "to": {
        "table": "target_table",
        "columns": ["id"]
      },
      "metadata": {
        "junctionTable": "junction_table_name (only for many_to_many)",
        "cascade": true/false
      }
    }
  ]
}

5. DETECTION RULES:
   - If input contains "CREATE TABLE" → SQL schema
   - If input contains "collections" or "_id" → MongoDB schema
   - If input is JSON array/object → JSON data (infer schema)
   - AUTO_INCREMENT / AUTOINCREMENT → autoIncrement: true
   - UNIQUE constraint → unique: true
   - NOT NULL → nullable: false
   - DEFAULT value → defaultValue: <value>

6. RELATIONSHIP DETECTION ALGORITHM:
   FOR each foreign key:
     IF foreign_key_column has UNIQUE constraint:
       CREATE one_to_one relationship
     ELSE:
       CREATE one_to_many relationship

   FOR each table with exactly 2 foreign keys AND <= 4 total columns:
     IDENTIFY as junction table
     CREATE two many_to_many relationships
     SET junctionTable metadata

Remember: Output ONLY the JSON object. No explanations, no markdown code blocks.`;

  const userPrompt = `Extract and analyze this ${sourceType} database schema:

${schemaInput}

Return the standardized JSON schema following the exact format specified. Include all tables, columns, constraints, and infer all relationships based on foreign keys and unique constraints.`;

  try {
    const response = await axios.post(
      `${API_BASE_URL}/chat/completions`,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1, // Low temperature for consistent structured output
        max_tokens: 4000,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout,
      }
    );

    const content = response.data.choices[0]?.message?.content || '';

    // Extract JSON from response (might be wrapped in markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const standardizedSchema = JSON.parse(jsonMatch[0]);

    // Add metadata
    standardizedSchema.metadata = {
      ...standardizedSchema.metadata,
      sourceType,
      extractedAt: new Date().toISOString(),
      extractedBy: 'ai',
    };

    return standardizedSchema;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error('OpenAI API error', {
        status: error.response?.status,
        message: error.message,
      });
    }
    throw new Error(`OpenAI extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Auto-detect the source schema type
 */
function detectSourceType(schemaInput: string): string {
  const input = schemaInput.trim().toLowerCase();

  // SQL patterns
  if (input.includes('create table') || input.includes('alter table')) {
    if (input.includes('autoincrement')) return 'sqlite';
    if (input.includes('auto_increment')) return 'mysql';
    return 'postgresql';
  }

  // MongoDB patterns
  if (input.includes('collections') || input.includes('_id') || input.includes('objectid')) {
    return 'mongodb';
  }

  // JSON/array pattern
  if (input.startsWith('[') || input.startsWith('{')) {
    return 'json';
  }

  return 'auto';
}
