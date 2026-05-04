const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');
const { mediumCache, shortCache } = require('../lib/cache');

const router = express.Router();

// GET /api/gyms - List all gyms (super admin only)
router.get('/', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'gyms:list';
    const cachedData = mediumCache.get(cacheKey);

    if (cachedData) {
      console.log('Cache HIT: gyms:list');
      return res.json(cachedData);
    }

    console.log('Cache MISS: gyms:list');
    const gyms = await prisma.gym.findMany({
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Cache the result
    mediumCache.set(cacheKey, gyms);
    res.json(gyms);
  } catch (error) {
    console.error('Error fetching gyms:', error);
    res.status(500).json({ error: 'Failed to fetch gyms' });
  }
});

// GET /api/gyms/:id - Get single gym with details (super admin only)
router.get('/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const gym = await prisma.gym.findUnique({
      where: { id: req.params.id },
      include: {
        users: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            role: true,
            joinDate: true,
            membershipEnd: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            users: {
              where: {
                isActive: true
              }
            }
          }
        }
      }
    });

    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    res.json(gym);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch gym' });
  }
});

// POST /api/gyms - Create new gym (super admin only)
router.post(
  '/',
  authenticate,
  requireSuperAdmin,
  [
    body('name').notEmpty().trim().withMessage('Gym name is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('maxMembers').isInt({ min: 1 }).withMessage('Max members must be at least 1'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, logoUrl, description, address, phone, email, maxMembers } = req.body;

    try {
      const gym = await prisma.gym.create({
        data: {
          name,
          logoUrl,
          description,
          address,
          phone,
          email,
          maxMembers: maxMembers || 100,
        },
      });

      // Invalidate cache
      mediumCache.delete('gyms:list');
      shortCache.deletePattern('gym:stats:*');
      
      res.status(201).json(gym);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create gym' });
    }
  }
);

// PUT /api/gyms/:id - Update gym (super admin only)
router.put(
  '/:id',
  authenticate,
  requireSuperAdmin,
  [
    body('name').notEmpty().trim().withMessage('Gym name is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('maxMembers').isInt({ min: 1 }).withMessage('Max members must be at least 1'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, logoUrl, description, address, phone, email, maxMembers, isActive } = req.body;

    try {
      const gym = await prisma.gym.update({
        where: { id: req.params.id },
        data: {
          name,
          logoUrl,
          description,
          address,
          phone,
          email,
          maxMembers,
          isActive,
        },
      });

      // Invalidate cache
      mediumCache.delete('gyms:list');
      mediumCache.delete(`gym:${req.params.id}`);
      shortCache.deletePattern('gym:stats:*');

      res.json(gym);
    } catch (err) {
      console.error(err);
      if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Gym not found' });
      }
      res.status(500).json({ error: 'Failed to update gym' });
    }
  }
);

// DELETE /api/gyms/:id - Delete gym (super admin only)
router.delete('/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    // Check if gym has active users
    const userCount = await prisma.user.count({
      where: {
        gymId: req.params.id,
        isActive: true
      }
    });

    if (userCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete gym with active members. Please deactivate all members first.' 
      });
    }

    await prisma.gym.delete({
      where: { id: req.params.id }
    });

    // Invalidate cache
    mediumCache.delete('gyms:list');
    mediumCache.delete(`gym:${req.params.id}`);
    shortCache.deletePattern('gym:stats:*');

    res.json({ message: 'Gym deleted successfully' });
  } catch (err) {
    console.error(err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Gym not found' });
    }
    res.status(500).json({ error: 'Failed to delete gym' });
  }
});

// GET /api/gyms/:id/stats - Get gym statistics (super admin only)
router.get('/:id/stats', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const gymId = req.params.id;
    const cacheKey = `gym:stats:${gymId}`;
    
    // Check cache first
    const cachedData = shortCache.get(cacheKey);
    
    if (cachedData) {
      console.log('Cache HIT: gym:stats:', gymId);
      return res.json(cachedData);
    }
    
    console.log('Cache MISS: gym:stats:', gymId);

    const [
      totalMembers,
      activeMembers,
      adminCount,
      memberCount,
      recentMembers
    ] = await Promise.all([
      prisma.user.count({
        where: { gymId }
      }),
      prisma.user.count({
        where: { 
          gymId,
          isActive: true 
        }
      }),
      prisma.user.count({
        where: { 
          gymId,
          role: 'admin',
          isActive: true 
        }
      }),
      prisma.user.count({
        where: { 
          gymId,
          role: 'member',
          isActive: true 
        }
      }),
      prisma.user.count({
        where: {
          gymId,
          isActive: true,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      })
    ]);

    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      select: { maxMembers: true }
    });

    const stats = {
      totalMembers,
      activeMembers,
      adminCount,
      memberCount,
      recentMembers,
      maxMembers: gym?.maxMembers || 100,
      capacityUtilization: gym ? Math.round((activeMembers / gym.maxMembers) * 100) : 0
    };

    // Cache the result
    shortCache.set(cacheKey, stats);

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch gym statistics' });
  }
});

module.exports = router;
