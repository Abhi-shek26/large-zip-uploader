import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs-extra';
import { env } from './config/env';
import uploadsRouter from './routes/uploads';

const app = express();

// Security & CORS
app.use(helmet());
app.use(cors({
  origin: '*', // Allow all for dev; restrict in prod
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Chunk-Index', 'X-Chunk-Offset', 'X-Upload-Id', 'X-Total-Chunks']
}));

// Body Parsing
app.use(express.json());

// Routes
app.use('/api/uploads', uploadsRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🔥 Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Initialize storage directories on startup
(async () => {
  try {
    await fs.ensureDir(env.UPLOAD_DIR);
    await fs.ensureDir(env.TEMP_DIR);
    console.log(`📂 Storage ready at: ${env.UPLOAD_DIR}`);
  } catch (err) {
    console.error('❌ Failed to create storage directories:', err);
    process.exit(1);
  }
})();

export default app;
