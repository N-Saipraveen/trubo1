/**
 * Test Phase 2 converters directly (bypassing Phase 1 AI parsing)
 * This tests the standardized JSON → target format conversion
 */

// Mock standardized JSON schema
const mockStandardizedSchema = {
  version: '1.0',
  metadata: {
    sourceType: 'mysql',
    extractedAt: new Date().toISOString(),
    extractedBy: 'test',
  },
  tables: [
    {
      name: 'users',
      type: 'table',
      columns: [
        {
          name: 'id',
          type: 'integer',
          originalType: 'INT',
          nullable: false,
          unique: false,
          autoIncrement: true,
        },
        {
          name: 'email',
          type: 'string',
          originalType: 'VARCHAR(255)',
          length: 255,
          nullable: false,
          unique: true,
        },
        {
          name: 'created_at',
          type: 'timestamp',
          originalType: 'TIMESTAMP',
          nullable: false,
          defaultValue: 'CURRENT_TIMESTAMP',
        },
      ],
      primaryKey: {
        columns: ['id'],
      },
      foreignKeys: [],
      indexes: [],
      constraints: [],
    },
    {
      name: 'posts',
      type: 'table',
      columns: [
        {
          name: 'id',
          type: 'integer',
          originalType: 'INT',
          nullable: false,
          autoIncrement: true,
        },
        {
          name: 'user_id',
          type: 'integer',
          originalType: 'INT',
          nullable: false,
        },
        {
          name: 'title',
          type: 'string',
          originalType: 'VARCHAR(200)',
          length: 200,
          nullable: false,
        },
        {
          name: 'content',
          type: 'text',
          originalType: 'TEXT',
          nullable: true,
        },
      ],
      primaryKey: {
        columns: ['id'],
      },
      foreignKeys: [
        {
          name: 'fk_posts_user',
          columns: ['user_id'],
          referencedTable: 'users',
          referencedColumns: ['id'],
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
      ],
      indexes: [],
      constraints: [],
    },
  ],
  relationships: [
    {
      id: 'rel_1',
      type: 'one_to_many',
      from: {
        table: 'posts',
        columns: ['user_id'],
      },
      to: {
        table: 'users',
        columns: ['id'],
      },
      metadata: {
        cascade: true,
      },
    },
  ],
};

// Test converters
const { jsonToMySQL } = require('./dist/converters/fromJson/jsonToMySQL');
const { jsonToSQLite } = require('./dist/converters/fromJson/jsonToSQLite');
const { jsonToPostgreSQL } = require('./dist/converters/fromJson/jsonToPostgreSQL');
const { jsonToMongoDB } = require('./dist/converters/fromJson/jsonToMongoDB');

console.log('🧪 Testing Phase 2 Converters with Mock Standardized JSON\n');
console.log('=' .repeat(80));

// Test MySQL converter
console.log('\n📦 Testing MySQL Converter...');
try {
  const mysqlDDL = jsonToMySQL(mockStandardizedSchema, {
    includeComments: true,
    engine: 'InnoDB',
    charset: 'utf8mb4',
  });
  console.log('✅ MySQL conversion successful!');
  console.log('\nGenerated MySQL DDL:');
  console.log('-'.repeat(80));
  console.log(mysqlDDL);
} catch (error) {
  console.error('❌ MySQL conversion failed:', error.message);
}

// Test SQLite converter
console.log('\n' + '='.repeat(80));
console.log('\n📦 Testing SQLite Converter...');
try {
  const sqliteDDL = jsonToSQLite(mockStandardizedSchema, {
    includeComments: true,
    enableForeignKeys: true,
  });
  console.log('✅ SQLite conversion successful!');
  console.log('\nGenerated SQLite DDL:');
  console.log('-'.repeat(80));
  console.log(sqliteDDL);
} catch (error) {
  console.error('❌ SQLite conversion failed:', error.message);
}

// Test PostgreSQL converter
console.log('\n' + '='.repeat(80));
console.log('\n📦 Testing PostgreSQL Converter...');
try {
  const postgresDDL = jsonToPostgreSQL(mockStandardizedSchema, {
    includeComments: true,
    useSerial: true,
  });
  console.log('✅ PostgreSQL conversion successful!');
  console.log('\nGenerated PostgreSQL DDL:');
  console.log('-'.repeat(80));
  console.log(postgresDDL);
} catch (error) {
  console.error('❌ PostgreSQL conversion failed:', error.message);
}

// Test MongoDB converter
console.log('\n' + '='.repeat(80));
console.log('\n📦 Testing MongoDB Converter (Mongoose format)...');
try {
  const mongooseSchemas = jsonToMongoDB(mockStandardizedSchema, {
    format: 'mongoose',
    embedSmallRelationships: false,
    generateIndexes: true,
  });
  console.log('✅ MongoDB conversion successful!');
  console.log('\nGenerated Mongoose Schemas:');
  console.log('-'.repeat(80));
  console.log(mongooseSchemas);
} catch (error) {
  console.error('❌ MongoDB conversion failed:', error.message);
}

console.log('\n' + '='.repeat(80));
console.log('\n✨ Phase 2 converter testing complete!\n');
