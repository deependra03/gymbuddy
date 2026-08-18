const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { isConfigured, normalizeWebhookLog, normalizeWebhookUser, decryptAdmsPayload } = require('../lib/esslClient');
const {
  processEsslLogs,
  syncPunchLogs,
  syncUsersFromEssl,
  applyUserMappings,
  processEsslUsers,
  getLastSyncAt,
} = require('../lib/esslSync');

const router = express.Router();

const requireAttendanceAccess = (req, res, next) => {
  if (['admin', 'gym_admin', 'super_admin'].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admin or Gym Admin only.' });
  }
};

function verifyWebhookApiKey(req, res, next) {
  const expected = process.env.ESSL_WEBHOOK_SECRET;
  if (!expected) {
    return res.status(503).json({ error: 'ESSL webhook not configured' });
  }

  const provided = req.headers['x-api-key'] || req.headers['x-essl-api-key'];
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
}

function verifySyncApiKey(req, res, next) {
  const expected = process.env.ESSL_SYNC_API_KEY;
  if (!expected) {
    return res.status(503).json({ error: 'ESSL sync API key not configured' });
  }

  const provided = req.headers['x-api-key'] || req.headers['x-essl-sync-api-key'];
  console.log('Sync API Key Debug:', {
    expectedLength: expected.length,
    providedLength: provided?.length || 0,
    provided: provided ? `${provided.substring(0, 10)}...` : 'none',
    match: provided === expected
  });
  
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
}

// GET /api/essl/debug - Debug endpoint to check API key configuration
router.get('/debug', (req, res) => {
  res.json({
    syncApiKeyConfigured: Boolean(process.env.ESSL_SYNC_API_KEY),
    syncApiKeyLength: process.env.ESSL_SYNC_API_KEY?.length || 0,
    webhookSecretConfigured: Boolean(process.env.ESSL_WEBHOOK_SECRET),
  });
});

// POST /api/essl/webhook - Receive punch logs pushed from eBioServer (no JWT)
router.post(
  '/webhook',
  verifyWebhookApiKey,
  async (req, res) => {
    try {
      const logs = normalizeWebhookLog(req.body).filter(
        (l) => l.employeeCode && l.punchTime && !isNaN(l.punchTime.getTime())
      );

      if (logs.length === 0) {
        return res.status(400).json({ error: 'No valid punch logs in payload' });
      }

      const results = await processEsslLogs(logs);
      res.json({
        message: 'Webhook processed',
        logsReceived: logs.length,
        ...results,
      });
    } catch (err) {
      console.error('ESSL webhook error:', err);
      res.status(500).json({ error: err.message || 'Failed to process webhook' });
    }
  }
);

// POST /api/essl/webhook/users - Receive user data pushed from ADMS (no JWT)
router.post(
  '/webhook/users',
  verifyWebhookApiKey,
  async (req, res) => {
    try {
      let payload = req.body;

      if (payload.data && typeof payload.data === 'string') {
        const encryptionKey = process.env.ESSL_ADMS_ENCRYPTION_KEY;
        if (!encryptionKey) {
          return res.status(400).json({ error: 'Encrypted payload received but ESSL_ADMS_ENCRYPTION_KEY not configured' });
        }
        const decrypted = decryptAdmsPayload(payload.data, encryptionKey);
        if (!decrypted) {
          return res.status(400).json({ error: 'Failed to decrypt payload' });
        }
        try {
          payload = JSON.parse(decrypted);
        } catch (parseErr) {
          return res.status(400).json({ error: 'Failed to parse decrypted JSON' });
        }
      }

      const users = normalizeWebhookUser(payload).filter(
        (u) => u.employeeCode && u.name
      );

      if (users.length === 0) {
        return res.status(400).json({ error: 'No valid user data in payload' });
      }

      const results = await processEsslUsers(users);
      res.json({
        message: 'User webhook processed',
        usersReceived: users.length,
        ...results,
      });
    } catch (err) {
      console.error('ESSL user webhook error:', err);
      res.status(500).json({ error: err.message || 'Failed to process user webhook' });
    }
  }
);

