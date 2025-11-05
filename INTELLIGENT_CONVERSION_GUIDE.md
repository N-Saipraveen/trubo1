# 🧠 Intelligent Schema Conversion Guide

## Overview

TurboDbx v2.0+ includes **intelligent schema conversion** that goes beyond simple table-to-collection mapping. The system analyzes relationships, detects patterns, and transforms schemas based on database semantics and best practices.

---

## 🎯 SQL → SQLite Conversion

### Features

#### 1. **Dialect Normalization**
Automatically maps MySQL types to SQLite equivalents:

```sql
-- MySQL Input:
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  score DECIMAL(10,2),
  created DATETIME
);

-- SQLite Output:
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  score REAL,
  created TEXT
);
```

#### 2. **AUTO_INCREMENT → AUTOINCREMENT**
Correctly replaces MySQL's `AUTO_INCREMENT` with SQLite's `AUTOINCREMENT`:

```javascript
import { loadSQLiteSchema } from './etl/load/sqliteLoader';

const sqliteSchema = loadSQLiteSchema(sqlSchema, {
  includeIfNotExists: true,
  enableForeignKeys: true,
});
```

#### 3. **Remove MySQL-Specific Options**
Strips out MySQL table options:

```sql
-- MySQL Input:
CREATE TABLE products (
  id INT PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SQLite Output:
CREATE TABLE products (
  id INTEGER PRIMARY KEY
);
```

#### 4. **ENUM → CHECK Constraint**
Converts ENUM fields to TEXT with CHECK constraints:

```sql
-- MySQL:
CREATE TABLE orders (
  status ENUM('pending', 'shipped', 'delivered')
);

-- SQLite:
CREATE TABLE orders (
  status TEXT,
  CHECK (status IN ('pending', 'shipped', 'delivered'))
);
```

#### 5. **Foreign Key Syntax**
Proper SQLite foreign key generation:

```sql
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

### Usage Example

```typescript
import { extractSqlSchema } from './etl/extract/sqlExtractor';
import { loadSQLiteSchema } from './etl/load/sqliteLoader';

// Extract MySQL schema
const sqlSchema = await extractSqlSchema(mysqlDDL);

// Generate SQLite
const sqliteDDL = loadSQLiteSchema(sqlSchema, {
  includeDropStatements: true,
  includeIfNotExists: true,
  enableForeignKeys: true,
  strictMode: false, // Set to true for SQLite 3.37.0+ STRICT mode
});

