const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Helper middleware to allow gym_admin and admin access
const requireTrainingAccess = (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'gym_admin' || req.user.role === 'super_admin' || req.user.role === 'trainer') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admin, Gym Admin, or Trainer only.' });
  }
};

// All training session routes require auth
router.use(authenticate);

// GET /api/training-sessions - List training sessions
router.get('/', async (req, res) => {
  try {
    const { trainerId, memberId, status, sessionType, startDate, endDate } = req.query;
    
    // Filter based on role
    let where = {};
    if (req.user.role === 'trainer') {
      where.trainerId = req.user.id;
    } else if (req.user.role === 'member') {
      where.memberId = req.user.id;
    }
    
    if (trainerId) where.trainerId = trainerId;
    if (memberId) where.memberId = memberId;
    if (status) where.status = status;
    if (sessionType) where.sessionType = sessionType;
    
    if (startDate && endDate) {
      where.scheduledDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const sessions = await prisma.trainingSession.findMany({
      where,
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            phone: true,
            photoUrl: true,
          },
        },
        member: {
          select: {
            id: true,
            name: true,
            phone: true,
            photoUrl: true,
          },
        },
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { scheduledDate: 'desc' },
    });

    res.json(sessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch training sessions' });
  }
});

// GET /api/training-sessions/:id - Get training session
router.get('/:id', async (req, res) => {
  try {
    const session = await prisma.trainingSession.findUnique({
      where: { id: req.params.id },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            phone: true,
            photoUrl: true,
          },
        },
        member: {
          select: {
            id: true,
            name: true,
            phone: true,
            photoUrl: true,
          },
        },
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!session) return res.status(404).json({ error: 'Training session not found' });

    // Check access permissions
    if (req.user.role === 'member' && session.memberId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'trainer' && session.trainerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch training session' });
  }
});