// POST /api/essl/sync/json - Sync attendance from JSON file ( API key version)
router.post(
  '/sync/json',
  verifySyncApiKey,
  [
    body('records').isArray({ min: 1 }).withMessage('records array is required'),
    body('records.*.source').notEmpty().withMessage('source is required'),
    body('records.*.sourceId').notEmpty().withMessage('sourceId is required'),
    body('records.*.logDate').notEmpty().withMessage('logDate is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { records, generatedAt } = req.body;
      
      let created = 0;
      let updated = 0;
      let skipped = 0;
      let errors = [];

      for (const record of records) {
        try {
          // Skip if no employee data or no enroll number
          if (!record.employee || !record.employee.employeeCodeInDevice) {
            skipped++;
            continue;
          }

          const enrollNumber = parseInt(record.employee.employeeCodeInDevice);
          if (isNaN(enrollNumber)) {
            skipped++;
            continue;
          }

          // Find user by esslEnrollNumber
          const user = await prisma.user.findFirst({
            where: {
              esslEnrollNumber: enrollNumber,
              isActive: true,
            },
          });

          if (!user) {
            skipped++;
            continue;
          }

          // Dedup key: prefer canonicalId (shared with ADMS webhook path so
          // the same real-world punch arriving via both transports dedupes),
          // fall back to legacy sourceId for old records that don't have one.
          const dedupKey = record.canonicalId || record.sourceId;
          const existing = await prisma.attendance.findUnique({
            where: { externalLogId: dedupKey },
          });

          // Parse logDate
          const logDate = new Date(record.logDate);
          if (isNaN(logDate.getTime())) {
            errors.push(`Invalid logDate for record ${record.sourceId}`);
            skipped++;
            continue;
          }

          // Determine punch direction. eTimeTrackLite stores the actual direction
          // in column C1 ("in"/"out"); Direction is 0/1 and AttDirection is a
          // label, but in practice both can be empty. Treat C1 as authoritative
          // when present, otherwise fall back to the older fields.
          const c1 = (record.C1 || '').toString().trim().toLowerCase();
          let direction;
          if (c1 === 'out' || c1 === '1') direction = 'OUT';
          else if (c1 === 'in' || c1 === '0') direction = 'IN';
          else if (record.direction === 1 || record.attDirection === 'OUT') direction = 'OUT';
          else direction = 'IN';

          if (existing) {
            // Update existing record
            if (direction === 'OUT' && !existing.punchOutTime) {
              await prisma.attendance.update({
                where: { id: existing.id },
                data: {
                  punchOutTime: logDate,
                  durationMinutes: Math.round((logDate.getTime() - existing.punchInTime.getTime()) / 60000),
                  updatedAt: new Date(),
                },
              });
              updated++;
            } else {
              skipped++;
            }
          } else {
            // Create new attendance record
            if (direction === 'IN') {
              await prisma.attendance.create({
                data: {
                  userId: user.id,
                  gymId: user.gymId,
                  punchInTime: logDate,
                  method: 'essl',
                  externalLogId: record.sourceId,
                  deviceInfo: record.deviceId ? `Device ID: ${record.deviceId}` : null,
                  location: record.longitude && record.latitude 
                    ? `${record.latitude}, ${record.longitude}` 
                    : record.locationAddress || null,
                  notes: record.bodyTemperature ? `Temp: ${record.bodyTemperature}°C` : null,
                },
              });
              created++;
            } else {
              // OUT punch. If there's a recent open IN for this user, pair
              // them so durationMinutes reflects real time; otherwise create
              // a standalone OUT record (orphan).
              const openIn = await prisma.attendance.findFirst({
                where: {
                  userId: user.id,
                  punchOutTime: null,
                  punchInTime: { lte: logDate },
                },
                orderBy: { punchInTime: 'desc' },
              });

              if (openIn) {
                const duration = Math.round(
                  (logDate.getTime() - openIn.punchInTime.getTime()) / 60000
                );
                await prisma.attendance.update({
                  where: { id: openIn.id },
                  data: {
                    punchOutTime: logDate,
                    durationMinutes: duration,
                    externalLogId: openIn.externalLogId || record.sourceId,
                    updatedAt: new Date(),
                  },
                });
                updated++;
              } else {
                // No matching IN — keep the OUT as its own row for audit.
                await prisma.attendance.create({
                  data: {
                    userId: user.id,
                    gymId: user.gymId,
                    punchInTime: logDate,
                    punchOutTime: logDate,
                    durationMinutes: 0,
                    method: 'essl',
                    externalLogId: record.sourceId,
                    deviceInfo: record.deviceId ? `Device ID: ${record.deviceId}` : null,
                    location: record.longitude && record.latitude
                      ? `${record.latitude}, ${record.longitude}`
                      : record.locationAddress || null,
                    notes: 'Orphan punch-out record',
                  },
                });
                created++;
              }
            }
          }
        } catch (err) {
          console.error(`Error processing record ${dedupKey}:`, err);
          errors.push(`${dedupKey}: ${err.message}`);
        }
      }

      // Update sync state
      if (generatedAt) {
        await prisma.esslSyncState.upsert({
          where: { id: 'default' },
          update: { lastSyncAt: new Date(generatedAt) },
          create: { id: 'default', lastSyncAt: new Date(generatedAt) },
        });
      }

      res.json({
        message: 'ESSL JSON sync completed',
        summary: {
          total: records.length,
          created,
          updated,
          skipped,
          errors: errors.length,
        },
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (err) {
      console.error('ESSL JSON sync error:', err);
      res.status(500).json({ error: err.message || 'Failed to sync JSON data' });
    }
  }
);

router.use(authenticate);

// GET /api/essl/status - Sync status and configuration
router.get('/status', requireAttendanceAccess, async (req, res) => {
  try {
    const lastSyncAt = await getLastSyncAt();
    const mappedUsers = await prisma.user.count({
      where: { esslEnrollNumber: { not: null }, isActive: true },
    });
    const esslAttendance = await prisma.attendance.count({
      where: { method: 'essl' },
    });

    res.json({
      configured: isConfigured(),
      webhookConfigured: Boolean(process.env.ESSL_WEBHOOK_SECRET),
      lastSyncAt,
      mappedUsers,
      esslAttendanceRecords: esslAttendance,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ESSL status' });
  }
});

// POST /api/essl/sync - Pull punch logs from eBioServer API
router.post(
  '/sync',
  requireAttendanceAccess,
  [
    body('fromDate').optional().isISO8601(),
    body('toDate').optional().isISO8601(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!isConfigured()) {
      return res.status(503).json({
        error: 'ESSL API not configured. Set ESSL_API_URL, ESSL_API_USERNAME, ESSL_API_PASSWORD in backend .env',
      });
    }

    try {
      const results = await syncPunchLogs({
        fromDate: req.body.fromDate,
        toDate: req.body.toDate,
      });
      res.json({
        message: 'ESSL punch sync completed',
        ...results,
      });
    } catch (err) {
      console.error('ESSL sync error:', err);
      res.status(500).json({ error: err.message || 'Failed to sync punch logs' });
    }
  }
);

// GET /api/essl/users - Compare ESSL employees with GymBuddy members
router.get('/users', requireAttendanceAccess, async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({
      error: 'ESSL API not configured. Set ESSL_API_URL, ESSL_API_USERNAME, ESSL_API_PASSWORD in backend .env',
    });
  }

  try {
    const data = await syncUsersFromEssl();
    res.json(data);
  } catch (err) {
    console.error('ESSL user sync error:', err);
    res.status(500).json({ error: err.message || 'Failed to sync users from ESSL' });
  }
});

// POST /api/essl/users/map - Apply enroll number mappings
router.post(
  '/users/map',
  requireAttendanceAccess,
  [
    body('mappings').isArray({ min: 1 }).withMessage('mappings array is required'),
    body('mappings.*.memberId').notEmpty(),
    body('mappings.*.esslEnrollNumber').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const results = await applyUserMappings(req.body.mappings);
      res.json({ message: 'Mappings applied', results });
    } catch (err) {
      console.error('ESSL mapping error:', err);
      res.status(500).json({ error: err.message || 'Failed to apply mappings' });
    }
  }
);

module.exports = router;
