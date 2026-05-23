const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { calculateProRataSalary, generateInvoiceNumber } = require('../utils/proRata');
const { generateInvoicePDF, generateSalarySlipPDF } = require('../utils/pdfGenerator');

const router = express.Router();

const PAYROLL_ROLES = ['trainer', 'gym_admin', 'admin'];

function periodBounds(periodStart, periodEnd) {
  const start = new Date(periodStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(periodEnd);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

async function calculatePayrollForPeriod(userId, periodStart, periodEnd, useProRata = false) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      role: true,
      gymId: true,
      baseSalary: true,
      sessionRate: true,
      joinDate: true,
    },
  });

  if (!user || !PAYROLL_ROLES.includes(user.role)) {
    return null;
  }

  const { start, end } = periodBounds(periodStart, periodEnd);
  const baseSalary = user.baseSalary ?? 0;

  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      userId,
      punchInTime: { gte: start, lte: end },
      punchOutTime: { not: null },
    },
  });

  const hoursWorked =
    attendanceRecords.reduce((sum, record) => sum + (record.durationMinutes || 0), 0) / 60;
  const attendanceDays = attendanceRecords.length;

  let sessionEarnings = 0;
  let completedSessions = 0;

  if (user.role === 'trainer') {
    const trainingSessions = await prisma.trainingSession.findMany({
      where: {
        trainerId: userId,
        scheduledDate: { gte: start, lte: end },
        status: 'completed',
      },
      select: { sessionRate: true },
    });
    completedSessions = trainingSessions.length;
    sessionEarnings = trainingSessions.reduce((sum, session) => sum + (session.sessionRate || 0), 0);
  }

  // Calculate pro-rata salary if requested
  let calculatedBaseSalary = baseSalary;
  let proRataDays = null;
  let proRataMonths = null;
  let isProRata = false;

  if (useProRata && baseSalary > 0) {
    const proRataResult = calculateProRataSalary({
      baseSalary,
      periodStart: start,
      periodEnd: end,
      employeeJoinDate: user.joinDate,
      attendanceDays,
    });
    calculatedBaseSalary = proRataResult.calculatedSalary;
    proRataDays = proRataResult.proRataDays;
    proRataMonths = proRataResult.proRataMonths;
    isProRata = proRataResult.isProRata;
  }

  return {
    user,
    baseSalary: calculatedBaseSalary,
    originalBaseSalary: baseSalary,
    sessionEarnings,
    completedSessions,
    hoursWorked,
    attendanceDays,
    proRataDays,
    proRataMonths,
    isProRata,
  };
}

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

