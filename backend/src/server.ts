/**
 * TurboDbx Backend Server
 */

import express, { Express } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import convertRouter from './routes/convert';
import analyzeRouter from './routes/analyze';
import visualizeRouter from './routes/visualize';

const app: Express = express();
const PORT = Number(process.env.PORT) || 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.sql', '.json', '.bson', '.yaml', '.yml'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: .sql, .json, .bson, .yaml, .yml'));
    }
  },
});

// Routes
app.use('/api/convert', convertRouter);
app.use('/api/analyze', analyzeRouter);
app.use('/api/visualize', visualizeRouter);

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
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'TurboDbx API', version: '1.0.0' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Start server with error handling
const server = app.listen(PORT, () => {
  console.log(`\n🚀 TurboDbx API server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints:`);
  console.log(`   - POST /api/convert`);
  console.log(`   - POST /api/analyze`);
  console.log(`   - POST /api/visualize`);
  console.log(`   - POST /api/upload`);
  console.log(`   - GET  /api/health`);
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
