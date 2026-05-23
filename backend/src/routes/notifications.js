const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'gym_admin' && req.user.role !== 'super_admin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// GET /api/notifications - Get notifications for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        isRead: true,
        actionUrl: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.user.id,
        isRead: false,
      },
    });

    res.json({
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.user.id,
        isRead: false,
      },
    });

    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    res.json({ data: updated });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PATCH /api/notifications/mark-all-read - Mark all notifications as read
router.patch('/mark-all-read', authenticate, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.notification.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// POST /api/notifications/send - Send notification (admin only)
router.post('/send', authenticate, async (req, res) => {
  try {
    const { userIds, title, message, type, actionUrl } = req.body;

    // Allow admins and trainers to send notifications
    if (req.user.role !== 'admin' && req.user.role !== 'gym_admin' && req.user.role !== 'super_admin' && req.user.role !== 'trainer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    // If userIds is not provided, send to all members
    let targetUsers = [];
    if (userIds && userIds.length > 0) {
      targetUsers = await prisma.user.findMany({
        where: {
          id: { in: userIds },
          isActive: true,
        },
        select: { id: true },
      });
    } else {
      // Send to all active members
      targetUsers = await prisma.user.findMany({
        where: {
          role: 'member',
          isActive: true,
        },
        select: { id: true },
      });
    }

    // Create notifications for all target users
    const notifications = await prisma.notification.createMany({
      data: targetUsers.map((user) => ({
        userId: user.id,
        title,
        message,
        type: type || 'info',
        actionUrl,
        sentBy: req.user.id,
      })),
    });

    res.json({
      message: `Notification sent to ${notifications.count} users`,
      count: notifications.count,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

module.exports = router;
