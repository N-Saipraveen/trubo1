/**
 * AI Service
 * Handles communication with AI API for schema intelligence
 */

import axios, { AxiosError } from 'axios';
import logger from '../utils/logger';
import { AI_CONFIG } from '../utils/constants';

export interface AIRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Call AI API for schema mapping
 */
export async function callAI(request: AIRequest): Promise<AIResponse> {
  const {
    prompt,
    systemPrompt = 'You are TurboDbx AI, an expert in database schema design and conversion.',
    temperature = AI_CONFIG.TEMPERATURE,
    maxTokens = AI_CONFIG.MAX_TOKENS,
  } = request;

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const apiBaseUrl = process.env.API_BASE_URL;
    const model = process.env.AI_MODEL || AI_CONFIG.DEFAULT_MODEL;

    if (!apiKey || !apiBaseUrl) {
      throw new Error('AI API configuration missing. Set OPENAI_API_KEY and API_BASE_URL in .env');
    }

    logger.info('Calling AI API for schema analysis');

    const response = await axios.post(
      `${apiBaseUrl}/chat/completions`,
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature,
        max_tokens: maxTokens,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: AI_CONFIG.TIMEOUT,
      }
    );

    const content = response.data.choices[0]?.message?.content || '';
    const usage = response.data.usage;

    logger.info('AI API call successful', { tokens: usage?.total_tokens });

    return {
      content,
      usage: usage ? {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      } : undefined,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      logger.error('AI API error:', {
        status: axiosError.response?.status,
        message: axiosError.message,
      });

      if (axiosError.response?.status === 429) {
        throw new Error('AI service rate limit exceeded. Please try again later.');
      }

      if (axiosError.response?.status === 401) {
        throw new Error('Invalid AI API key. Check your configuration.');
      }
    }

    logger.error('AI service error:', error);
    throw new Error('AI service temporarily unavailable');
  }
}

/**
 * AI-powered schema mapping
 */
export async function mapSchemaWithAI(
  sourceSchema: string,
  targetType: 'sql' | 'nosql',
  dialect?: string
): Promise<any> {
  const systemPrompt = `You are TurboDbx AI Mapper, an expert database architect.
Analyze the provided schema and convert it to ${targetType === 'sql' ? 'SQL' : 'MongoDB NoSQL'} format.

Your response must be valid JSON only, with no additional text.

For SQL output, use this format:
{
  "tables": [
    {
      "name": "table_name",
      "columns": [
        {
          "name": "column_name",
          "type": "DATA_TYPE",
          "nullable": true/false,
          "primaryKey": true/false
        }
      ],
      "foreignKeys": [
        {
          "columnName": "fk_column",
          "referencedTable": "referenced_table",
          "referencedColumn": "id"
        }
      ]
    }
  ]
}

For NoSQL output, use this format:
{
  "collections": [
    {
      "name": "collection_name",
      "fields": [
        {
          "name": "field_name",
          "type": "string|number|boolean|date|objectId|array|object",
          "required": true/false,
          "ref": "referenced_collection"
        }
      ]
    }
  ]
}

Preserve:
- Primary keys and unique constraints
- Foreign key relationships
- Data types (map appropriately)
- Required/nullable constraints

Infer missing relationships based on naming conventions (e.g., user_id references users.id).`;

  const prompt = `Convert this schema to ${targetType}${dialect ? ` (${dialect} dialect)` : ''}:\n\n${sourceSchema}`;

  const response = await callAI({
    prompt,
    systemPrompt,
    temperature: 0.3, // Lower temperature for more deterministic output
  });

  try {
    // Try to extract JSON from the response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return JSON.parse(response.content);
  } catch (error) {
    logger.error('Failed to parse AI response as JSON:', error);
    throw new Error('AI returned invalid schema format');
  }
}

/**
 * Get AI suggestions for schema improvements
 */
export async function getSchemaImprovementSuggestions(schema: string, analysisResult: any): Promise<string[]> {
  const systemPrompt = `You are TurboDbx AI Advisor, an expert database architect.
Analyze the provided schema and analysis results, then suggest specific improvements.

Provide your suggestions as a JSON array of strings, each containing one actionable recommendation.
Format: ["suggestion 1", "suggestion 2", ...]`;

  const prompt = `Schema:\n${schema}\n\nAnalysis:\n${JSON.stringify(analysisResult, null, 2)}\n\nProvide 5-10 specific, actionable suggestions for improving this schema.`;

  const response = await callAI({
    prompt,
    systemPrompt,
    temperature: 0.7,
    maxTokens: 1000,
  });

  try {
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return JSON.parse(response.content);
  } catch (error) {
    // Fallback: split by newlines if not valid JSON
    return response.content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('[') && !line.startsWith(']'))
      .map(line => line.replace(/^[-*•]\s*/, '').replace(/^"\s*|\s*"$/g, ''));
  }
}

/**
 * Explain schema relationships
 */
export async function explainRelationships(schema: string): Promise<string> {
  const systemPrompt = `You are TurboDbx AI Explainer.
Explain the relationships in the provided database schema in clear, simple language.
Focus on how the tables/collections are connected and what business logic they represent.`;

  const response = await callAI({
    prompt: `Explain the relationships in this schema:\n\n${schema}`,
    systemPrompt,
    temperature: 0.8,
    maxTokens: 800,
  });

  return response.content;
}
