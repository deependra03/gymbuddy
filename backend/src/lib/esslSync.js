const prisma = require('./prisma');
const { getEmployeePunchLogs, getEmployeeDetails } = require('./esslClient');

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function parseDirection(direction) {
  if (direction === null || direction === undefined || direction === '') return null;
  const val = String(direction).toLowerCase();
  if (val === '0' || val === 'in' || val === 'checkin' || val === 'check-in' || val === 'punch-in') {
    return 'punch-in';
  }
  if (val === '1' || val === 'out' || val === 'checkout' || val === 'check-out' || val === 'punch-out') {
    return 'punch-out';
  }
  return null;
}

async function findUserByEnrollNumber(employeeCode) {
  const enrollNumber = parseInt(employeeCode, 10);
  if (Number.isNaN(enrollNumber)) return null;

  return prisma.user.findFirst({
    where: { esslEnrollNumber: enrollNumber, isActive: true },
    select: { id: true, name: true, gymId: true, esslEnrollNumber: true },
  });
}

async function findOpenAttendance(userId, punchTime) {
  const dayStart = startOfDay(punchTime);
  const dayEnd = endOfDay(punchTime);

  return prisma.attendance.findFirst({
    where: {
      userId,
      punchInTime: { gte: dayStart, lte: dayEnd },
      punchOutTime: null,
    },
    orderBy: { punchInTime: 'desc' },
  });
}

async function processEsslLog(log) {
  const { employeeCode, punchTime, deviceSerial, direction, externalLogId } = log;

  if (!employeeCode || !punchTime || isNaN(punchTime.getTime())) {
    return { status: 'skipped', reason: 'invalid_log', log };
  }

  if (externalLogId) {
    const duplicate = await prisma.attendance.findUnique({
      where: { externalLogId },
    });
    if (duplicate) {
      return { status: 'skipped', reason: 'duplicate', externalLogId };
    }
  }

  const user = await findUserByEnrollNumber(employeeCode);
  if (!user) {
    return { status: 'skipped', reason: 'unmapped_user', employeeCode };
  }

  const explicitAction = parseDirection(direction);
  let action = explicitAction;

  if (!action) {
    const open = await findOpenAttendance(user.id, punchTime);
    action = open ? 'punch-out' : 'punch-in';
  }

  const deviceInfo = deviceSerial ? `ESSL:${deviceSerial}` : 'ESSL';

  if (action === 'punch-in') {
    const open = await findOpenAttendance(user.id, punchTime);
    if (open) {
      return { status: 'skipped', reason: 'already_punched_in', userId: user.id, employeeCode };
    }

    const attendance = await prisma.attendance.create({
      data: {
        userId: user.id,
        gymId: user.gymId,
        punchInTime: punchTime,
        method: 'essl',
        deviceInfo,
        externalLogId: externalLogId || undefined,
        notes: 'Synced from ESSL biometric device',
      },
      include: {
        user: { select: { id: true, name: true, phone: true } },
      },
    });

    return { status: 'punch-in', action: 'punch-in', attendance, user };
  }

  const open = await findOpenAttendance(user.id, punchTime);
  if (!open) {
    return { status: 'skipped', reason: 'no_open_session', userId: user.id, employeeCode };
  }

  const durationMinutes = Math.max(
    0,
    Math.floor((punchTime - new Date(open.punchInTime)) / (1000 * 60))
  );

  const attendance = await prisma.attendance.update({
    where: { id: open.id },
    data: {
      punchOutTime: punchTime,
      durationMinutes,
      deviceInfo: open.deviceInfo || deviceInfo,
      notes: open.notes || 'Synced from ESSL biometric device',
    },
    include: {
      user: { select: { id: true, name: true, phone: true } },
    },
  });

  return { status: 'punch-out', action: 'punch-out', attendance, user };
}

async function processEsslLogs(logs) {
  const sorted = [...logs].sort(
    (a, b) => new Date(a.punchTime) - new Date(b.punchTime)
  );

  const results = {
    processed: 0,
    punchIn: 0,
    punchOut: 0,
    skipped: 0,
    errors: [],
    details: [],
  };

  for (const log of sorted) {
    try {
      const result = await processEsslLog(log);
      results.details.push(result);

      if (result.status === 'punch-in') {
        results.processed += 1;
        results.punchIn += 1;
      } else if (result.status === 'punch-out') {
        results.processed += 1;
        results.punchOut += 1;
      } else {
        results.skipped += 1;
      }
    } catch (err) {
      results.errors.push({ log, error: err.message });
    }
  }

  return results;
}

async function getLastSyncAt() {
  const state = await prisma.esslSyncState.findUnique({ where: { id: 'default' } });
  return state?.lastSyncAt || null;
}

async function updateLastSyncAt(date = new Date()) {
  return prisma.esslSyncState.upsert({
    where: { id: 'default' },
    create: { id: 'default', lastSyncAt: date },
    update: { lastSyncAt: date },
  });
}

async function syncPunchLogs({ fromDate, toDate } = {}) {
  const lastSync = await getLastSyncAt();
  const from = fromDate
    ? new Date(fromDate)
    : lastSync
      ? new Date(lastSync.getTime() - 5 * 60 * 1000)
      : startOfDay(new Date());
  const to = toDate ? new Date(toDate) : new Date();

  const logs = await getEmployeePunchLogs(from, to);
  const results = await processEsslLogs(logs);

  if (logs.length > 0) {
    const latest = logs.reduce(
      (max, log) => (log.punchTime > max ? log.punchTime : max),
      logs[0].punchTime
    );
    await updateLastSyncAt(latest);
  } else {
    await updateLastSyncAt(to);
  }

  return {
    ...results,
    fromDate: from.toISOString(),
    toDate: to.toISOString(),
    logsFetched: logs.length,
  };
}

