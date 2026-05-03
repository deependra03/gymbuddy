const express = require('express');
const prisma = require('../lib/prisma');
const { getMembershipEntitlement } = require('../lib/planEntitlement');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/diet/member/:memberId - Get diet plans for a member
router.get('/member/:memberId', async (req, res) => {
  if (req.user.role !== 'admin' && req.user.id !== req.params.memberId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    if (req.user.role !== 'admin') {
      const memberRow = await prisma.user.findUnique({
        where: { id: req.params.memberId },
        select: { membershipStart: true, membershipEnd: true },
      });
      const ent = getMembershipEntitlement(memberRow || {});
      if (ent === 'upcoming' || ent === 'expired') {
        return res.json([]);
      }
    }

    const plans = await prisma.dietPlan.findMany({
      where: { memberId: req.params.memberId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch diet plans' });
  }
});

// POST /api/diet - Create diet plan (admin)
router.post('/', requireAdmin, async (req, res) => {
  const { memberId, title, content, notes } = req.body;
  if (!memberId || !title || !content) {
    return res.status(400).json({ error: 'memberId, title and content are required' });
  }
  try {
    const plan = await prisma.dietPlan.create({
      data: {
        memberId,
        title,
        content: typeof content === 'string' ? content : JSON.stringify(content),
        notes,
      },
    });
    res.status(201).json(plan);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create diet plan' });
  }
});

// PUT /api/diet/:id - Update diet plan (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  const { title, content, notes } = req.body;
  try {
    const plan = await prisma.dietPlan.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(content !== undefined && {
          content: typeof content === 'string' ? content : JSON.stringify(content),
        }),
        ...(notes !== undefined && { notes }),
      },
    });
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update diet plan' });
  }
});

// DELETE /api/diet/:id - Delete diet plan (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.dietPlan.delete({ where: { id: req.params.id } });
    res.json({ message: 'Diet plan deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete diet plan' });
  }
});

module.exports = router;
