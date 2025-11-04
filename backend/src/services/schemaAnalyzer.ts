/**
 * Schema Analyzer Service
 * Provides deep analysis of database schemas with recommendations
 */

import { SqlSchema, SqlTable } from '../etl/extract/sqlExtractor';
import { NoSqlSchema, NoSqlCollection } from '../etl/extract/nosqlExtractor';
import logger from '../utils/logger';

export interface AnalysisResult {
  summary: SchemaSummary;
  relationships: RelationshipAnalysis;
  normalization: NormalizationAnalysis;
  performance: PerformanceAnalysis;
  recommendations: Recommendation[];
}

export interface SchemaSummary {
  totalTables?: number;
  totalCollections?: number;
  totalColumns?: number;
  totalFields?: number;
  totalRelationships: number;
  avgColumnsPerTable?: number;
  avgFieldsPerCollection?: number;
  schemaComplexity: 'low' | 'medium' | 'high';
}

export interface RelationshipAnalysis {
  oneToOne: number;
  oneToMany: number;
  manyToMany: number;
  circular: string[];
  orphanedTables: string[];
  relationshipDensity: number;
}

export interface NormalizationAnalysis {
  level: '1NF' | '2NF' | '3NF' | 'BCNF' | 'Unknown';
  violations: NormalizationViolation[];
  score: number; // 0-100
}

export interface NormalizationViolation {
  table: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface PerformanceAnalysis {
  indexCoverage: number; // percentage
  missingIndexes: Array<{ table: string; columns: string[] }>;
  redundantIndexes: Array<{ table: string; index: string }>;
  largeTablesWithoutPK: string[];
}

export interface Recommendation {
  category: 'normalization' | 'performance' | 'design' | 'security';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
}

/**
 * Analyze SQL schema
 */
export function analyzeSqlSchema(schema: SqlSchema): AnalysisResult {
  logger.info('Starting SQL schema analysis');

  const summary = generateSqlSummary(schema);
  const relationships = analyzeRelationships(schema);
  const normalization = analyzeNormalization(schema);
  const performance = analyzePerformance(schema);
  const recommendations = generateRecommendations(schema, normalization, performance, relationships);

  return {
    summary,
    relationships,
    normalization,
    performance,
    recommendations,
  };
}

/**
 * Analyze NoSQL schema
 */
export function analyzeNoSqlSchema(schema: NoSqlSchema): AnalysisResult {
  logger.info('Starting NoSQL schema analysis');

  const summary = generateNoSqlSummary(schema);
  const relationships = analyzeNoSqlRelationships(schema);
  const normalization = analyzeNoSqlNormalization(schema);
  const performance = analyzeNoSqlPerformance(schema);
  const recommendations = generateNoSqlRecommendations(schema, normalization, performance, relationships);

  return {
    summary,
    relationships,
    normalization,
    performance,
    recommendations,
  };
}

/**
 * Generate SQL schema summary
 */
function generateSqlSummary(schema: SqlSchema): SchemaSummary {
  const totalTables = schema.tables.length;
  const totalColumns = schema.tables.reduce((sum, t) => sum + t.columns.length, 0);
  const totalRelationships = schema.relationships.length;
  const avgColumnsPerTable = totalTables > 0 ? totalColumns / totalTables : 0;

  let complexity: 'low' | 'medium' | 'high' = 'low';
  if (totalTables > 20 || avgColumnsPerTable > 15) {
    complexity = 'high';
  } else if (totalTables > 10 || avgColumnsPerTable > 10) {
    complexity = 'medium';
  }

  return {
    totalTables,
    totalColumns,
    totalRelationships,
    avgColumnsPerTable: Math.round(avgColumnsPerTable * 10) / 10,
    schemaComplexity: complexity,
  };
}

/**
 * Generate NoSQL schema summary
 */
function generateNoSqlSummary(schema: NoSqlSchema): SchemaSummary {
  const totalCollections = schema.collections.length;
  const totalFields = schema.collections.reduce((sum, c) => sum + c.fields.length, 0);
  const totalRelationships = schema.relationships.length;
  const avgFieldsPerCollection = totalCollections > 0 ? totalFields / totalCollections : 0;

  let complexity: 'low' | 'medium' | 'high' = 'low';
  if (totalCollections > 15 || avgFieldsPerCollection > 20) {
    complexity = 'high';
  } else if (totalCollections > 8 || avgFieldsPerCollection > 12) {
    complexity = 'medium';
  }

  return {
    totalCollections,
    totalFields,
    totalRelationships,
    avgFieldsPerCollection: Math.round(avgFieldsPerCollection * 10) / 10,
    schemaComplexity: complexity,
  };
}

/**
 * Analyze relationships in SQL schema
 */
function analyzeRelationships(schema: SqlSchema): RelationshipAnalysis {
  const oneToOne = schema.relationships.filter(r => r.type === '1:1').length;
  const oneToMany = schema.relationships.filter(r => r.type === '1:N').length;
  const manyToMany = schema.relationships.filter(r => r.type === 'N:M').length;

  // Detect circular dependencies
  const circular = detectCircularDependencies(schema);

  // Find orphaned tables (no relationships)
  const tablesInRelationships = new Set<string>();
  for (const rel of schema.relationships) {
    tablesInRelationships.add(rel.from.split('.')[0]);
    tablesInRelationships.add(rel.to.split('.')[0]);
  }

  const orphanedTables = schema.tables
    .filter(t => !tablesInRelationships.has(t.name))
    .map(t => t.name);

  // Calculate relationship density
  const totalTables = schema.tables.length;
  const relationshipDensity = totalTables > 0 ? schema.relationships.length / totalTables : 0;

  return {
    oneToOne,
    oneToMany,
    manyToMany,
    circular,
    orphanedTables,
    relationshipDensity: Math.round(relationshipDensity * 100) / 100,
  };
}

/**
 * Analyze relationships in NoSQL schema
 */
function analyzeNoSqlRelationships(schema: NoSqlSchema): RelationshipAnalysis {
  const oneToOne = schema.relationships.filter(r => r.type === '1:1').length;
  const oneToMany = schema.relationships.filter(r => r.type === '1:N').length;
  const manyToMany = schema.relationships.filter(r => r.type === 'N:M').length;

  const collectionsInRelationships = new Set<string>();
  for (const rel of schema.relationships) {
    collectionsInRelationships.add(rel.from.split('.')[0]);
    collectionsInRelationships.add(rel.to);
  }

  const orphanedTables = schema.collections
    .filter(c => !collectionsInRelationships.has(c.name))
    .map(c => c.name);

  const totalCollections = schema.collections.length;
  const relationshipDensity = totalCollections > 0 ? schema.relationships.length / totalCollections : 0;

  return {
    oneToOne,
    oneToMany,
    manyToMany,
    circular: [],
    orphanedTables,
    relationshipDensity: Math.round(relationshipDensity * 100) / 100,
  };
}

/**
 * Detect circular dependencies
 */
function detectCircularDependencies(schema: SqlSchema): string[] {
  const graph = new Map<string, Set<string>>();

  // Build dependency graph
  for (const table of schema.tables) {
    if (!graph.has(table.name)) {
      graph.set(table.name, new Set());
    }

    for (const fk of table.foreignKeys) {
      graph.get(table.name)!.add(fk.referencedTable);
    }
  }

  // Detect cycles
  const cycles: string[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = graph.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recursionStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart).concat(neighbor).join(' -> ');
        if (!cycles.includes(cycle)) {
          cycles.push(cycle);
        }
      }
    }

    recursionStack.delete(node);
  }

  for (const table of schema.tables) {
    if (!visited.has(table.name)) {
      dfs(table.name, []);
    }
  }

  return cycles;
}

