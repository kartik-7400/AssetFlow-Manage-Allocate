import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import app from './app.js';

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/assetflow';

// Create native HTTP Server wrapping Express App
const server = http.createServer(app);

// Initialize Socket.io Server with CORS permissive defaults
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
});

// Attach the Socket.io instance to the Express app context.
// This allows route controllers to easily retrieve and use it.
app.set('io', io);

// Socket.io Connection Event Handlers
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// Connect to MongoDB
const isMockMode = !process.env.CLERK_PUBLISHABLE_KEY;
const dbName = isMockMode 
  ? (process.env.DB_TEST_NAME || 'test') 
  : (process.env.DB_NAME || 'AssetFlow');

console.log(`[Database] Connecting to MongoDB (${isMockMode ? 'Mock/Sandbox' : 'Actual'} mode, DB: ${dbName})...`);
mongoose
  .connect(MONGO_URI, { dbName })
  .then(() => {
    console.log(`[Database] Connected successfully to database: ${dbName}`);

    // Start HTTP Server
    server.listen(PORT, () => {
      console.log(`[Server] AssetFlow backend service listening on port ${PORT}`);
      console.log(`[Server] Health check: http://localhost:${PORT}/health`);
    });
  })
  .catch((err) => {
    console.error('[Database] MongoDB connection failed:', err);
    process.exit(1);
  });
