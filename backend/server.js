import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import { initSocket } from './utils/socket.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import postRoutes from './routes/postRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import storyRoutes from './routes/storyRoutes.js';
import reelRoutes from './routes/reelRoutes.js';
import exploreRoutes from './routes/exploreRoutes.js';
import collectionRoutes from './routes/collectionRoutes.js';
import communityRoutes from './routes/communityRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import privacyRoutes from './routes/privacyRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import translationRoutes from './routes/translationRoutes.js';
import opportunityRoutes from './routes/opportunityRoutes.js';
import discoveryRoutes from './routes/discoveryRoutes.js';
import liveSpaceRoutes from './routes/liveSpaceRoutes.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static directory for uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    project: 'Connectly API',
    tagline: 'Connect. Share. Belong.',
    version: '1.0'
  });
});

app.get('/api', (req, res) => {
  res.json({
    status: 'online',
    project: 'Connectly REST API',
    version: '1.0',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    documentation: 'See SRS Section 9 for API endpoints'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/reels', reelRoutes);
app.use('/api/explore', exploreRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/translations', translationRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/spaces', liveSpaceRoutes);

// Serve frontend client in production
// Serve frontend static build and PWA assets in production or when dist exists
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('sw.js')) {
        res.setHeader('Service-Worker-Allowed', '/');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (filePath.endsWith('manifest.json')) {
        res.setHeader('Content-Type', 'application/manifest+json');
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
    }
  }));

  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/uploads') || req.originalUrl.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`
  });
});

// Global error handling middleware (Reliability NFR 5.4)
app.use((err, req, res, next) => {
  console.error('[Error Handler]', err);

  // Mongoose duplicate key error (BR-01, BR-02, BR-06)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(400).json({
      success: false,
      message: `A record with that ${field} already exists.`
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', ')
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ID format for ${err.path}.`
    });
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Uploaded file is too large. Maximum size is 100MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error.'
  });
});

// Create HTTP server & Initialize Socket.IO
const httpServer = http.createServer(app);
initSocket(httpServer);

// Start Express server
const server = httpServer.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`  Connectly API Server Running on port ${PORT}`);
  console.log(`  Socket.IO Real-Time Engine Active`);
  console.log(`  Base URL: http://localhost:${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=========================================`);
});

// Graceful shutdown handling
const handleGracefulShutdown = (signal) => {
  console.log(`\n[Server] Received ${signal}. Gracefully terminating Connectly server...`);
  server.close(async () => {
    console.log('[Server] HTTP & Socket.IO server closed.');
    try {
      await mongoose.connection.close();
      console.log('[Server] MongoDB connection closed cleanly.');
      process.exit(0);
    } catch (err) {
      console.error('[Server] Error during database shutdown:', err);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

export default app;