/**
 * Analyze normalization level
 */
function analyzeNormalization(schema: SqlSchema): NormalizationAnalysis {
  const violations: NormalizationViolation[] = [];

  for (const table of schema.tables) {
    // Check for 1NF violations (atomic values)
    // This is hard to detect without sample data, so we'll look for hints

    // Check for 2NF violations (partial dependencies)
    if (table.primaryKey && table.primaryKey.length > 1) {
      // Composite primary key - potential 2NF violation
      violations.push({
        table: table.name,
        issue: 'Composite primary key detected',
        severity: 'medium',
        recommendation: 'Verify no non-key attributes depend on part of the primary key',
      });
    }

    // Check for potential denormalization (repeated column patterns)
    const columnNames = table.columns.map(c => c.name.toLowerCase());
    const addressFields = columnNames.filter(n => n.includes('address') || n.includes('city') || n.includes('zip'));
    if (addressFields.length > 3) {
      violations.push({
        table: table.name,
        issue: 'Multiple address-related fields detected',
        severity: 'low',
        recommendation: 'Consider normalizing address data into a separate table',
      });
    }

    // Check for large number of nullable columns
    const nullableCount = table.columns.filter(c => c.nullable).length;
    if (nullableCount > table.columns.length * 0.5) {
      violations.push({
        table: table.name,
        issue: 'More than 50% of columns are nullable',
        severity: 'medium',
        recommendation: 'Consider splitting into multiple tables based on optional attributes',
      });
    }
  }

  // Determine normalization level
  let level: '1NF' | '2NF' | '3NF' | 'BCNF' | 'Unknown' = '3NF';
  const score = Math.max(0, 100 - violations.length * 10);

  if (violations.some(v => v.severity === 'high')) {
    level = '1NF';
  } else if (violations.some(v => v.severity === 'medium')) {
    level = '2NF';
  }

  return { level, violations, score };
}

/**
 * Analyze NoSQL normalization
 */
function analyzeNoSqlNormalization(schema: NoSqlSchema): NormalizationAnalysis {
  const violations: NormalizationViolation[] = [];

  for (const collection of schema.collections) {
    // Check for embedded arrays (potential denormalization)
    const arrayFields = collection.fields.filter(f => f.type === 'array' && !f.ref);
    if (arrayFields.length > 2) {
      violations.push({
        table: collection.name,
        issue: 'Multiple embedded arrays detected',
        severity: 'medium',
        recommendation: 'Consider moving some arrays to separate collections with references',
      });
    }

    // Check for large embedded objects
    const objectFields = collection.fields.filter(f => f.type === 'object' && !f.ref);
    if (objectFields.length > 3) {
      violations.push({
        table: collection.name,
        issue: 'Multiple embedded objects detected',
        severity: 'low',
        recommendation: 'Consider if all embedded objects are necessary or should be referenced',
      });
    }
  }

  const score = Math.max(0, 100 - violations.length * 15);
  const level = score > 80 ? '3NF' : score > 60 ? '2NF' : '1NF';

  return { level, violations, score };
}

