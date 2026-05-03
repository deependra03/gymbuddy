/**
 * Membership window vs "join date" is independent: plan may start in the future.
 * @param {{ membershipStart: Date | null, membershipEnd: Date | null }} row
 * @returns {'none' | 'upcoming' | 'active' | 'expired'}
 */
function getMembershipEntitlement(row) {
  const start = row.membershipStart;
  const end = row.membershipEnd;
  if (!start && !end) return 'none';

  const today = startOfLocalDay(new Date());
  const startT = start ? startOfLocalDay(start) : null;
  const endT = end ? startOfLocalDay(end) : null;

  if (startT != null && today < startT) return 'upcoming';
  if (endT != null && today > endT) return 'expired';
  return 'active';
}

function startOfLocalDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

module.exports = { getMembershipEntitlement };
