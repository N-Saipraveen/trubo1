/**
 * TurboDbx Backend Server
 * Enterprise-grade database conversion and ETL platform
 */

import dotenv from 'dotenv';
dotenv.config();

import express, { Express } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Routes
import convertRouter from './routes/convert';
import analyzeRouter from './routes/analyze';
import visualizeRouter from './routes/visualize';
import aiRouter from './routes/ai';

// Middleware
import { helmetMiddleware, generalRateLimiter, sanitizeInput, errorLogger } from './middleware/security';
import logger from './utils/logger';

const app: Express = express();
const PORT = Number(process.env.PORT) || 4000;

// Security Middleware
app.use(helmetMiddleware);
app.use(generalRateLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-production-domain.com']
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = ['.sql', '.json', '.bson', '.yaml', '.yml'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: .sql, .json, .bson, .yaml, .yml'));
    }
  },
});

// API Routes
app.use('/api/convert', convertRouter);
app.use('/api/analyze', analyzeRouter);
app.use('/api/visualize', visualizeRouter);
app.use('/api/ai', aiRouter);

logger.info('All routes registered successfully');

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Auto-detect file type
    const ext = path.extname(req.file.originalname).toLowerCase();
    let detectedType: 'sql' | 'json' | 'nosql' | 'unknown' = 'unknown';

    if (ext === '.sql') {
      detectedType = 'sql';
    } else if (ext === '.json') {
      try {
        const parsed = JSON.parse(fileContent);
        // Check if it's NoSQL schema or plain JSON
        if (parsed.collections || parsed.type === 'mongodb') {
          detectedType = 'nosql';
        } else {
          detectedType = 'json';
        }
      } catch {
        detectedType = 'json';
      }
    } else if (ext === '.yaml' || ext === '.yml') {
      detectedType = 'json'; // Treat YAML as JSON for now
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      data: {
        content: fileContent,
        type: detectedType,
        filename: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  const health = {
    status: 'ok',
    service: 'TurboDbx API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    features: {
      etl: true,
      aiMapping: !!(process.env.OPENAI_API_KEY && process.env.API_BASE_URL),
      schemaAnalysis: true,
      visualization: true,
    },
  };

  res.json(health);
});

// Error handling middleware
app.use(errorLogger);
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Start server with error handling
const server = app.listen(PORT, () => {
  logger.info(`TurboDbx API server started on port ${PORT}`);

  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  🚀 TurboDbx API Server v2.0                             ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝`);
  console.log(`\n📡 Server: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n📊 Available Endpoints:`);
  console.log(`   ETL & Conversion:`);
  console.log(`   ├─ POST /api/convert        - Convert schemas`);
  console.log(`   ├─ POST /api/analyze        - Analyze schema structure`);
  console.log(`   ├─ POST /api/visualize      - Generate visual representations`);
  console.log(`   └─ POST /api/upload         - Upload schema files`);
  console.log(`\n   AI Intelligence:`);
  console.log(`   ├─ POST /api/ai/map-schema  - AI-powered schema mapping`);
  console.log(`   ├─ POST /api/ai/suggest-improvements`);
  console.log(`   ├─ POST /api/ai/explain-relationships`);
  console.log(`   └─ GET  /api/ai/status      - Check AI availability`);
  console.log(`\n   System:`);
  console.log(`   └─ GET  /api/health         - Health check\n`);

  if (process.env.OPENAI_API_KEY && process.env.API_BASE_URL) {
    console.log(`🤖 AI Features: ENABLED`);
  } else {
    console.log(`⚠️  AI Features: DISABLED (Set OPENAI_API_KEY and API_BASE_URL in .env)`);
  }

  console.log(`\n✨ Ready to accept requests!\n`);
});

// Handle EADDRINUSE error
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is already in use.`);
    console.error(`\n💡 Solutions:`);
    console.error(`   1. Kill the process using the port:`);
    console.error(`      lsof -i :${PORT}`);
    console.error(`      kill -9 <PID>`);
    console.error(`   2. Set a different PORT in your .env file:`);
    console.error(`      PORT=4001 npm run dev\n`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('✅ Server closed. Exiting process.');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forcefully shutting down after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
