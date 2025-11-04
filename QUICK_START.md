# 🚀 Quick Start Guide

Get TurboDbx running in 3 simple steps:

## Step 1: Install Dependencies

```bash
npm install
```

This will install dependencies for the root, core, backend, and frontend workspaces.

## Step 2: Start the Application

```bash
npm run dev
```

This command starts both the backend and frontend servers concurrently:
- **Backend API**: http://localhost:3001
- **Frontend UI**: http://localhost:3000

## Step 3: Use TurboDbx

1. Open your browser to **http://localhost:3000**
2. Upload a schema file or paste one into the editor
3. Select source and target types (SQL, NoSQL, or JSON)
4. Click "Convert Schema"
5. View results in the Output or Visualize tabs

## 📁 Try Example Files

Sample schemas are provided in the `/examples` directory:

```bash
# MySQL E-commerce Schema
examples/sample-mysql.sql

# PostgreSQL Blog Schema
examples/sample-postgresql.sql

# MongoDB NoSQL Schema
examples/sample-nosql.json

# JSON Data
examples/sample-json-data.json
```

## 🔧 Troubleshooting

### Port Already in Use

If port 3000 or 3001 is already in use:

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Dependencies Not Installing

Try clearing the cache:

```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Build Errors

Rebuild all packages:

```bash
npm run build
```

## 📖 Full Documentation

See [README.md](./README.md) for complete documentation including:
- Detailed feature list
- API documentation
- Development guide
- Architecture overview

---

**Happy Converting! 🎉**
