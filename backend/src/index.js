require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');
const exerciseRoutes = require('./routes/exercises');
const dietRoutes = require('./routes/diet');
const galleryRoutes = require('./routes/gallery');
const uploadRoutes = require('./routes/upload');
const attendanceRoutes = require('./routes/attendance');
const payrollRoutes = require('./routes/payroll');
const trainingSessionsRoutes = require('./routes/training-sessions');
const trainersRoutes = require('./routes/trainers');
const notificationRoutes = require('./routes/notifications');
const faceRoutes = require('./routes/face');

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
app.use('/api/members', memberRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/diet', dietRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/face', faceRoutes);
app.use('/api/training-sessions', trainingSessionsRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/trainers', trainersRoutes);

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
