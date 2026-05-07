const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Helper middleware to allow gym_admin and admin access
const requirePayrollAccess = (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'gym_admin' || req.user.role === 'super_admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admin or Gym Admin only.' });
  }
};

// All payroll routes require auth
router.use(authenticate);

// GET /api/payroll - List payroll records
router.get('/', requirePayrollAccess, async (req, res) => {
  try {
    const { userId, status, startDate, endDate, gymId } = req.query;
    
    const where = {
      ...(userId && { userId }),
      ...(status && { status }),
      ...(gymId && req.user.role === 'gym_admin' && { gymId }),
      ...(startDate && endDate && {
        paymentDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
    };

    const payroll = await prisma.payroll.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            photoUrl: true,
            role: true,
          },
        },
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    res.json(payroll);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payroll records' });
  }
});

// GET /api/payroll/:id - Get payroll record
router.get('/:id', requirePayrollAccess, async (req, res) => {
  try {
    const payroll = await prisma.payroll.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            photoUrl: true,
            role: true,
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

    if (!payroll) return res.status(404).json({ error: 'Payroll record not found' });

    // Gym admin can only view payroll for their gym
    if (req.user.role === 'gym_admin' && payroll.gymId !== req.user.gymId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(payroll);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payroll record' });
  }
});

// POST /api/payroll - Create payroll record
router.post(
  '/',
  requirePayrollAccess,
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('baseSalary').isFloat({ min: 0 }).withMessage('Base salary must be positive'),
    body('periodStart').isISO8601().withMessage('Period start is required'),
    body('periodEnd').isISO8601().withMessage('Period end is required'),
    body('paymentDate').isISO8601().withMessage('Payment date is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      userId,
      baseSalary,
      bonus = 0,
      deductions = 0,
      paymentDate,
      paymentMethod,
      paymentReference,
      notes,
      periodStart,
      periodEnd,
    } = req.body;

    try {
      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, gymId: true, role: true },
      });

      if (!user) return res.status(404).json({ error: 'User not found' });

      // Gym admin can only create payroll for their gym
      if (req.user.role === 'gym_admin' && user.gymId !== req.user.gymId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Calculate total
      const totalAmount = baseSalary + bonus - deductions;

      // Calculate hours worked from attendance
      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          userId,
          punchInTime: {
            gte: new Date(periodStart),
            lte: new Date(periodEnd),
          },
          punchOutTime: { not: null },
        },
      });

      const totalMinutes = attendanceRecords.reduce((sum, record) => sum + (record.durationMinutes || 0), 0);
      const hoursWorked = totalMinutes / 60;

      // Calculate session earnings from completed training sessions (for trainers)
      let sessionEarnings = 0;
      if (user.role === 'trainer') {
        const trainingSessions = await prisma.trainingSession.findMany({
          where: {
            trainerId: userId,
            scheduledDate: {
              gte: new Date(periodStart),
              lte: new Date(periodEnd),
            },
            status: 'completed',
          },
        });

        sessionEarnings = trainingSessions.reduce((sum, session) => sum + (session.sessionRate || 0), 0);
      }

      const payroll = await prisma.payroll.create({
        data: {
          userId,
          gymId: user.gymId,
          baseSalary,
          bonus,
          deductions,
          totalAmount,
          paymentDate: new Date(paymentDate),
          paymentMethod,
          paymentReference,
          notes,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          hoursWorked,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              photoUrl: true,
              role: true,
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

      res.status(201).json(payroll);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create payroll record' });
    }
  }
);

// PUT /api/payroll/:id - Update payroll record
router.put(
  '/:id',
  requirePayrollAccess,
  [
    body('baseSalary').optional().isFloat({ min: 0 }),
    body('bonus').optional().isFloat({ min: 0 }),
    body('deductions').optional().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      baseSalary,
      bonus,
      deductions,
      status,
      paymentMethod,
      paymentReference,
      notes,
    } = req.body;

    try {
      const existing = await prisma.payroll.findUnique({
        where: { id: req.params.id },
      });

      if (!existing) return res.status(404).json({ error: 'Payroll record not found' });

      // Gym admin can only update payroll for their gym
      if (req.user.role === 'gym_admin' && existing.gymId !== req.user.gymId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const data = {};
      if (baseSalary !== undefined) data.baseSalary = baseSalary;
      if (bonus !== undefined) data.bonus = bonus;
      if (deductions !== undefined) data.deductions = deductions;
      if (status !== undefined) data.status = status;
      if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
      if (paymentReference !== undefined) data.paymentReference = paymentReference;
      if (notes !== undefined) data.notes = notes;

      // Recalculate total if salary components changed
      if (baseSalary !== undefined || bonus !== undefined || deductions !== undefined) {
        const newBaseSalary = baseSalary ?? existing.baseSalary;
        const newBonus = bonus ?? existing.bonus;
        const newDeductions = deductions ?? existing.deductions;
        data.totalAmount = newBaseSalary + newBonus - newDeductions;
      }

      const payroll = await prisma.payroll.update({
        where: { id: req.params.id },
        data,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              photoUrl: true,
              role: true,
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

      res.json(payroll);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update payroll record' });
    }
  }
);

// DELETE /api/payroll/:id - Delete payroll record
router.delete('/:id', requirePayrollAccess, async (req, res) => {
  try {
    const existing = await prisma.payroll.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) return res.status(404).json({ error: 'Payroll record not found' });

    // Gym admin can only delete payroll for their gym
    if (req.user.role === 'gym_admin' && existing.gymId !== req.user.gymId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.payroll.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Payroll record deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete payroll record' });
  }
});

// POST /api/payroll/:id/mark-paid - Mark payroll as paid
router.post('/:id/mark-paid', requirePayrollAccess, async (req, res) => {
  const { paymentMethod, paymentReference } = req.body;

  try {
    const existing = await prisma.payroll.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) return res.status(404).json({ error: 'Payroll record not found' });

    // Gym admin can only mark payroll for their gym
    if (req.user.role === 'gym_admin' && existing.gymId !== req.user.gymId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const payroll = await prisma.payroll.update({
      where: { id: req.params.id },
      data: {
        status: 'paid',
        paymentMethod: paymentMethod || existing.paymentMethod,
        paymentReference: paymentReference || existing.paymentReference,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            photoUrl: true,
            role: true,
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

    res.json(payroll);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark payroll as paid' });
  }
});

// GET /api/payroll/stats - Get payroll statistics
router.get('/stats', requirePayrollAccess, async (req, res) => {
  try {
    const { startDate, endDate, gymId } = req.query;
    
    const where = {
      ...(gymId && req.user.role === 'gym_admin' && { gymId }),
      ...(startDate && endDate && {
        paymentDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
    };

    const totalPaid = await prisma.payroll.aggregate({
      where: { ...where, status: 'paid' },
      _sum: { totalAmount: true },
    });

    const totalPending = await prisma.payroll.aggregate({
      where: { ...where, status: 'pending' },
      _sum: { totalAmount: true },
    });

    const statusBreakdown = await prisma.payroll.groupBy({
      by: ['status'],
      where,
      _sum: { totalAmount: true },
      _count: { status: true },
    });

    res.json({
      totalPaid: totalPaid._sum.totalAmount || 0,
      totalPending: totalPending._sum.totalAmount || 0,
      statusBreakdown: statusBreakdown.map(s => ({
        status: s.status,
        amount: s._sum.totalAmount || 0,
        count: s._count.status,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payroll statistics' });
  }
});

module.exports = router;
