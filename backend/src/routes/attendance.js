const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { isMatch, findBestMatch, parseDescriptor } = require('../lib/faceMatch');

const router = express.Router();

// All attendance routes require auth
router.use(authenticate);

// Helper middleware to allow gym_admin and admin access
const requireAttendanceAccess = (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'gym_admin' || req.user.role === 'super_admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admin or Gym Admin only.' });
  }
};

// GET /api/attendance - List attendance records
router.get('/', async (req, res) => {
  try {
    const { userId, startDate, endDate, method } = req.query;
    
    // Admin and gym_admin can view all, members can only view their own
    const isAdmin = req.user.role === 'admin' || req.user.role === 'gym_admin' || req.user.role === 'super_admin';
    const where = {
      ...(!isAdmin && { userId: req.user.id }),
      ...(userId && isAdmin && { userId }),
      ...(startDate && { punchInTime: { gte: new Date(startDate) } }),
      ...(endDate && { punchInTime: { lte: new Date(endDate) } }),
      ...(method && { method }),
    };

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        user: {
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
      orderBy: { punchInTime: 'desc' },
    });

    res.json(attendance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

// GET /api/attendance/today - Get today's attendance for current user
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await prisma.attendance.findFirst({
      where: {
        userId: req.user.id,
        punchInTime: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: { punchInTime: 'desc' },
    });

    res.json(attendance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch today\'s attendance' });
  }
});

