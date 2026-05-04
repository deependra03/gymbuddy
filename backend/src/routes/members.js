const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { getMembershipEntitlement } = require('../lib/planEntitlement');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All member routes require auth
router.use(authenticate);

// GET /api/members - List all members (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { search, isActive } = req.query;
    
    // Build where clause
    let whereClause = {
      role: 'member',
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
    };

    // If not super admin, scope to user's gym
    if (req.user.role !== 'super_admin' && req.user.gymId) {
      whereClause.gymId = req.user.gymId;
    }

    const members = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        photoUrl: true,
        age: true,
        weight: true,
        height: true,
        goal: true,
        isActive: true,
        joinDate: true,
        membershipStart: true,
        membershipEnd: true,
        membershipDurationMonths: true,
        membershipPurchasePrice: true,
        _count: {
          select: {
            assignedExercises: true,
            dietPlans: true,
          },
        },
      },
      orderBy: { joinDate: 'desc' },
    });
    res.json(members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// GET /api/members/:id - Get member profile
router.get('/:id', async (req, res) => {
  try {
    // Members can only view their own profile
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const member = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        photoUrl: true,
        age: true,
        weight: true,
        height: true,
        goal: true,
        isActive: true,
        joinDate: true,
        membershipStart: true,
        membershipEnd: true,
        membershipDurationMonths: true,
        membershipPurchasePrice: true,
        assignedExercises: {
          include: {
            exercise: true,
          },
        },
        dietPlans: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!member) return res.status(404).json({ error: 'Member not found' });

    const planAccess = getMembershipEntitlement(member);
    const isSelfMember = req.user.role === 'member' && req.user.id === member.id;

    let assignedExercises = member.assignedExercises;
    let dietPlans = member.dietPlans;
    if (isSelfMember && (planAccess === 'upcoming' || planAccess === 'expired')) {
      assignedExercises = [];
      dietPlans = [];
    }

    res.json({
      ...member,
      assignedExercises,
      dietPlans,
      planAccess,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch member' });
  }
});

// POST /api/members - Create member (admin only)
router.post(
  '/',
  requireAdmin,
  [
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('phone').notEmpty().withMessage('Phone is required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
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
      age,
      weight,
      height,
      goal,
      photoUrl,
      membershipStart,
      membershipEnd,
      membershipDurationMonths,
      membershipPurchasePrice,
      gymId,
    } = req.body;

    try {
      const existing = await prisma.user.findUnique({ where: { phone } });
      if (existing) return res.status(409).json({ error: 'Phone already registered' });

      const passwordHash = await bcrypt.hash(password, 12);

      // Determine gym ID
      let assignedGymId = gymId;
      if (!assignedGymId) {
        // If no gymId provided, use admin's gym (for regular admins)
        if (req.user.role === 'admin' && req.user.gymId) {
          assignedGymId = req.user.gymId;
        } else if (req.user.role === 'super_admin') {
          // Super admin must specify gymId
          return res.status(400).json({ error: 'Gym ID is required for super admin' });
        }
      }

      const member = await prisma.user.create({
        data: {
          name,
          phone,
          email: email || undefined,
          passwordHash,
          role: 'member',
          gymId: assignedGymId,
          age: age ? parseInt(age) : undefined,
          weight: weight ? parseFloat(weight) : undefined,
          height: height ? parseFloat(height) : undefined,
          goal: goal || undefined,
          photoUrl: photoUrl || undefined,
          membershipStart: membershipStart ? new Date(membershipStart) : undefined,
          membershipEnd: membershipEnd ? new Date(membershipEnd) : undefined,
          membershipDurationMonths: (() => {
            if (
              membershipDurationMonths === undefined ||
              membershipDurationMonths === null ||
              membershipDurationMonths === ''
            ) {
              return undefined;
            }
            const n = parseInt(membershipDurationMonths, 10);
            return Number.isNaN(n) ? undefined : n;
          })(),
          membershipPurchasePrice:
            membershipPurchasePrice !== undefined &&
            membershipPurchasePrice !== null &&
            membershipPurchasePrice !== ''
              ? parseFloat(membershipPurchasePrice)
              : undefined,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          photoUrl: true,
          age: true,
          weight: true,
          height: true,
          goal: true,
          joinDate: true,
        },
      });

      res.status(201).json(member);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create member' });
    }
  }
);

// PUT /api/members/:id - Update member (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  const {
    name,
    email,
    age,
    weight,
    height,
    goal,
    photoUrl,
    isActive,
    password,
    membershipStart,
    membershipEnd,
    membershipDurationMonths,
    membershipPurchasePrice,
  } = req.body;

  try {
    const data = {};
    if (name) data.name = name;
    if (email !== undefined) data.email = email || null;
    if (age !== undefined) data.age = age ? parseInt(age) : null;
    if (weight !== undefined) data.weight = weight ? parseFloat(weight) : null;
    if (height !== undefined) data.height = height ? parseFloat(height) : null;
    if (goal !== undefined) data.goal = goal;
    if (photoUrl !== undefined) data.photoUrl = photoUrl;
    if (isActive !== undefined) data.isActive = isActive;
    if (password) data.passwordHash = await bcrypt.hash(password, 12);
    if (membershipStart !== undefined) {
      data.membershipStart = membershipStart ? new Date(membershipStart) : null;
    }
    if (membershipEnd !== undefined) {
      data.membershipEnd = membershipEnd ? new Date(membershipEnd) : null;
    }
    if (membershipPurchasePrice !== undefined) {
      data.membershipPurchasePrice =
        membershipPurchasePrice === null || membershipPurchasePrice === ''
          ? null
          : parseFloat(membershipPurchasePrice);
    }
    if (membershipDurationMonths !== undefined) {
      if (membershipDurationMonths === null || membershipDurationMonths === '') {
        data.membershipDurationMonths = null;
      } else {
        const n = parseInt(membershipDurationMonths, 10);
        data.membershipDurationMonths = Number.isNaN(n) ? null : n;
      }
    }

    const member = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        photoUrl: true,
        age: true,
        weight: true,
        height: true,
        goal: true,
        isActive: true,
        membershipStart: true,
        membershipEnd: true,
        membershipDurationMonths: true,
        membershipPurchasePrice: true,
      },
    });

    res.json(member);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// DELETE /api/members/:id - Deactivate member (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ message: 'Member deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate member' });
  }
});

// POST /api/members/:id/assign-exercise - Assign exercise to member
router.post('/:id/assign-exercise', requireAdmin, async (req, res) => {
  const { exerciseId, notes } = req.body;
  try {
    const assignment = await prisma.memberExercise.upsert({
      where: {
        memberId_exerciseId: {
          memberId: req.params.id,
          exerciseId,
        },
      },
      update: { notes },
      create: {
        memberId: req.params.id,
        exerciseId,
        notes,
      },
      include: { exercise: true },
    });
    res.json(assignment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assign exercise' });
  }
});

// DELETE /api/members/:id/assign-exercise/:exerciseId - Remove exercise
router.delete('/:id/assign-exercise/:exerciseId', requireAdmin, async (req, res) => {
  try {
    await prisma.memberExercise.delete({
      where: {
        memberId_exerciseId: {
          memberId: req.params.id,
          exerciseId: req.params.exerciseId,
        },
      },
    });
    res.json({ message: 'Exercise removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove exercise' });
  }
});

module.exports = router;