async function syncUsersFromEssl() {
  const esslEmployees = await getEmployeeDetails();

  const members = await prisma.user.findMany({
    where: { role: 'member', isActive: true },
    select: {
      id: true,
      name: true,
      phone: true,
      esslEnrollNumber: true,
    },
  });

  const mapped = [];
  const unmappedEssl = [];
  const suggestions = [];

  for (const essl of esslEmployees) {
    const enrollNumber = parseInt(essl.employeeCode, 10);
    if (Number.isNaN(enrollNumber)) continue;

    const existing = members.find((m) => m.esslEnrollNumber === enrollNumber);
    if (existing) {
      mapped.push({
        essl,
        member: existing,
        status: 'mapped',
      });
      continue;
    }

    const phoneMatch = essl.phone
      ? members.find((m) => m.phone.replace(/\D/g, '') === essl.phone.replace(/\D/g, ''))
      : null;

    const nameMatch = essl.name
      ? members.find(
          (m) => m.name.toLowerCase().trim() === essl.name.toLowerCase().trim()
        )
      : null;

    const suggestion = phoneMatch || nameMatch;
    if (suggestion) {
      suggestions.push({
        essl,
        suggestedMember: suggestion,
        matchType: phoneMatch ? 'phone' : 'name',
      });
    } else {
      unmappedEssl.push(essl);
    }
  }

  const unmappedMembers = members.filter((m) => !m.esslEnrollNumber);

  return {
    esslTotal: esslEmployees.length,
    mappedCount: mapped.length,
    suggestionCount: suggestions.length,
    unmappedEsslCount: unmappedEssl.length,
    unmappedMembersCount: unmappedMembers.length,
    mapped,
    suggestions,
    unmappedEssl,
    unmappedMembers,
  };
}

async function applyUserMappings(mappings) {
  const results = [];

  for (const { memberId, esslEnrollNumber } of mappings) {
    const enrollNumber = parseInt(esslEnrollNumber, 10);
    if (!memberId || Number.isNaN(enrollNumber)) {
      results.push({ memberId, esslEnrollNumber, status: 'invalid' });
      continue;
    }

    const conflict = await prisma.user.findFirst({
      where: {
        esslEnrollNumber: enrollNumber,
        NOT: { id: memberId },
      },
    });

    if (conflict) {
      results.push({
        memberId,
        esslEnrollNumber: enrollNumber,
        status: 'conflict',
        conflictWith: conflict.name,
      });
      continue;
    }

    const updated = await prisma.user.update({
      where: { id: memberId },
      data: { esslEnrollNumber: enrollNumber },
      select: { id: true, name: true, phone: true, esslEnrollNumber: true },
    });

    results.push({ ...updated, status: 'mapped' });
  }

  return results;
}

async function processEsslUser(user) {
  const { employeeCode, name, phone, email, cardNumber, department, designation } = user;

  if (!employeeCode || !name) {
    return { status: 'skipped', reason: 'invalid_user_data', user };
  }

  const enrollNumber = parseInt(employeeCode, 10);
  if (Number.isNaN(enrollNumber)) {
    return { status: 'skipped', reason: 'invalid_enroll_number', employeeCode };
  }

  const existing = await prisma.user.findFirst({
    where: { esslEnrollNumber: enrollNumber },
  });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: name || existing.name,
        phone: phone || existing.phone,
        email: email || existing.email,
      },
    });
    return { status: 'updated', user: updated, employeeCode };
  }

  const phoneMatch = phone
    ? await prisma.user.findFirst({
        where: { phone: phone.replace(/\D/g, '') },
      })
    : null;

  if (phoneMatch) {
    const updated = await prisma.user.update({
      where: { id: phoneMatch.id },
      data: {
        esslEnrollNumber: enrollNumber,
        name: name || phoneMatch.name,
      },
    });
    return { status: 'mapped_by_phone', user: updated, employeeCode };
  }

  const newUser = await prisma.user.create({
    data: {
      name,
      phone: phone || null,
      email: email || null,
      esslEnrollNumber: enrollNumber,
      role: 'member',
      passwordHash: 'CHANGE_ME_ON_FIRST_LOGIN',
      isActive: true,
    },
  });

  return { status: 'created', user: newUser, employeeCode };
}

async function processEsslUsers(users) {
  const results = {
    processed: 0,
    created: 0,
    updated: 0,
    mapped: 0,
    skipped: 0,
    errors: [],
    details: [],
  };

  for (const user of users) {
    try {
      const result = await processEsslUser(user);
      results.details.push(result);

      if (result.status === 'created') {
        results.processed += 1;
        results.created += 1;
      } else if (result.status === 'updated') {
        results.processed += 1;
        results.updated += 1;
      } else if (result.status === 'mapped_by_phone') {
        results.processed += 1;
        results.mapped += 1;
      } else {
        results.skipped += 1;
      }
    } catch (err) {
      results.errors.push({ user, error: err.message });
    }
  }

  return results;
}

module.exports = {
  processEsslLog,
  processEsslLogs,
  processEsslUser,
  processEsslUsers,
  syncPunchLogs,
  syncUsersFromEssl,
  applyUserMappings,
  getLastSyncAt,
  updateLastSyncAt,
};