// POST /api/attendance/punch-in - Punch in
router.post(
  '/punch-in',
  [
    body('method').optional().isIn(['manual', 'biometric', 'qr', 'face']),
    body('biometricData').optional().isString(),
    body('deviceInfo').optional().isString(),
    body('location').optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { method, biometricData, deviceInfo, location, notes } = req.body;

    try {
      // Check if user already punched in today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingAttendance = await prisma.attendance.findFirst({
        where: {
          userId: req.user.id,
          punchInTime: {
            gte: today,
            lt: tomorrow,
          },
          punchOutTime: null,
        },
      });

      if (existingAttendance) {
        return res.status(400).json({ error: 'Already punched in today. Please punch out first.' });
      }

      // Get user's gym
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { gymId: true },
      });

      const attendance = await prisma.attendance.create({
        data: {
          userId: req.user.id,
          gymId: user?.gymId,
          punchInTime: new Date(),
          method: method || 'manual',
          biometricData,
          deviceInfo,
          location,
          notes,
        },
        include: {
          user: {
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

      res.status(201).json(attendance);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to punch in' });
    }
  }
);

// POST /api/attendance/punch-out - Punch out
router.post('/punch-out', async (req, res) => {
  try {
    // Find active attendance record (punched in but not out)
    const attendance = await prisma.attendance.findFirst({
      where: {
        userId: req.user.id,
        punchOutTime: null,
      },
      orderBy: { punchInTime: 'desc' },
    });

    if (!attendance) {
      return res.status(400).json({ error: 'No active punch-in found. Please punch in first.' });
    }

    const punchOutTime = new Date();
    const durationMinutes = Math.floor(
      (punchOutTime - new Date(attendance.punchInTime)) / (1000 * 60)
    );

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        punchOutTime,
        durationMinutes,
      },
      include: {
        user: {
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

    res.json(updatedAttendance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to punch out' });
  }
});

// POST /api/attendance/biometric - Biometric punch in/out
router.post(
  '/biometric',
  [
    body('biometricData').notEmpty().withMessage('Biometric data is required'),
    body('action').isIn(['punch-in', 'punch-out']).withMessage('Action must be punch-in or punch-out'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { biometricData, action, deviceInfo, location } = req.body;

    try {
      // In a real implementation, you would verify the biometric data here
      // For now, we'll store it and proceed
      
      if (action === 'punch-in') {
        // Check if user already punched in today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const existingAttendance = await prisma.attendance.findFirst({
          where: {
            userId: req.user.id,
            punchInTime: {
              gte: today,
              lt: tomorrow,
            },
            punchOutTime: null,
          },
        });

        if (existingAttendance) {
          return res.status(400).json({ error: 'Already punched in today. Please punch out first.' });
        }

        // Get user's gym
        const user = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { gymId: true },
        });

        const attendance = await prisma.attendance.create({
          data: {
            userId: req.user.id,
            gymId: user?.gymId,
            punchInTime: new Date(),
            method: 'biometric',
            biometricData,
            deviceInfo,
            location,
          },
          include: {
            user: {
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

        res.status(201).json(attendance);
      } else {
        // Punch out
        const attendance = await prisma.attendance.findFirst({
          where: {
            userId: req.user.id,
            punchOutTime: null,
          },
          orderBy: { punchInTime: 'desc' },
        });

        if (!attendance) {
          return res.status(400).json({ error: 'No active punch-in found. Please punch in first.' });
        }

        const punchOutTime = new Date();
        const durationMinutes = Math.floor(
          (punchOutTime - new Date(attendance.punchInTime)) / (1000 * 60)
        );

        const updatedAttendance = await prisma.attendance.update({
          where: { id: attendance.id },
          data: {
            punchOutTime,
            durationMinutes,
            biometricData,
            deviceInfo,
            location,
          },
          include: {
            user: {
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

        res.json(updatedAttendance);
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to process biometric attendance' });
    }
  }
);

async function punchInUser(userId, { deviceInfo, location, biometricData } = {}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingAttendance = await prisma.attendance.findFirst({
    where: {
      userId,
      punchInTime: { gte: today, lt: tomorrow },
      punchOutTime: null,
    },
  });

  if (existingAttendance) {
    return { error: 'Already punched in today. Please punch out first.', status: 400 };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { gymId: true },
  });

  const attendance = await prisma.attendance.create({
    data: {
      userId,
      gymId: user?.gymId,
      punchInTime: new Date(),
      method: 'face',
      biometricData,
      deviceInfo,
      location,
    },
    include: {
      user: { select: { id: true, name: true, phone: true, photoUrl: true } },
      gym: { select: { id: true, name: true } },
    },
  });

  return { attendance, status: 201 };
}

async function punchOutUser(userId, { deviceInfo, location, biometricData } = {}) {
  const attendance = await prisma.attendance.findFirst({
    where: { userId, punchOutTime: null },
    orderBy: { punchInTime: 'desc' },
  });

  if (!attendance) {
    return { error: 'No active punch-in found. Please punch in first.', status: 400 };
  }

  const punchOutTime = new Date();
  const durationMinutes = Math.floor(
    (punchOutTime - new Date(attendance.punchInTime)) / (1000 * 60)
  );

  const updatedAttendance = await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      punchOutTime,
      durationMinutes,
      biometricData,
      deviceInfo,
      location,
    },
    include: {
      user: { select: { id: true, name: true, phone: true, photoUrl: true } },
      gym: { select: { id: true, name: true } },
    },
  });

  return { attendance: updatedAttendance, status: 200 };
}

// POST /api/attendance/face - Face recognition punch in/out (logged-in member)
router.post(
  '/face',
  [
    body('descriptor').isArray().withMessage('Face descriptor is required'),
    body('action').isIn(['punch-in', 'punch-out']).withMessage('Action must be punch-in or punch-out'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { descriptor, action, deviceInfo, location } = req.body;

    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { faceDescriptor: true },
      });

      if (!user?.faceDescriptor) {
        return res.status(400).json({
          error: 'Face not enrolled. Please enroll your face in Profile first.',
        });
      }

      if (!isMatch(descriptor, user.faceDescriptor)) {
        return res.status(403).json({ error: 'Face not recognized. Please try again.' });
      }

      const biometricData = JSON.stringify(parseDescriptor(descriptor));

      if (action === 'punch-in') {
        const result = await punchInUser(req.user.id, { deviceInfo, location, biometricData });
        if (result.error) return res.status(result.status).json({ error: result.error });
        return res.status(result.status).json(result.attendance);
      }

      const result = await punchOutUser(req.user.id, { deviceInfo, location, biometricData });
      if (result.error) return res.status(result.status).json({ error: result.error });
      return res.json(result.attendance);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to process face attendance' });
    }
  }
);

// POST /api/attendance/face-kiosk - Admin gym kiosk: identify member by face
router.post(
  '/face-kiosk',
  requireAttendanceAccess,
  [body('descriptor').isArray().withMessage('Face descriptor is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { descriptor, deviceInfo, location } = req.body;

    try {
      const admin = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { gymId: true },
      });

      const members = await prisma.user.findMany({
        where: {
          role: 'member',
          isActive: true,
          faceDescriptor: { not: null },
          ...(admin?.gymId && { gymId: admin.gymId }),
        },
        select: {
          id: true,
          name: true,
          phone: true,
          photoUrl: true,
          faceDescriptor: true,
        },
      });

      if (members.length === 0) {
        return res.status(404).json({ error: 'No members with enrolled faces found' });
      }

      const match = findBestMatch(descriptor, members);
      if (!match) {
        return res.status(403).json({ error: 'Face not recognized. Member may need to enroll first.' });
      }
      if (match.ambiguous) {
        return res.status(409).json({ error: 'Multiple similar matches. Please try again or use manual check-in.' });
      }

      const memberId = match.user.id;
      const biometricData = JSON.stringify(parseDescriptor(descriptor));

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const activeToday = await prisma.attendance.findFirst({
        where: {
          userId: memberId,
          punchInTime: { gte: today, lt: tomorrow },
          punchOutTime: null,
        },
      });

      let result;
      let action;
      if (activeToday) {
        action = 'punch-out';
        result = await punchOutUser(memberId, { deviceInfo, location, biometricData });
      } else {
        action = 'punch-in';
        result = await punchInUser(memberId, { deviceInfo, location, biometricData });
      }

      if (result.error) {
        return res.status(result.status).json({ error: result.error });
      }

      return res.status(result.status).json({
        action,
        matchedMember: {
          id: match.user.id,
          name: match.user.name,
          phone: match.user.phone,
          photoUrl: match.user.photoUrl,
        },
        attendance: result.attendance,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to process kiosk face attendance' });
    }
  }
);

// GET /api/attendance/stats - Get attendance statistics (admin/gym_admin only)
router.get('/stats', requireAttendanceAccess, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where = {};
    if (startDate && endDate) {
      where.punchInTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const totalRecords = await prisma.attendance.count({ where });
    
    const uniqueUsers = await prisma.attendance.groupBy({
      by: ['userId'],
      where,
    });

    const avgDuration = await prisma.attendance.aggregate({
      where: {
        ...where,
        durationMinutes: { not: null },
      },
      _avg: {
        durationMinutes: true,
      },
    });

    const methodBreakdown = await prisma.attendance.groupBy({
      by: ['method'],
      where,
      _count: {
        method: true,
      },
    });

    res.json({
      totalRecords,
      uniqueUsers: uniqueUsers.length,
      averageDurationMinutes: avgDuration._avg.durationMinutes || 0,
      methodBreakdown: methodBreakdown.map(m => ({
        method: m.method,
        count: m._count.method,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch attendance statistics' });
  }
});

module.exports = router;