// GET /api/payroll/stats - must be before /:id
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
      statusBreakdown: statusBreakdown.map((s) => ({
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

// GET /api/payroll/employees - staff eligible for payroll (trainers + employees)
router.get('/employees', requirePayrollAccess, async (req, res) => {
  try {
    const where = {
      role: { in: PAYROLL_ROLES },
      isActive: true,
    };

    if (req.user.role === 'gym_admin' && req.user.gymId) {
      where.gymId = req.user.gymId;
    }

    const employees = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        baseSalary: true,
        sessionRate: true,
        specialization: true,
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });

    res.json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payroll employees' });
  }
});

// GET /api/payroll/preview - calculate salary + sessions for a period
router.get('/preview', requirePayrollAccess, async (req, res) => {
  try {
    const { userId, periodStart, periodEnd, useProRata } = req.query;

    if (!userId || !periodStart || !periodEnd) {
      return res.status(400).json({ error: 'userId, periodStart, and periodEnd are required' });
    }

    const calc = await calculatePayrollForPeriod(userId, periodStart, periodEnd, useProRata === 'true');
    if (!calc) {
      return res.status(404).json({ error: 'Employee not found or not eligible for payroll' });
    }

    if (req.user.role === 'gym_admin' && calc.user.gymId !== req.user.gymId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      userId: calc.user.id,
      name: calc.user.name,
      role: calc.user.role,
      baseSalary: calc.baseSalary,
      originalBaseSalary: calc.originalBaseSalary,
      sessionEarnings: calc.sessionEarnings,
      completedSessions: calc.completedSessions,
      hoursWorked: Math.round(calc.hoursWorked * 100) / 100,
      attendanceDays: calc.attendanceDays,
      proRataDays: calc.proRataDays,
      proRataMonths: calc.proRataMonths,
      isProRata: calc.isProRata,
      suggestedTotal: calc.baseSalary + calc.sessionEarnings,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to calculate payroll preview' });
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
    body('baseSalary').optional().isFloat({ min: 0 }).withMessage('Base salary must be positive'),
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
      useProRata = false,
      generateInvoice = false,
    } = req.body;

    try {
      const calc = await calculatePayrollForPeriod(userId, periodStart, periodEnd, useProRata);
      if (!calc) {
        return res.status(404).json({ error: 'User not found or not eligible for payroll' });
      }

      if (req.user.role === 'gym_admin' && calc.user.gymId !== req.user.gymId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const resolvedBaseSalary =
        baseSalary !== undefined && baseSalary !== null && baseSalary !== ''
          ? parseFloat(baseSalary)
          : calc.baseSalary;

      const sessionEarnings = calc.sessionEarnings;
      const hoursWorked = calc.hoursWorked;
      const totalAmount = resolvedBaseSalary + sessionEarnings + bonus - deductions;

      const payroll = await prisma.payroll.create({
        data: {
          userId,
          gymId: calc.user.gymId,
          baseSalary: resolvedBaseSalary,
          bonus,
          deductions,
          totalAmount,
          sessionEarnings,
          paymentDate: new Date(paymentDate),
          paymentMethod,
          paymentReference,
          notes,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          hoursWorked,
          proRataDays: calc.proRataDays,
          proRataMonths: calc.proRataMonths,
          isProRata: calc.isProRata,
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

      // Generate invoice if requested
      if (generateInvoice) {
        const invoiceNumber = generateInvoiceNumber(calc.user.gymId, new Date(paymentDate));
        const invoice = await prisma.invoice.create({
          data: {
            payrollId: payroll.id,
            invoiceNumber,
            userId: payroll.userId,
            gymId: payroll.gymId,
            amount: payroll.totalAmount,
            status: 'pending',
            issueDate: new Date(),
            dueDate: new Date(paymentDate),
            paymentMethod: paymentMethod || null,
            paymentReference: paymentReference || null,
            notes: notes || null,
          },
        });

        payroll.invoice = invoice;
      }

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
        const newSessionEarnings = existing.sessionEarnings ?? 0;
        data.totalAmount = newBaseSalary + newSessionEarnings + newBonus - newDeductions;
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

    // Update invoice status if exists
    if (payroll.invoice) {
      await prisma.invoice.update({
        where: { payrollId: payroll.id },
        data: {
          status: 'paid',
          paidDate: new Date(),
          paymentMethod: paymentMethod || payroll.invoice.paymentMethod,
          paymentReference: paymentReference || payroll.invoice.paymentReference,
        },
      });
    }

    res.json(payroll);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark payroll as paid' });
  }
});

// POST /api/payroll/:id/generate-invoice - Generate invoice for payroll
router.post('/:id/generate-invoice', requirePayrollAccess, async (req, res) => {
  try {
    const payroll = await prisma.payroll.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        gym: true,
      },
    });

    if (!payroll) return res.status(404).json({ error: 'Payroll record not found' });

    // Gym admin can only generate invoice for their gym
    if (req.user.role === 'gym_admin' && payroll.gymId !== req.user.gymId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if invoice already exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { payrollId: payroll.id },
    });

    if (existingInvoice) {
      return res.status(400).json({ error: 'Invoice already exists for this payroll' });
    }

    const invoiceNumber = generateInvoiceNumber(payroll.gymId, payroll.paymentDate);
    const invoice = await prisma.invoice.create({
      data: {
        payrollId: payroll.id,
        invoiceNumber,
        userId: payroll.userId,
        gymId: payroll.gymId,
        amount: payroll.totalAmount,
        status: payroll.status === 'paid' ? 'paid' : 'pending',
        issueDate: new Date(),
        dueDate: payroll.paymentDate,
        paymentMethod: payroll.paymentMethod || null,
        paymentReference: payroll.paymentReference || null,
        notes: payroll.notes || null,
        paidDate: payroll.status === 'paid' ? payroll.paymentDate : null,
      },
      include: {
        payroll: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
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
        },
      },
    });

    res.status(201).json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

// GET /api/payroll/:id/invoice - Get invoice for payroll
router.get('/:id/invoice', requirePayrollAccess, async (req, res) => {
  try {
    const payroll = await prisma.payroll.findUnique({
      where: { id: req.params.id },
    });

    if (!payroll) return res.status(404).json({ error: 'Payroll record not found' });

    // Gym admin can only view invoice for their gym
    if (req.user.role === 'gym_admin' && payroll.gymId !== req.user.gymId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { payrollId: req.params.id },
      include: {
        payroll: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
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
        },
      },
    });

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    res.json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// GET /api/payroll/:id/invoice/pdf - Download invoice as PDF
router.get('/:id/invoice/pdf', requirePayrollAccess, async (req, res) => {
  try {
    const payroll = await prisma.payroll.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        gym: true,
      },
    });

    if (!payroll) return res.status(404).json({ error: 'Payroll record not found' });

    // Gym admin can only download invoice for their gym
    if (req.user.role === 'gym_admin' && payroll.gymId !== req.user.gymId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { payrollId: req.params.id },
      include: {
        payroll: {
          include: {
            user: true,
            gym: true,
          },
        },
      },
    });

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const pdfBuffer = await generateInvoicePDF(invoice);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate invoice PDF' });
  }
});

// GET /api/payroll/:id/salary-slip/pdf - Download salary slip as PDF
router.get('/:id/salary-slip/pdf', requirePayrollAccess, async (req, res) => {
  try {
    const payroll = await prisma.payroll.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        gym: true,
      },
    });

    if (!payroll) return res.status(404).json({ error: 'Payroll record not found' });

    // Gym admin can only download salary slip for their gym
    if (req.user.role === 'gym_admin' && payroll.gymId !== req.user.gymId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const pdfBuffer = await generateSalarySlipPDF(payroll);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="salary-slip-${payroll.user.name}-${new Date(payroll.paymentDate).toISOString().split('T')[0]}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate salary slip PDF' });
  }
});

module.exports = router;