console.log(sqliteDDL);
```

---

## 🧠 SQL → MongoDB Conversion (Intelligent)

### Relationship Detection & Transformation

#### 1. **Cardinality Inference**

The system automatically detects relationship types:

```sql
-- One-to-One (FK with UNIQUE constraint)
CREATE TABLE user_profiles (
  id INT PRIMARY KEY,
  user_id INT UNIQUE,  -- ← UNIQUE makes this 1:1
  bio TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**MongoDB Output:**
```javascript
// Embedded document (1:1)
{
  _id: ObjectId("..."),
  name: "John Doe",
  profile: {  // ← Embedded, not referenced
    bio: "Software developer",
    avatar: "https://..."
  }
}
```

```sql
-- One-to-Many (FK without UNIQUE)
CREATE TABLE posts (
  id INT PRIMARY KEY,
  user_id INT,  -- ← No UNIQUE = 1:N
  title TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**MongoDB Output:**
```javascript
// Referenced (1:N)
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),  // ← Reference, not embedded
  title: "My Post"
}
```

#### 2. **Embedding Strategies**

##### Small 1:1 Relationships → Embedded

```sql
CREATE TABLE addresses (
  id INT PRIMARY KEY,
  user_id INT UNIQUE,
  street VARCHAR(255),
  city VARCHAR(100),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Result:** Address embedded in User document
```javascript
{
  _id: ObjectId("..."),
  name: "John Doe",
  address: {  // ← Embedded
    street: "123 Main St",
    city: "New York"
  }
}
```

##### Small 1:N → Embedded (configurable)

```sql
CREATE TABLE phone_numbers (
  id INT PRIMARY KEY,
  user_id INT,
  number VARCHAR(20),
  type ENUM('mobile', 'home', 'work'),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**With `embedSmallOneToMany: true`:**
```javascript
{
  _id: ObjectId("..."),
  name: "John Doe",
  phoneNumbers: [  // ← Embedded array
    { number: "+1234567890", type: "mobile" },
    { number: "+0987654321", type: "home" }
  ]
}
```

##### Large 1:N → Referenced

```sql
CREATE TABLE orders (
  id INT PRIMARY KEY,
  user_id INT,
  total DECIMAL(10,2),
  items TEXT,  -- Large data
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Result:** Separate collection with reference
```javascript
// orders collection
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),  // ← Reference
  total: 299.99,
  items: [...]
}
```

#### 3. **Many-to-Many Detection**

Automatically detects junction tables:

```sql
-- Junction table pattern: 2 FKs + minimal other columns
CREATE TABLE student_courses (
  id INT PRIMARY KEY,
  student_id INT,
  course_id INT,
  enrolled_at DATETIME,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);
```

**MongoDB Output:**
```javascript
// Linking collection created
{
  _id: ObjectId("..."),
  studentId: ObjectId("..."),
  courseId: ObjectId("..."),
  enrolledAt: ISODate("...")
}

// With compound index:
db.studentCourses.createIndex({ studentId: 1, courseId: 1 }, { unique: true });
```

#### 4. **Constraint → Validation Rules**

SQL constraints become MongoDB validators:

```sql
CREATE TABLE products (
  id INT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category ENUM('electronics', 'books', 'clothing')
);
```

**MongoDB Validator:**
```javascript
db.createCollection("products", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "price", "category"],
      properties: {
        name: { bsonType: "string" },
        price: { bsonType: "decimal" },
        category: {
          bsonType: "string",
          enum: ["electronics", "books", "clothing"]
        }
      }
    }
  }
});
```

#### 5. **Index Recommendations**

Automatic index creation for:
- Primary key equivalents (_id)
- Foreign key references
- Unique constraints
- Frequently queried fields

```javascript
// Generated indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.posts.createIndex({ userId: 1 });
db.posts.createIndex({ createdAt: -1 });
```

---

## 📖 API Usage

### Basic Intelligent Conversion

```typescript
import { intelligentSqlToNoSql } from './etl/transform/intelligentSqlToNoSqlTransformer';
import { extractSqlSchema } from './etl/extract/sqlExtractor';
import { loadNoSqlSchema } from './etl/load/nosqlLoader';

// 1. Extract SQL schema
const sqlSchema = await extractSqlSchema(sqlDDL);

// 2. Intelligent transformation
const nosqlSchema = intelligentSqlToNoSql(sqlSchema, {
  embedOneToOne: true,              // Embed 1:1 relationships
  embedSmallOneToMany: true,        // Embed small 1:N relationships
  smallTableThreshold: 5,           // Tables with ≤5 columns are "small"
  createLinkingCollections: true,   // Create collections for M:N
  generateIndexes: true,            // Generate index recommendations
  generateValidators: true,         // Generate JSON schema validators
});

// 3. Generate output
const mongooseSchemas = loadNoSqlSchema(nosqlSchema, {
  format: 'mongoose',
  includeValidation: true,
  includeIndexes: true,
});

console.log(mongooseSchemas);
```

### Advanced Options

```typescript
const nosqlSchema = intelligentSqlToNoSql(sqlSchema, {
  // Embedding Strategy
  embedOneToOne: true,
  embedSmallOneToMany: true,
  smallTableThreshold: 5,

  // Many-to-Many Handling
  createLinkingCollections: true,

  // Output Generation
  generateIndexes: true,
  generateValidators: true,

  // Query Pattern Analysis (future)
  analyzeQueryPatterns: false,
});
```

### Conversion Report

```typescript
import { generateConversionReport } from './etl/transform/intelligentSqlToNoSqlTransformer';

const report = generateConversionReport(sqlSchema, nosqlSchema, relationships);
console.log(report);
```

**Output:**
```
=== SQL to MongoDB Conversion Report ===

Tables: 8 → Collections: 6

--- Relationship Transformations ---
🔗 EMBEDDED 1:1: user_profiles.user_id → users
🔗 EMBEDDED 1:N: phone_numbers.user_id → users
📎 REFERENCED 1:N: posts.user_id → users
📎 REFERENCED 1:N: orders.user_id → users

--- Index Recommendations ---
Collection: users
  - Index on: email (UNIQUE)
Collection: posts
  - Index on: userId
  - Index on: createdAt
Collection: orders
  - Index on: userId
```

---

## 🎯 Real-World Example

### E-Commerce Schema

**SQL Input:**
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255)
);

