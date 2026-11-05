import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import compression from 'compression';
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

// Path utilities

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

// Gzip/Brotli response compression for ultra-fast API and asset transfers
app.use(compression({
  filter: (req, res) => {
    if (req.headers.range) return false;
    return compression.filter(req, res);
  },
  threshold: 1024
}));

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// HTTP 206 Partial Content Range streaming middleware for uploaded videos (MP4, WEBM, MOV)
app.get('/uploads/:filename', (req, res, next) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  const ext = path.extname(filePath).toLowerCase();

  if (!['.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v'].includes(ext)) {
    return next();
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Video file not found' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  const mimeTypes = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
    '.m4v': 'video/x-m4v'
  };
  const contentType = mimeTypes[ext] || 'video/mp4';

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize) {
      res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
      return res.end();
    }

    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400'
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400'
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// Static directory for uploaded images and other assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check / API status endpoints
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

// Serve frontend client in production or when dist/public exists
const candidatePaths = [
  path.join(__dirname, '../frontend/dist'),
  path.join(__dirname, 'public'),
  path.join(__dirname, 'dist')
];
const frontendDist = candidatePaths.find((p) => fs.existsSync(path.join(p, 'index.html')));

if (frontendDist) {
  console.log(`[Server] Serving production frontend build from ${frontendDist}`);
  app.use(express.static(frontendDist, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('sw.js')) {
        res.setHeader('Service-Worker-Allowed', '/');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (filePath.endsWith('manifest.json')) {
        res.setHeader('Content-Type', 'application/manifest+json');
        res.setHeader('Cache-Control', 'public, max-age=3600');
      } else if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (filePath.includes('/assets/') || filePath.includes('\\assets\\') || /\.[a-f0-9]{8,}\./.test(filePath)) {
        // Hashed immutable Vite assets: Cache for 1 year (0ms reload)
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));

  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/uploads') || req.originalUrl.startsWith('/socket.io')) {
      return next();
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  // If running backend standalone in dev without build
  app.get('/', (req, res) => {
    res.status(200).send(`<!DOCTYPE html>
<html>
<head><title>Connectly</title><meta http-equiv="refresh" content="3"></head>
<body style="font-family:sans-serif;background:#0b0f19;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;">
  <h2>Connectly is launching...</h2>
  <p style="color:#94a3b8;">Frontend assets are loading. This page will refresh automatically.</p>
</body>
</html>`);
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
