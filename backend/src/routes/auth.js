const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// POST /api/auth/login
router.post(
  '/login',
  [
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, password } = req.body;

    try {
      console.log('Login attempt with phone:', phone);
      console.log('Password received:', password);
      console.log('Password length:', password.length);
      const user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        console.log('User not found for phone:', phone);
        return res.status(401).json({ error: 'Invalid phone number or password' });
      }
      console.log('User found:', user.name, user.phone);

      if (!user.isActive) {
        console.log('User account is deactivated:', user.name);
        return res.status(401).json({ error: 'Account is deactivated. Contact admin.' });
      }

      console.log('Checking password for user:', user.name);
      const valid = await bcrypt.compare(password, user.passwordHash);
      console.log('Password valid:', valid);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid phone number or password' });
      }

      const token = generateToken(user.id);

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          photoUrl: user.photoUrl,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// POST /api/auth/register (admin only in production; public for seeding)
router.post(
  '/register',
  [
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, email, password, role = 'member' } = req.body;

    try {
      const existing = await prisma.user.findUnique({ where: { phone } });
      if (existing) {
        return res.status(409).json({ error: 'Phone number already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          name,
          phone,
          email: email || undefined,
          passwordHash,
          role: role === 'admin' ? 'admin' : 'member',
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          role: true,
        },
      });

      const token = generateToken(user.id);
      res.status(201).json({ token, user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
