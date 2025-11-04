# 🚀 TurboDbx

**The most accurate, user-friendly, and visually stunning database converter** between SQL, NoSQL, and JSON — all local, all in TypeScript.

Transform database schemas between **SQL ↔ NoSQL ↔ JSON** while preserving schema integrity, constraints, relationships, and data types.

![TurboDbx Banner](https://via.placeholder.com/1200x400/3b82f6/ffffff?text=TurboDbx+-+Universal+Database+Converter)

## ✨ Features

- **🔄 Universal Conversion**: Convert between SQL, NoSQL (MongoDB), and JSON formats
- **🔒 Schema Integrity**: Preserve all constraints, foreign keys, indexes, and relationships
- **📊 Visual Analysis**: Interactive schema visualization with ER diagrams and tree views
- **🎨 Beautiful UI**: Modern, responsive interface with dark/light modes
- **⚡ Live Preview**: Real-time conversion with syntax highlighting
- **📥 File Upload**: Drag-and-drop support for `.sql`, `.json`, `.bson`, `.yaml` files
- **💾 Export Options**: Download or copy results in multiple formats
- **🔧 Configurable**: Advanced options for normalization, embedding, and more
- **🌐 Fully Local**: No cloud dependencies, runs entirely on your machine

## 🎯 Supported Conversions

| From/To | SQL | NoSQL | JSON |
|---------|-----|-------|------|
| **SQL** | ✅ | ✅ | ✅ |
| **NoSQL** | ✅ | ✅ | ✅ |
| **JSON** | ✅ | ✅ | ✅ |

### SQL Dialects Supported

- PostgreSQL
- MySQL
- SQLite
- MS SQL Server

## 🏗️ Architecture

```
TurboDbx/
├── core/           # Conversion engine (TypeScript)
│   ├── converters/ # SQL↔NoSQL↔JSON converters
│   └── utils/      # Schema validators & data mappers
├── backend/        # Express API server
│   ├── routes/     # REST API endpoints
│   └── server.ts   # Main server
└── frontend/       # React + Vite application
    ├── components/ # UI components (shadcn/ui)
    └── pages/      # Application pages
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** or **pnpm**

### Installation

```bash
# Clone or navigate to the project directory
cd TurboDbx

# Install all dependencies
npm install

# Or with pnpm
pnpm install
```

### Running the Application

```bash
# Start both frontend and backend
npm run dev

# Or start them separately
npm run dev:backend   # Backend on http://localhost:4000
npm run dev:frontend  # Frontend on http://localhost:3000
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000

## 📖 Usage Guide

### 1. Upload or Paste Schema

- **Upload**: Drag and drop a `.sql`, `.json`, or `.yaml` file
- **Paste**: Directly paste your schema into the input editor

### 2. Select Conversion Types

- **Source Type**: Choose from SQL, NoSQL, or JSON
- **Target Type**: Choose your desired output format
- **SQL Dialect**: Select PostgreSQL, MySQL, SQLite, or MSSQL (if applicable)

### 3. Configure Options (Optional)

Click "Show Options" to customize:

- **Preserve Case**: Keep original field name casing
- **Generate IDs**: Auto-generate primary key IDs
- **Include Timestamps**: Add created_at/updated_at fields
- **Embed Relations**: Embed related data (SQL→NoSQL)
- **Normalization Depth**: Control nested data normalization (NoSQL→SQL)

### 4. Convert

Click **"Convert Schema"** to transform your database schema.

### 5. View Results

- **Output Tab**: View the converted schema with syntax highlighting
- **Visualize Tab**: See an interactive ER diagram or tree view
- **Copy/Download**: Export your results

## 🎨 Example Conversions

### SQL to NoSQL

**Input (MySQL):**

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Output (MongoDB):**

```json
{
  "type": "mongodb",
  "collections": [
    {
      "name": "users",
      "fields": [
        { "name": "_id", "type": "objectId", "required": true, "unique": true },
        { "name": "username", "type": "string", "required": true, "unique": true },
        { "name": "email", "type": "string", "required": true, "unique": true },
        { "name": "createdAt", "type": "date", "required": true }
      ],
      "indexes": [
        { "fields": { "email": 1 }, "unique": true },
        { "fields": { "username": 1 }, "unique": true }
      ]
    }
  ]
}
```

### NoSQL to SQL

**Input (MongoDB Schema):**

```json
{
  "name": "products",
  "fields": [
    { "name": "_id", "type": "objectId" },
    { "name": "name", "type": "string", "required": true },
    { "name": "price", "type": "number", "required": true },
    { "name": "tags", "type": "array", "arrayOf": "string" }
  ]
}
```

**Output (PostgreSQL):**

```sql
CREATE TABLE PRODUCT (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price NUMERIC NOT NULL,
  tags JSONB
);
```

### JSON to SQL

**Input (JSON Data):**

```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "age": 30
  }
]
```

**Output (PostgreSQL):**

```sql
CREATE TABLE data (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  age NUMERIC,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO data (name, email, age) VALUES ('John Doe', 'john@example.com', 30);
```

## 🧪 Testing with Examples

Sample schemas are provided in the `/examples` directory:

- `sample-mysql.sql` - E-commerce database (users, products, orders)
- `sample-postgresql.sql` - Blog platform (authors, posts, comments)
- `sample-nosql.json` - MongoDB schema with nested objects
- `sample-json-data.json` - Sample JSON data for conversion

## 🔧 API Endpoints

The backend exposes the following REST API endpoints:

### POST `/api/convert`

Convert between schema formats.

**Request:**
```json
{
  "input": "CREATE TABLE users...",
  "sourceType": "sql",
  "targetType": "nosql",
  "dialect": "postgresql",
  "options": {
    "generateIds": true,
    "includeTimestamps": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "schema": { ... },
    "metadata": {
      "sourceType": "sql",
      "targetType": "nosql",
      "conversionTime": 45
    }
  }
}
```

### POST `/api/analyze`

Analyze schema structure and quality.

**Request:**
```json
{
  "input": "CREATE TABLE users..."
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "type": "sql",
    "structure": {
      "tables": 5,
      "totalFields": 32,
      "relationships": 7,
      "indexes": 8
    },
    "quality": {
      "hasConstraints": true,
      "hasIndexes": true
    }
  }
}
```

### POST `/api/visualize`

Generate graph data for visualization.

### POST `/api/upload`

Upload a schema file.

### GET `/api/health`

Health check endpoint.

## 🛠️ Technology Stack

### Core

- **TypeScript** - Type-safe conversion logic
- **node-sql-parser** - SQL parsing
- **ajv** - JSON schema validation

### Backend

- **Node.js** + **Express** - API server
- **multer** - File uploads
- **cors** - CORS support

### Frontend

- **React 18** - UI framework
- **Vite** - Build tool
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **shadcn/ui** - Component library
- **Radix UI** - Headless components
- **CodeMirror** - Code editor
- **ReactFlow** - Schema visualization
- **Framer Motion** - Animations
- **Zustand** - State management
- **Sonner** - Toast notifications
- **Lucide** - Icons

## 📝 Development

### Project Structure

```
core/
  src/
    converters/
      sqlToNoSql.ts    # SQL → NoSQL conversion
      noSqlToSql.ts    # NoSQL → SQL conversion
      jsonConverters.ts # JSON ↔ SQL/NoSQL
    utils/
      schemaValidator.ts # Schema validation
      dataMapper.ts      # Type mapping
    types.ts             # Type definitions

backend/
  src/
    routes/
      convert.ts       # Conversion endpoint
      analyze.ts       # Analysis endpoint
      visualize.ts     # Visualization endpoint
    server.ts          # Express server

frontend/
  src/
    components/
      Header.tsx           # App header
      FileUpload.tsx       # File upload component
      CodeEditor.tsx       # Code editor with syntax highlighting
      ConversionPanel.tsx  # Conversion controls
      SchemaVisualizer.tsx # Graph visualization
      AnalysisPanel.tsx    # Schema analysis display
      ui/                  # shadcn/ui components
    store/
      useStore.ts      # Zustand store
    lib/
      api.ts           # API client
      utils.ts         # Utility functions
    App.tsx            # Main application
```

### Building for Production

```bash
# Build all packages
npm run build

# Build specific workspace
npm run build --workspace=frontend
npm run build --workspace=backend
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by the need for accurate database migrations
- UI components from [shadcn/ui](https://ui.shadcn.com/)

## 🐛 Known Issues & Roadmap

### Current Limitations

- Complex nested arrays in NoSQL → SQL may be stored as JSON
- Custom SQL functions are not converted
- Some NoSQL-specific features (like TTL, capped collections) are not preserved

### Future Enhancements

- [ ] Support for additional databases (Cassandra, DynamoDB)
- [ ] Data migration (not just schema)
- [ ] Batch file conversion
- [ ] CLI tool
- [ ] VS Code extension
- [ ] Docker support
- [ ] Export conversion reports as Markdown/PDF

## 📞 Support

If you encounter any issues or have questions:

1. Check the `/examples` directory for sample schemas
2. Review the API documentation above
3. Open an issue on GitHub

---

**Made with ❤️ by the TurboDbx Team**

*Transform your databases with confidence.*
