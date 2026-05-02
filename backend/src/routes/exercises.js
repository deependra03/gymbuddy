const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/exercises - Public list with filters
router.get('/', async (req, res) => {
  try {
    const { category, level, focusArea, search } = req.query;

    const exercises = await prisma.exercise.findMany({
      where: {
        isPublic: true,
        ...(category && { category: { equals: category, mode: 'insensitive' } }),
        ...(level && { level }),
        ...(focusArea && { focusArea: { equals: focusArea, mode: 'insensitive' } }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { category: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
    });

    res.json(exercises);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

// GET /api/exercises/:id - Single exercise
router.get('/:id', async (req, res) => {
  try {
    const exercise = await prisma.exercise.findUnique({
      where: { id: req.params.id },
    });
    if (!exercise) return res.status(404).json({ error: 'Exercise not found' });
    res.json(exercise);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch exercise' });
  }
});

// POST /api/exercises - Create exercise (admin)
router.post(
  '/',
  authenticate,
  requireAdmin,
  [
    body('title').notEmpty().trim().withMessage('Title is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('focusArea').notEmpty().withMessage('Focus area is required'),
    body('level').isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid level'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, category, focusArea, level, videoUrl, thumbnailUrl, isPublic } = req.body;

    try {
      const exercise = await prisma.exercise.create({
        data: {
          title,
          description,
          category,
          focusArea,
          level,
          videoUrl,
          thumbnailUrl,
          isPublic: isPublic !== false,
        },
      });
      res.status(201).json(exercise);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create exercise' });
    }
  }
);

// PUT /api/exercises/:id - Update exercise (admin)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { title, description, category, focusArea, level, videoUrl, thumbnailUrl, isPublic } = req.body;

  try {
    const exercise = await prisma.exercise.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(focusArea && { focusArea }),
        ...(level && { level }),
        ...(videoUrl !== undefined && { videoUrl }),
        ...(thumbnailUrl !== undefined && { thumbnailUrl }),
        ...(isPublic !== undefined && { isPublic }),
      },
    });
    res.json(exercise);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update exercise' });
  }
});

// DELETE /api/exercises/:id - Delete exercise (admin)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.exercise.delete({ where: { id: req.params.id } });
    res.json({ message: 'Exercise deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete exercise' });
  }
});

// GET /api/exercises/member/:memberId - Get member's assigned exercises
router.get('/member/:memberId', authenticate, async (req, res) => {
  // Members can only see their own exercises
  if (req.user.role !== 'admin' && req.user.id !== req.params.memberId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const assignments = await prisma.memberExercise.findMany({
      where: { memberId: req.params.memberId },
      include: { exercise: true },
      orderBy: { assignedAt: 'desc' },
    });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch member exercises' });
  }
});

module.exports = router;
