# 🚀 TurboDbx v2.0 - Enterprise Database Conversion & ETL Platform

[![CI/CD](https://github.com/yourusername/trubo1/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/yourusername/trubo1/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

> **Universal database schema converter with AI-powered intelligence, comprehensive ETL pipeline, and enterprise-grade security.**

Convert seamlessly between SQL ↔ NoSQL ↔ JSON with intelligent type mapping, relationship detection, and AI-driven optimization suggestions.

---

## ✨ Key Features

### 🏗️ **Full ETL Pipeline**
- **Extract**: Parse SQL DDL, MongoDB schemas, JSON data with auto-detection
- **Transform**: Intelligent bidirectional conversion with configurable strategies
- **Load**: Multiple output formats (SQL, JSON, YAML, Mongoose, validators)

### 🤖 **AI-Powered Intelligence**
- Schema mapping with relationship inference
- Optimization and improvement suggestions
- Natural language relationship explanations
- Powered by ChatAnywhere/OpenAI API

### 📊 **Advanced Schema Analysis**
- Complexity scoring and normalization assessment
- Circular dependency detection
- Performance analysis with index recommendations
- Relationship density metrics

### 🔒 **Enterprise Security**
- Rate limiting (general + AI-specific)
- Input sanitization & validation
- Helmet.js security headers
- File upload restrictions

### 🎨 **Modern UI** (Coming Soon)
- Multi-tab interface (Input / Output / Visualize / Analyze)
- Monaco editor with syntax highlighting
- Interactive schema visualization with React Flow
- Dark mode support

### 🧪 **Testing & CI/CD**
- Jest unit tests with coverage reporting
- GitHub Actions workflow
- Multi-version Node.js testing
- Automated security scanning

---

## 🚦 Quick Start

### Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** ≥ 9.0.0
- **(Optional)** OpenAI API key for AI features

### Installation

```bash
# Clone the repository
git clone https://github.com/N-Saipraveen/trubo1.git
cd trubo1

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your API keys

# Start development servers
npm run dev
```

The API server will start on `http://localhost:4000` and the frontend on `http://localhost:3000`.

---

## 📁 Project Structure

```
trubo1/
├── backend/               # Express API server
│   ├── src/
│   │   ├── ai/           # AI service integration
│   │   ├── etl/          # ETL pipeline
│   │   │   ├── extract/  # Schema parsers
│   │   │   ├── transform/# Converters
│   │   │   └── load/     # Output generators
│   │   ├── middleware/   # Security, validation
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   └── utils/        # Helpers, loggers
│   └── __tests__/        # Unit tests
├── frontend/             # React + TypeScript UI
├── core/                 # Shared conversion logic
├── examples/             # Sample schemas
└── .github/workflows/    # CI/CD pipelines
```

---

## 🔌 API Endpoints

### ETL & Conversion

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/convert` | Convert schema between formats |
| `POST` | `/api/analyze` | Analyze schema structure |
| `POST` | `/api/visualize` | Generate visual representation |
| `POST` | `/api/upload` | Upload schema files |

### AI Intelligence

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/map-schema` | AI-powered schema mapping |
| `POST` | `/api/ai/suggest-improvements` | Get optimization recommendations |
| `POST` | `/api/ai/explain-relationships` | Natural language explanations |
| `GET` | `/api/ai/status` | Check AI service availability |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check with feature status |

---

## 🎯 Usage Examples

### Convert SQL to MongoDB (Basic)

```bash
curl -X POST http://localhost:4000/api/convert \
  -H "Content-Type: application/json" \
  -d '{
    "input": "CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255));",
    "from": "sql",
    "to": "nosql"
  }'
```

### AI-Powered Schema Mapping

```bash
curl -X POST http://localhost:4000/api/ai/map-schema \
  -H "Content-Type: application/json" \
  -d '{
    "schemaText": "CREATE TABLE orders (id INT, user_id INT, total DECIMAL);",
    "targetType": "nosql",
    "dialect": "mongodb"
  }'
```

### Analyze Schema

```bash
curl -X POST http://localhost:4000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "schema": "CREATE TABLE products ...",
    "type": "sql"
  }'
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Backend
PORT=4000
NODE_ENV=development

# AI Integration (Optional - enables AI features)
OPENAI_API_KEY=sk-your-api-key
API_BASE_URL=https://api.chatanywhere.tech/v1
AI_MODEL=gpt-3.5-turbo

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE_MB=10

# Logging
LOG_LEVEL=info

# Frontend
VITE_API_URL=http://localhost:4000/api
```

### AI Features

To enable AI-powered features:

1. Sign up for [ChatAnywhere](https://chatanywhere.tech) or use your OpenAI API key
2. Add `OPENAI_API_KEY` and `API_BASE_URL` to `.env`
3. Restart the server

The `/api/health` endpoint will show AI feature status.

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

---

## 🏗️ Architecture Overview

### ETL Pipeline

```
Input Schema
    ↓
┌─────────────────┐
│    EXTRACT      │ ← Parse SQL/NoSQL/JSON
├─────────────────┤
│   TRANSFORM     │ ← Map types, detect relationships
├─────────────────┤
│     LOAD        │ ← Generate output format
└─────────────────┘
    ↓
Output Schema
```

### AI Integration Flow

```
User Request → ETL Pipeline → AI Service → Enhanced Results
                    ↓              ↓
              Schema Analysis  Suggestions
```

---

## 🛠️ Development

### Build

```bash
# Build all packages
npm run build

# Build specific workspace
npm run build --workspace=backend
```

### Run Tests

```bash
# Backend tests
cd backend && npm test

# Frontend tests (when added)
cd frontend && npm test
```

### Linting

```bash
# TypeScript compilation check
npm run build
```

---

## 📊 Features Comparison

| Feature | TurboDbx v1.0 | TurboDbx v2.0 |
|---------|---------------|---------------|
| SQL ↔ NoSQL | ✅ | ✅ |
| JSON Support | ❌ | ✅ |
| AI Mapping | ❌ | ✅ |
| Schema Analysis | Basic | Advanced |
| Security | Basic | Enterprise |
| ETL Pipeline | ❌ | ✅ |
| Type Mapping | Limited | Comprehensive |
| Testing | ❌ | ✅ Jest + CI/CD |
| Logging | Console | Winston + Files |
| Rate Limiting | ❌ | ✅ |
| API Documentation | Minimal | Comprehensive |

---

## 🎓 Use Cases

- **Database Migration**: Convert schemas when migrating between SQL and NoSQL
- **Schema Documentation**: Generate readable schema docs in multiple formats
- **API Development**: Create Mongoose models from existing SQL schemas
- **Learning Tool**: Understand how SQL and NoSQL schemas differ
- **Schema Optimization**: Get AI-powered recommendations for improvements
- **ETL Jobs**: Build data transformation pipelines

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

---

## 🗺️ Roadmap

### v2.1.0 (Next Release)
- [ ] Redis caching for AI responses
- [ ] Enhanced frontend with Monaco editor
- [ ] Real-time schema diff viewer
- [ ] CLI tool (`turbodbx-cli`)
- [ ] Docker support

### v2.2.0
- [ ] GraphQL API support
- [ ] Multi-user workspaces
- [ ] Schema versioning
- [ ] Natural language schema generation

### v3.0.0
- [ ] Plugin architecture
- [ ] Support for DynamoDB, Cassandra
- [ ] Migration assistant with SQL dialect conversion
- [ ] Query cost estimation
- [ ] Kubernetes deployment

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 💖 Acknowledgments

- **node-sql-parser** - SQL parsing
- **Winston** - Logging
- **React Flow** - Schema visualization
- **ChatAnywhere** - AI integration
- **Express** - Backend framework

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/N-Saipraveen/trubo1/issues)
- **Discussions**: [GitHub Discussions](https://github.com/N-Saipraveen/trubo1/discussions)
- **Email**: support@turbodbx.com

---

## ⭐ Star History

If you find TurboDbx useful, please consider giving it a star on GitHub!

---

**Built with ❤️ by the TurboDbx Team**

*Transforming database schemas, one conversion at a time.*
