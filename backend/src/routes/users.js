const express = require('express');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const { shortCache } = require('../lib/cache');

const router = express.Router();

// All user routes require auth
router.use(authenticate);

// GET /api/users - List all users (super admin only)
router.get('/', requireSuperAdmin, async (req, res) => {
  try {
    const { search, isActive, role, gymId } = req.query;
    
    // Create cache key based on query parameters
    const cacheKey = `users:list:${JSON.stringify({ search, isActive, role, gymId })}`;
    
    // Check cache first
    const cachedData = shortCache.get(cacheKey);

    if (cachedData) {
      console.log('Cache HIT: users:list');
      return res.json(cachedData);
    }
    
    console.log('Cache MISS: users:list');
    
    // Build where clause
    let whereClause = {
      role: {
        not: 'super_admin' // Exclude super admins from the list
      }
    };
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }
    
    if (role && role !== 'all') {
      whereClause.role = role;
    }
    
    if (gymId && gymId !== 'all') {
      whereClause.gymId = gymId;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
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
        membershipEnd: true,
        gymId: true,
        isActive: true,
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Cache the result
    shortCache.set(cacheKey, users);

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id - Get a specific user (super admin only)
router.get('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
