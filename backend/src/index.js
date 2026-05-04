require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const gymRoutes = require('./routes/gyms');
const userRoutes = require('./routes/users');
const memberRoutes = require('./routes/members');
const exerciseRoutes = require('./routes/exercises');
const dietRoutes = require('./routes/diet');
const galleryRoutes = require('./routes/gallery');
const uploadRoutes = require('./routes/upload');
const sendRoutes = require('./routes/send');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/gyms', gymRoutes);
app.use('/api/users', userRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/diet', dietRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/send', sendRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🏋️  GymBuddy API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});