CREATE TABLE addresses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNIQUE,
  street VARCHAR(255),
  city VARCHAR(100),
  country VARCHAR(100),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  total DECIMAL(10,2),
  status ENUM('pending', 'shipped', 'delivered'),
  created_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL
);

CREATE TABLE order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT,
  product_id INT,
  quantity INT,
  price DECIMAL(10,2),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

**MongoDB Output (Intelligent):**

```javascript
// users collection (address embedded)
{
  _id: ObjectId("..."),
  email: "john@example.com",
  name: "John Doe",
  address: {  // ← 1:1 embedded
    street: "123 Main St",
    city: "New York",
    country: "USA"
  },
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}

// orders collection (references user, embeds items)
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),  // ← Reference to user
  total: 299.99,
  status: "shipped",
  items: [  // ← order_items embedded (junction simplified)
    {
      productId: ObjectId("..."),
      quantity: 2,
      price: 149.99
    }
  ],
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}

// products collection
{
  _id: ObjectId("..."),
  name: "Laptop",
  price: 999.99,
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

**Indexes:**
```javascript
db.users.createIndex({ email: 1 }, { unique: true });
db.orders.createIndex({ userId: 1 });
db.orders.createIndex({ createdAt: -1 });
db.products.createIndex({ name: 1 });
```

**Validators:**
```javascript
db.createCollection("orders", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "total", "status"],
      properties: {
        userId: { bsonType: "objectId" },
        total: { bsonType: "decimal" },
        status: {
          bsonType: "string",
          enum: ["pending", "shipped", "delivered"]
        }
      }
    }
  }
});
```

---

## 🔍 Decision Matrix

### When to Embed vs Reference

| Scenario | Strategy | Reason |
|----------|----------|--------|
| 1:1 relationship | **Embed** | Always accessed together |
| Small 1:N (< 5 items) | **Embed** | Performance, simplicity |
| Large 1:N (100+ items) | **Reference** | Document size limits |
| N:M relationship | **Linking Collection** | Flexibility, queryability |
| Frequently updated | **Reference** | Avoid document rewrites |
| Read-heavy, static | **Embed** | Better read performance |

### Table Size Threshold

Configure `smallTableThreshold` based on your needs:

```typescript
{
  smallTableThreshold: 3,  // Very strict (only tiny tables)
  smallTableThreshold: 5,  // Default (balanced)
  smallTableThreshold: 10, // Liberal (more embedding)
}
```

---

## 🚀 Best Practices

1. **Analyze Your Schema First**
   ```bash
   curl -X POST http://localhost:4000/api/analyze \
     -d '{"schema": "...", "type": "sql"}'
   ```

2. **Use Intelligent Conversion for Production**
   ```typescript
   const nosqlSchema = intelligentSqlToNoSql(sqlSchema, {
     embedSmallOneToMany: true,
     generateValidators: true,
   });
   ```

3. **Review the Conversion Report**
   ```typescript
   const report = generateConversionReport(sqlSchema, nosqlSchema, rels);
   console.log(report);  // Review before deploying
   ```

4. **Test with Sample Data**
   - Verify embedded documents don't exceed 16MB
   - Check query patterns match your access patterns
   - Monitor index usage

5. **Iterate Based on Performance**
   - Start with defaults
   - Adjust `smallTableThreshold` based on metrics
   - Consider denormalization for frequently accessed data

---

## 📊 Performance Impact

### Embedding (1:1, small 1:N)
- ✅ **Faster reads** (single document lookup)
- ✅ **Atomic updates** (single operation)
- ⚠️ **Larger documents** (watch 16MB limit)
- ⚠️ **Duplication** if data shared across parents

### Referencing (large 1:N, N:M)
- ✅ **Flexible queries** (independent collections)
- ✅ **Smaller documents**
- ✅ **No duplication**
- ⚠️ **Multiple queries** or $lookup needed
- ⚠️ **No transactions** (unless multi-doc txn)

---

## 🎓 Learn More

- [MongoDB Data Modeling](https://docs.mongodb.com/manual/core/data-modeling-introduction/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [TurboDbx API Reference](./README_v2.md)

---

**Transform your schemas intelligently with TurboDbx! 🚀**
