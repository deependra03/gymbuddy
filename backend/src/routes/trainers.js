const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Helper middleware to allow gym_admin and admin access
const requireTrainerAccess = (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'gym_admin' || req.user.role === 'super_admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admin or Gym Admin only.' });
  }
};

// All trainer routes require auth
router.use(authenticate);

// GET /api/trainers - List all trainers
router.get('/', requireTrainerAccess, async (req, res) => {
  try {
    const { isActive } = req.query;
    
    const trainers = await prisma.user.findMany({
      where: {
        role: 'trainer',
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        photoUrl: true,
        role: true,
        baseSalary: true,
        sessionRate: true,
        specialization: true,
        bio: true,
        age: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            trainerSessions: {
              where: {
                status: 'completed',
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(trainers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch trainers' });
  }
});

// GET /api/trainers/:id - Get trainer by ID
router.get('/:id', requireTrainerAccess, async (req, res) => {
  try {
    const trainer = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        photoUrl: true,
        role: true,
        baseSalary: true,
        sessionRate: true,
        specialization: true,
        bio: true,
        age: true,
        weight: true,
        height: true,
        goal: true,
        isActive: true,
        joinDate: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            trainerSessions: {
              where: {
                status: 'completed',
              },
            },
          },
        },
      },
    });

    if (!trainer) return res.status(404).json({ error: 'Trainer not found' });
    if (trainer.role !== 'trainer') return res.status(400).json({ error: 'User is not a trainer' });

    res.json(trainer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch trainer' });
  }
});

// POST /api/trainers - Create new trainer
router.post(
  '/',
  requireTrainerAccess,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('phone').notEmpty().withMessage('Phone is required').isLength({ min: 10, max: 10 }).withMessage('Phone must be 10 digits'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('baseSalary').optional().isFloat({ min: 0 }).withMessage('Base salary must be positive'),
    body('sessionRate').optional().isFloat({ min: 0 }).withMessage('Session rate must be positive'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      phone,
      email,
      password,
      baseSalary,
      sessionRate,
      specialization,
      bio,
      age,
      weight,
      height,
      goal,
    } = req.body;

    try {
      // Check if phone already exists
      const existingPhone = await prisma.user.findUnique({
        where: { phone },
      });

      if (existingPhone) return res.status(400).json({ error: 'Phone number already exists' });

      // Check if email already exists (if provided)
      if (email) {
        const existingEmail = await prisma.user.findUnique({
          where: { email },
        });

        if (existingEmail) return res.status(400).json({ error: 'Email already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      const trainer = await prisma.user.create({
        data: {
          name,
          phone,
          email,
          passwordHash,
          role: 'trainer',
          baseSalary: baseSalary ? parseFloat(baseSalary) : null,
          sessionRate: sessionRate ? parseFloat(sessionRate) : null,
          specialization,
          bio,
          age: age ? parseInt(age) : null,
          weight: weight ? parseFloat(weight) : null,
          height: height ? parseFloat(height) : null,
          goal,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          photoUrl: true,
          role: true,
          baseSalary: true,
          sessionRate: true,
          specialization: true,
          bio: true,
          age: true,
          isActive: true,
          createdAt: true,
        },
      });

      res.status(201).json(trainer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create trainer' });
    }
  }
);

// PUT /api/trainers/:id - Update trainer
router.put(
  '/:id',
  requireTrainerAccess,
  [
    body('baseSalary').optional().isFloat({ min: 0 }),
    body('sessionRate').optional().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      phone,
      email,
      baseSalary,
      sessionRate,
      specialization,
      bio,
      age,
      weight,
      height,
      goal,
      isActive,
    } = req.body;

    try {
      const existing = await prisma.user.findUnique({
        where: { id: req.params.id },
      });

      if (!existing) return res.status(404).json({ error: 'Trainer not found' });
      if (existing.role !== 'trainer') return res.status(400).json({ error: 'User is not a trainer' });

      // Check if phone is being changed and if it already exists
      if (phone && phone !== existing.phone) {
        const existingPhone = await prisma.user.findUnique({
          where: { phone },
        });

        if (existingPhone) return res.status(400).json({ error: 'Phone number already exists' });
      }

      // Check if email is being changed and if it already exists
      if (email && email !== existing.email) {
        const existingEmail = await prisma.user.findUnique({
          where: { email },
        });

        if (existingEmail) return res.status(400).json({ error: 'Email already exists' });
      }

      const data = {};
      if (name !== undefined) data.name = name;
      if (phone !== undefined) data.phone = phone;
      if (email !== undefined) data.email = email;
      if (baseSalary !== undefined) data.baseSalary = parseFloat(baseSalary);
      if (sessionRate !== undefined) data.sessionRate = parseFloat(sessionRate);
      if (specialization !== undefined) data.specialization = specialization;
      if (bio !== undefined) data.bio = bio;
      if (age !== undefined) data.age = parseInt(age);
      if (weight !== undefined) data.weight = parseFloat(weight);
      if (height !== undefined) data.height = parseFloat(height);
      if (goal !== undefined) data.goal = goal;
      if (isActive !== undefined) data.isActive = isActive;

      const trainer = await prisma.user.update({
        where: { id: req.params.id },
        data,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          photoUrl: true,
          role: true,
          baseSalary: true,
          sessionRate: true,
          specialization: true,
          bio: true,
          age: true,
          isActive: true,
          createdAt: true,
        },
      });

      res.json(trainer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update trainer' });
    }
  }
);

// DELETE /api/trainers/:id - Delete trainer
router.delete('/:id', requireTrainerAccess, async (req, res) => {
  try {
    const existing = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) return res.status(404).json({ error: 'Trainer not found' });
    if (existing.role !== 'trainer') return res.status(400).json({ error: 'User is not a trainer' });

    await prisma.user.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Trainer deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete trainer' });
  }
});

// GET /api/trainers/stats - Get trainer statistics
router.get('/stats', requireTrainerAccess, async (req, res) => {
  try {
    const totalTrainers = await prisma.user.count({
      where: { role: 'trainer' },
    });

    const activeTrainers = await prisma.user.count({
      where: { role: 'trainer', isActive: true },
    });

    const inactiveTrainers = totalTrainers - activeTrainers;

    res.json({
      totalTrainers,
      activeTrainers,
      inactiveTrainers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch trainer statistics' });
  }
});

module.exports = router;