// POST /api/training-sessions - Create training session
router.post(
  '/',
  requireTrainingAccess,
  [
    body('trainerId').notEmpty().withMessage('Trainer ID is required'),
    body('memberId').notEmpty().withMessage('Member ID is required'),
    body('sessionType').isIn(['session_based', 'month_based']).withMessage('Invalid session type'),
    body('scheduledDate').isISO8601().withMessage('Scheduled date is required'),
    body('startTime').isISO8601().withMessage('Start time is required'),
    body('sessionRate').isFloat({ min: 0 }).withMessage('Session rate must be positive'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      trainerId,
      memberId,
      sessionType,
      scheduledDate,
      startTime,
      endTime,
      sessionRate,
      notes,
    } = req.body;

    try {
      // Verify trainer and member exist
      const trainer = await prisma.user.findUnique({
        where: { id: trainerId },
        select: { id: true, role: true, gymId: true },
      });

      const member = await prisma.user.findUnique({
        where: { id: memberId },
        select: { id: true, role: true, gymId: true },
      });

      if (!trainer || trainer.role !== 'trainer') {
        return res.status(400).json({ error: 'Invalid trainer' });
      }

      if (!member || member.role !== 'member') {
        return res.status(400).json({ error: 'Invalid member' });
      }

      // Calculate duration if end time is provided
      let durationMinutes = null;
      if (endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        durationMinutes = Math.floor((end - start) / (1000 * 60));
      }

      const session = await prisma.trainingSession.create({
        data: {
          trainerId,
          memberId,
          gymId: trainer.gymId,
          sessionType,
          scheduledDate: new Date(scheduledDate),
          startTime: new Date(startTime),
          endTime: endTime ? new Date(endTime) : null,
          durationMinutes,
          sessionRate,
          notes,
        },
        include: {
          trainer: {
            select: {
              id: true,
              name: true,
              phone: true,
              photoUrl: true,
            },
          },
          member: {
            select: {
              id: true,
              name: true,
              phone: true,
              photoUrl: true,
            },
          },
          gym: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.status(201).json(session);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create training session' });
    }
  }
);

// PUT /api/training-sessions/:id - Update training session
router.put(
  '/:id',
  requireTrainingAccess,
  [
    body('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show']),
    body('sessionRate').optional().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      status,
      endTime,
      sessionRate,
      amountPaid,
      paymentStatus,
      notes,
    } = req.body;

    try {
      const existing = await prisma.trainingSession.findUnique({
        where: { id: req.params.id },
      });

      if (!existing) return res.status(404).json({ error: 'Training session not found' });

      // Check access permissions
      if (req.user.role === 'trainer' && existing.trainerId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const data = {};
      if (status !== undefined) data.status = status;
      if (endTime !== undefined) data.endTime = new Date(endTime);
      if (sessionRate !== undefined) data.sessionRate = sessionRate;
      if (amountPaid !== undefined) data.amountPaid = amountPaid;
      if (paymentStatus !== undefined) data.paymentStatus = paymentStatus;
      if (notes !== undefined) data.notes = notes;

      // Auto-calculate duration if endTime is set
      if (endTime && !data.durationMinutes) {
        const start = new Date(existing.startTime);
        const end = new Date(endTime);
        data.durationMinutes = Math.floor((end - start) / (1000 * 60));
      }

      // Set completedAt if status is completed
      if (status === 'completed' && !existing.completedAt) {
        data.completedAt = new Date();
      }

      const session = await prisma.trainingSession.update({
        where: { id: req.params.id },
        data,
        include: {
          trainer: {
            select: {
              id: true,
              name: true,
              phone: true,
              photoUrl: true,
            },
          },
          member: {
            select: {
              id: true,
              name: true,
              phone: true,
              photoUrl: true,
            },
          },
          gym: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.json(session);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update training session' });
    }
  }
);

// DELETE /api/training-sessions/:id - Delete training session
router.delete('/:id', requireTrainingAccess, async (req, res) => {
  try {
    const existing = await prisma.trainingSession.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) return res.status(404).json({ error: 'Training session not found' });

    // Only admin can delete sessions
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.role !== 'gym_admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    await prisma.trainingSession.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Training session deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete training session' });
  }
});

// POST /api/training-sessions/:id/start - Start training session
router.post('/:id/start', requireTrainingAccess, async (req, res) => {
  try {
    const session = await prisma.trainingSession.update({
      where: { id: req.params.id },
      data: {
        status: 'in_progress',
      },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            phone: true,
            photoUrl: true,
          },
        },
        member: {
          select: {
            id: true,
            name: true,
            phone: true,
            photoUrl: true,
          },
        },
      },
    });

    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to start training session' });
  }
});

// POST /api/training-sessions/:id/complete - Complete training session
router.post('/:id/complete', requireTrainingAccess, async (req, res) => {
  try {
    const session = await prisma.trainingSession.update({
      where: { id: req.params.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            phone: true,
            photoUrl: true,
          },
        },
        member: {
          select: {
            id: true,
            name: true,
            phone: true,
            photoUrl: true,
          },
        },
      },
    });

    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to complete training session' });
  }
});

// GET /api/training-sessions/stats - Get training session statistics
router.get('/stats', requireTrainingAccess, async (req, res) => {
  try {
    const { trainerId, startDate, endDate } = req.query;
    
    const where = {};
    if (trainerId) where.trainerId = trainerId;
    if (startDate && endDate) {
      where.scheduledDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Trainer can only see their own stats
    if (req.user.role === 'trainer') {
      where.trainerId = req.user.id;
    }

    const totalSessions = await prisma.trainingSession.count({ where });
    
    const completedSessions = await prisma.trainingSession.count({
      where: { ...where, status: 'completed' },
    });

    const totalRevenue = await prisma.trainingSession.aggregate({
      where: { ...where, paymentStatus: 'paid' },
      _sum: { amountPaid: true },
    });

    const statusBreakdown = await prisma.trainingSession.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });

    res.json({
      totalSessions,
      completedSessions,
      totalRevenue: totalRevenue._sum.amountPaid || 0,
      statusBreakdown: statusBreakdown.map(s => ({
        status: s.status,
        count: s._count.status,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch training session statistics' });
  }
});

module.exports = router;
