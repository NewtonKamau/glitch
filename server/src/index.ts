import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { checkConnection } from './db';
import { runMigrations } from './models/migrations';
import { verifyToken } from './middleware/auth';
import { startQuestExpiryJob, startStaleQuestCleanupJob } from './jobs/questExpiry';

// Routes
import authRoutes from './routes/auth';
import questRoutes from './routes/quests';
import chatRoutes from './routes/chat';
import uploadRoutes from './routes/upload';
import userRoutes from './routes/user';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files locally
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.get('/', (_req, res) => {
  res.json({ status: 'GLITCH API is running', version: '1.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);

// Socket.IO real-time events
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const decoded = verifyToken(token);
    (socket as any).userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = (socket as any).userId;
  console.log(`User connected: ${userId} (socket: ${socket.id})`);

  // Join a quest room for real-time chat
  socket.on('join_quest', (questId: string) => {
    socket.join(`quest:${questId}`);
    console.log(`User ${userId} joined quest room: ${questId}`);
    socket.to(`quest:${questId}`).emit('user_joined', { userId, questId });
  });

  // Leave a quest room
  socket.on('leave_quest', (questId: string) => {
    socket.leave(`quest:${questId}`);
    console.log(`User ${userId} left quest room: ${questId}`);
    socket.to(`quest:${questId}`).emit('user_left', { userId, questId });
  });

  // Real-time chat message
  socket.on('chat_message', (data: { questId: string; message: any }) => {
    io.to(`quest:${data.questId}`).emit('new_message', data.message);
  });

  // Location update (for live map)
  socket.on('location_update', (data: { lat: number; lng: number }) => {
    socket.broadcast.emit('user_location', {
      userId,
      lat: data.lat,
      lng: data.lng,
    });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${userId}`);
  });
});

// Start server
const startServer = async () => {
  const dbConnected = await checkConnection();

  if (dbConnected) {
    try {
      await runMigrations();

      // Start background jobs
      startQuestExpiryJob();
      startStaleQuestCleanupJob();
    } catch (err) {
      console.error('Migration failed, but server will start:', err);
    }
  } else {
    console.warn('⚠️  Database not connected. Server starting without DB.');
  }

  httpServer.listen(PORT, () => {
    console.log(`🚀 GLITCH server is running on port ${PORT}`);
  });
};

startServer();
