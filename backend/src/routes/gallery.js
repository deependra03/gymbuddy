const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/gallery - Public gallery
router.get('/', async (req, res) => {
  try {
    const { type, search } = req.query;
    const items = await prisma.galleryItem.findMany({
      where: {
        isPublic: true,
        ...(type && { type }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
});

// POST /api/gallery - Create gallery item (admin)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { title, description, type, imageUrl, videoUrl, tags, isPublic } = req.body;
  if (!title || !type) {
    return res.status(400).json({ error: 'title and type are required' });
  }
  try {
    const item = await prisma.galleryItem.create({
      data: {
        title,
        description,
        type,
        imageUrl,
        videoUrl,
        tags: tags || [],
        isPublic: isPublic !== false,
      },
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create gallery item' });
  }
});

// PUT /api/gallery/:id (admin)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { title, description, type, imageUrl, videoUrl, tags, isPublic } = req.body;
  try {
    const item = await prisma.galleryItem.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(type && { type }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(videoUrl !== undefined && { videoUrl }),
        ...(tags !== undefined && { tags }),
        ...(isPublic !== undefined && { isPublic }),
      },
    });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update gallery item' });
  }
});

// DELETE /api/gallery/:id (admin)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.galleryItem.delete({ where: { id: req.params.id } });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete gallery item' });
  }
});

module.exports = router;
