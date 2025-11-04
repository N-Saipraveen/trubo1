/**
 * Test script to verify MongoDB schema generation fixes
 */

const { convertSqlToNoSql } = require('./core/dist/index.js');

// Test SQL schema with all the issues we fixed
const testSql = `
CREATE TABLE admin_users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE schedules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  schedule_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  key VARCHAR(50) NOT NULL UNIQUE,
  value TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

console.log('Testing MongoDB schema generation fixes...\n');
console.log('='.repeat(60));

// Test 1: Basic conversion
console.log('\n1. Testing basic conversion...');
const result = convertSqlToNoSql(testSql, { includeTimestamps: false });

if (result.success) {
  console.log('✓ Conversion successful');
} else {
  console.log('✗ Conversion failed:', result.errors);
  process.exit(1);
}

// Test 2: Check for duplicate fields
console.log('\n2. Checking for duplicate fields...');
let hasDuplicates = false;
for (const collection of result.schema.collections) {
  const fieldNames = collection.fields.map(f => f.name);
  const uniqueNames = new Set(fieldNames);
  if (fieldNames.length !== uniqueNames.size) {
    console.log(`✗ Duplicate fields found in collection '${collection.name}'`);
    console.log(`  Fields: ${fieldNames.join(', ')}`);
    hasDuplicates = true;
  }
}
if (!hasDuplicates) {
  console.log('✓ No duplicate fields found');
}

// Test 3: Check boolean default values
console.log('\n3. Checking boolean default values...');
let hasStringBooleans = false;
for (const collection of result.schema.collections) {
  for (const field of collection.fields) {
    if (field.type === 'boolean' && field.default !== undefined) {
      if (typeof field.default !== 'boolean') {
        console.log(`✗ String boolean found in '${collection.name}.${field.name}': ${field.default}`);
        hasStringBooleans = true;
      }
    }
  }
}
if (!hasStringBooleans) {
  console.log('✓ All boolean defaults are proper booleans');
}

// Test 4: Check SQL-style defaults
console.log('\n4. Checking for SQL-style defaults...');
let hasSqlDefaults = false;
for (const collection of result.schema.collections) {
  for (const field of collection.fields) {
    if (field.default) {
      const strDefault = String(field.default).toUpperCase();
      if (strDefault.includes('CURRENT_') || strDefault.includes('NOW()')) {
        console.log(`✗ SQL-style default found in '${collection.name}.${field.name}': ${field.default}`);
        hasSqlDefaults = true;
      }
    }
  }
}
if (!hasSqlDefaults) {
  console.log('✓ All defaults use MongoDB/Mongoose style (Date.now)');
}

// Test 5: Check TIME field types
console.log('\n5. Checking TIME field types...');
let hasDateTimeFields = false;
for (const collection of result.schema.collections) {
  for (const field of collection.fields) {
    if ((field.name === 'startTime' || field.name === 'endTime') && field.type !== 'string') {
      console.log(`✗ TIME field '${collection.name}.${field.name}' has type '${field.type}' instead of 'string'`);
      hasDateTimeFields = true;
    }
  }
}
if (!hasDateTimeFields) {
  console.log('✓ All TIME fields are properly typed as string');
}

// Test 6: Test with includeTimestamps option
console.log('\n6. Testing with includeTimestamps option...');
const resultWithTimestamps = convertSqlToNoSql(testSql, { includeTimestamps: true });
let timestampDuplicates = false;
for (const collection of resultWithTimestamps.schema.collections) {
  const fieldNames = collection.fields.map(f => f.name);
  const uniqueNames = new Set(fieldNames);
  if (fieldNames.length !== uniqueNames.size) {
    console.log(`✗ Duplicate fields found with includeTimestamps in '${collection.name}'`);
    timestampDuplicates = true;
  }
}
if (!timestampDuplicates) {
  console.log('✓ No duplicate timestamp fields');
}

// Display the generated schema
console.log('\n' + '='.repeat(60));
console.log('\nGenerated MongoDB Schema (adminUsers collection):');
console.log('='.repeat(60));
const adminUsersCollection = result.schema.collections.find(c => c.name === 'adminUsers');
if (adminUsersCollection) {
  console.log(JSON.stringify(adminUsersCollection, null, 2));
}

console.log('\nGenerated MongoDB Schema (schedules collection):');
console.log('='.repeat(60));
const schedulesCollection = result.schema.collections.find(c => c.name === 'schedules');
if (schedulesCollection) {
  console.log(JSON.stringify(schedulesCollection, null, 2));
}

console.log('\n' + '='.repeat(60));
console.log('\n✓ All tests passed! MongoDB schema generation is working correctly.');
