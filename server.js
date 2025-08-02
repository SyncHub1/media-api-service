import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import net from 'net';

// Load environment variables
dotenv.config();

// Set default ACCESS_TOKEN_SECRET for testing if not provided
if (!process.env.ACCESS_TOKEN_SECRET) {
  process.env.ACCESS_TOKEN_SECRET = 'temporary_test_secret_change_in_production';
  console.warn('⚠️ Using temporary ACCESS_TOKEN_SECRET for testing');
}

// Set default Cloudinary configuration for testing if not provided
if (!process.env.CLOUDINARY_CLOUD_NAME) {
  process.env.CLOUDINARY_CLOUD_NAME = 'test_cloud';
  process.env.CLOUDINARY_API_KEY = 'test_key';
  process.env.CLOUDINARY_API_SECRET = 'test_secret';
  console.warn('⚠️ Using temporary Cloudinary configuration for testing');
}

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import routes
import submissionRoutes from './routes/submissionRoutes.js';
import postRoutes from './routes/postRoutes.js';
import videoRoutes from './routes/videoRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import userRoutes from './routes/userRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import likeRoutes from './routes/likeRoutes.js';
import savedVideoRoutes from './routes/savedVideoRoutes.js';
import groupRoutes from './routes/groupRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001;
const MAX_PORT_RETRIES = 10;

let Message;

// Function to check if a port is in use
const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        server.close();
        resolve(true);
      })
      .listen(port);
  });
};

// Function to find an available port
const findAvailablePort = async (startPort) => {
  let port = startPort;
  for (let i = 0; i < MAX_PORT_RETRIES; i++) {
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  throw new Error('No available ports found');
};

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/media-processing');
    console.log('✅ MongoDB connected successfully');
    // Import models after connection
    const msgMod = await import('./models/Message.model.js');
    Message = msgMod.default;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'https://www.synchubb.in',
    'https://synchubb-matri-frontend.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie']
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'media-api-service',
    version: '1.0.0'
  });
});

// Debug endpoint to test API routing
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/submissions', submissionRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/saved-videos', savedVideoRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'File upload error',
        code: 'UPLOAD_ERROR',
        details: err.message
      }
    });
  }
  
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND'
    }
  });
});

// Start server
async function startServer() {
  try {
    await connectDB();
    
    // Find an available port
    const availablePort = await findAvailablePort(PORT);
    if (availablePort !== PORT) {
      console.warn(`⚠️ Port ${PORT} was in use, using port ${availablePort} instead`);
    }
    
    const server = app.listen(availablePort, () => {
      console.log(`🚀 Media API Service running on port ${availablePort}`);
      console.log(`📊 Health check: http://localhost:${availablePort}/health`);
      console.log(`🔌 API endpoint: http://localhost:${availablePort}/api`);
    });

    // Handle server-specific errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${availablePort} is already in use`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down Media API service...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down Media API service...');
  await mongoose.connection.close();
  process.exit(0);
});

// Start the server
startServer(); 