// This file can be used for app configuration without starting the server
// Useful for testing and modular setup

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import meetingRoutes from './routes/meetingRoutes.js';
import taskRoutes from './routes/taskRoutes.js';

// Import utilities
import logger from './utils/logger.js';
import { errorHandler, notFound } from './utils/errorHandler.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createApp = () => {
  const app = express();

  // Rate limiting
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.',
  });

  // Middleware
  app.use(helmet());
  app.use(compression());
  app.use(limiter);
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

  // CORS configuration
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://your-frontend-domain.vercel.app'] 
      : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  }));

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Serve static files
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/meetings', meetingRoutes);
  app.use('/api/tasks', taskRoutes);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      message: 'AI MeetMind API Server',
      version: '1.0.0',
      status: 'Running',
      endpoints: {
        health: '/health',
        auth: '/api/auth',
        projects: '/api/projects',
        meetings: '/api/meetings',
        tasks: '/api/tasks',
      },
    });
  });

  // Error handling middleware
  app.use(notFound);
  app.use(errorHandler);

  return app;
};

export default createApp;
