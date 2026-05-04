const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { generateExercisePDF, generateDietPlanPDF, generateMemberExercisesPDF } = require('../lib/pdfGenerator');
const { sendWhatsAppMessage, formatExerciseMessage, formatDietPlanMessage, formatMemberExercisesMessage } = require('../lib/whatsapp');

const router = express.Router();
router.use(authenticate);

// POST /api/send/exercise/:id/pdf - Generate and send exercise PDF to member
router.post('/exercise/:id/pdf', requireAdmin, async (req, res) => {
  try {
    const { memberId, sendVia } = req.body; // sendVia: 'download' or 'whatsapp'
    
    const exercise = await prisma.exercise.findUnique({
      where: { id: req.params.id },
    });

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    const pdfBuffer = await generateExercisePDF(exercise);

    if (sendVia === 'download') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${exercise.title.replace(/[^a-z0-9]/gi, '_')}.pdf"`);
      res.send(pdfBuffer);
    } else if (sendVia === 'whatsapp') {
      if (!memberId) {
        return res.status(400).json({ error: 'Member ID is required for WhatsApp' });
      }

      const member = await prisma.user.findUnique({
        where: { id: memberId },
      });

      if (!member || !member.phone) {
        return res.status(404).json({ error: 'Member not found or has no phone number' });
      }

      const message = formatExerciseMessage(exercise);
      await sendWhatsAppMessage(member.phone, message);

      res.json({ message: 'Exercise sent via WhatsApp' });
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${exercise.title.replace(/[^a-z0-9]/gi, '_')}.pdf"`);
      res.send(pdfBuffer);
    }
  } catch (error) {
    console.error('Error sending exercise:', error);
    res.status(500).json({ error: 'Failed to send exercise' });
  }
});

// POST /api/send/diet-plan/:id/pdf - Generate and send diet plan PDF to member
router.post('/diet-plan/:id/pdf', requireAdmin, async (req, res) => {
  try {
    const { sendVia } = req.body; // sendVia: 'download' or 'whatsapp'
    
    const dietPlan = await prisma.dietPlan.findUnique({
      where: { id: req.params.id },
      include: { member: true },
    });

    if (!dietPlan) {
      return res.status(404).json({ error: 'Diet plan not found' });
    }

    const pdfBuffer = await generateDietPlanPDF(dietPlan, dietPlan.member);

    if (sendVia === 'download') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${dietPlan.title.replace(/[^a-z0-9]/gi, '_')}_diet_plan.pdf"`);
      res.send(pdfBuffer);
    } else if (sendVia === 'whatsapp') {
      if (!dietPlan.member.phone) {
        return res.status(404).json({ error: 'Member has no phone number' });
      }

      const message = formatDietPlanMessage(dietPlan, dietPlan.member);
      await sendWhatsAppMessage(dietPlan.member.phone, message);

      res.json({ message: 'Diet plan sent via WhatsApp' });
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${dietPlan.title.replace(/[^a-z0-9]/gi, '_')}_diet_plan.pdf"`);
      res.send(pdfBuffer);
    }
  } catch (error) {
    console.error('Error sending diet plan:', error);
    res.status(500).json({ error: 'Failed to send diet plan' });
  }
});

// POST /api/send/member/:memberId/exercises-pdf - Generate and send member's exercises PDF
router.post('/member/:memberId/exercises-pdf', requireAdmin, async (req, res) => {
  try {
    const { sendVia } = req.body; // sendVia: 'download' or 'whatsapp'
    
    const member = await prisma.user.findUnique({
      where: { id: req.params.memberId },
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const memberExercises = await prisma.memberExercise.findMany({
      where: { memberId: req.params.memberId },
      include: { exercise: true },
    });

    const pdfBuffer = await generateMemberExercisesPDF(member, memberExercises);

    if (sendVia === 'download') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${member.name.replace(/[^a-z0-9]/gi, '_')}_exercises.pdf"`);
      res.send(pdfBuffer);
    } else if (sendVia === 'whatsapp') {
      if (!member.phone) {
        return res.status(404).json({ error: 'Member has no phone number' });
      }

      const message = formatMemberExercisesMessage(member, memberExercises);
      await sendWhatsAppMessage(member.phone, message);

      res.json({ message: 'Exercises sent via WhatsApp' });
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${member.name.replace(/[^a-z0-9]/gi, '_')}_exercises.pdf"`);
      res.send(pdfBuffer);
    }
  } catch (error) {
    console.error('Error sending member exercises:', error);
    res.status(500).json({ error: 'Failed to send member exercises' });
  }
});

module.exports = router;
