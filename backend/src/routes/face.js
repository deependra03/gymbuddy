const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { parseDescriptor, DESCRIPTOR_LENGTH } = require('../lib/faceMatch');

const router = express.Router();

router.use(authenticate);

// GET /api/face/status - Whether current user has enrolled their face
router.get('/status', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { faceDescriptor: true },
    });
    res.json({ enrolled: Boolean(user?.faceDescriptor) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch face enrollment status' });
  }
});

// POST /api/face/enroll - Save face descriptor for current user
router.post(
  '/enroll',
  [
    body('descriptor')
      .isArray({ min: DESCRIPTOR_LENGTH, max: DESCRIPTOR_LENGTH })
      .withMessage(`Face descriptor must be an array of ${DESCRIPTOR_LENGTH} numbers`),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const parsed = parseDescriptor(req.body.descriptor);
    if (!parsed) {
      return res.status(400).json({ error: 'Invalid face descriptor' });
    }

    try {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { faceDescriptor: JSON.stringify(parsed) },
      });
      res.json({ enrolled: true, message: 'Face enrolled successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to enroll face' });
    }
  }
);

// DELETE /api/face/enroll - Remove enrolled face
router.delete('/enroll', async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { faceDescriptor: null },
    });
    res.json({ enrolled: false, message: 'Face enrollment removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove face enrollment' });
  }
});

module.exports = router;