/**
 * Analyze performance characteristics
 */
function analyzePerformance(schema: SqlSchema): PerformanceAnalysis {
  const missingIndexes: Array<{ table: string; columns: string[] }> = [];
  const largeTablesWithoutPK: string[] = [];
  let totalIndexableColumns = 0;
  let indexedColumns = 0;

  for (const table of schema.tables) {
    // Check for primary key
    if (!table.primaryKey || table.primaryKey.length === 0) {
      largeTablesWithoutPK.push(table.name);
    }

    // Check for indexes on foreign keys
    for (const fk of table.foreignKeys) {
      totalIndexableColumns++;
      const hasIndex = table.indexes.some(idx => idx.columns.includes(fk.columnName));
      if (hasIndex) {
        indexedColumns++;
      } else {
        missingIndexes.push({
          table: table.name,
          columns: [fk.columnName],
        });
      }
    }
  }

  const indexCoverage = totalIndexableColumns > 0 ? (indexedColumns / totalIndexableColumns) * 100 : 100;

  return {
    indexCoverage: Math.round(indexCoverage),
    missingIndexes,
    redundantIndexes: [],
    largeTablesWithoutPK,
  };
}

/**
 * Analyze NoSQL performance
 */
function analyzeNoSqlPerformance(schema: NoSqlSchema): PerformanceAnalysis {
  const missingIndexes: Array<{ table: string; columns: string[] }> = [];

  for (const collection of schema.collections) {
    // Check for indexes on reference fields
    const refFields = collection.fields.filter(f => f.ref);
    const indexedFields = new Set((collection.indexes || []).flatMap(idx => Object.keys(idx.fields)));

    for (const field of refFields) {
      if (!indexedFields.has(field.name)) {
        missingIndexes.push({
          table: collection.name,
          columns: [field.name],
        });
      }
    }
  }

  return {
    indexCoverage: 0,
    missingIndexes,
    redundantIndexes: [],
    largeTablesWithoutPK: [],
  };
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(
  schema: SqlSchema,
  normalization: NormalizationAnalysis,
  performance: PerformanceAnalysis,
  relationships: RelationshipAnalysis
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Normalization recommendations
  if (normalization.score < 70) {
    recommendations.push({
      category: 'normalization',
      priority: 'high',
      title: 'Improve schema normalization',
      description: `Schema normalization score is ${normalization.score}/100. Review the ${normalization.violations.length} violations identified.`,
      impact: 'Reduced data redundancy and improved data integrity',
      effort: 'high',
    });
  }

  // Performance recommendations
  if (performance.missingIndexes.length > 0) {
    recommendations.push({
      category: 'performance',
      priority: 'high',
      title: 'Add missing indexes on foreign keys',
      description: `${performance.missingIndexes.length} foreign key columns lack indexes, which can severely impact query performance.`,
      impact: 'Significant improvement in join query performance',
      effort: 'low',
    });
  }

  // Circular dependency warning
  if (relationships.circular.length > 0) {
    recommendations.push({
      category: 'design',
      priority: 'critical',
      title: 'Resolve circular dependencies',
      description: `${relationships.circular.length} circular dependencies detected. This can cause issues with data deletion and updates.`,
      impact: 'Prevent data integrity issues and cascading delete problems',
      effort: 'high',
    });
  }

  // Orphaned tables
  if (relationships.orphanedTables.length > 0) {
    recommendations.push({
      category: 'design',
      priority: 'low',
      title: 'Review orphaned tables',
      description: `${relationships.orphanedTables.length} tables have no relationships. Verify if this is intentional.`,
      impact: 'Better schema organization and understanding',
      effort: 'low',
    });
  }

  return recommendations;
}

/**
 * Generate NoSQL recommendations
 */
function generateNoSqlRecommendations(
  schema: NoSqlSchema,
  normalization: NormalizationAnalysis,
  performance: PerformanceAnalysis,
  relationships: RelationshipAnalysis
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (performance.missingIndexes.length > 0) {
    recommendations.push({
      category: 'performance',
      priority: 'high',
      title: 'Add indexes on reference fields',
      description: `${performance.missingIndexes.length} reference fields lack indexes.`,
      impact: 'Improved query performance for lookups and joins',
      effort: 'low',
    });
  }

  if (normalization.violations.some(v => v.issue.includes('embedded'))) {
    recommendations.push({
      category: 'design',
      priority: 'medium',
      title: 'Review embedding strategy',
      description: 'Multiple embedded documents detected. Consider if references would be more appropriate.',
      impact: 'Better data reusability and reduced duplication',
      effort: 'medium',
    });
  }

  return recommendations;
}
