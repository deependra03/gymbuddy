const DESCRIPTOR_LENGTH = 128;
const DEFAULT_THRESHOLD = 0.6;

function parseDescriptor(raw) {
  if (!raw) return null;
  let arr;
  try {
    arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
  if (!Array.isArray(arr) || arr.length !== DESCRIPTOR_LENGTH) return null;
  if (!arr.every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  return arr;
}

function euclideanDistance(a, b) {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function isMatch(descriptor, stored, threshold = DEFAULT_THRESHOLD) {
  const a = parseDescriptor(descriptor);
  const b = parseDescriptor(stored);
  if (!a || !b) return false;
  return euclideanDistance(a, b) < threshold;
}

function findBestMatch(descriptor, users, threshold = DEFAULT_THRESHOLD) {
  const probe = parseDescriptor(descriptor);
  if (!probe) return null;

  let best = null;
  let secondBestDistance = Infinity;

  for (const user of users) {
    const stored = parseDescriptor(user.faceDescriptor);
    if (!stored) continue;

    const distance = euclideanDistance(probe, stored);
    if (distance >= threshold) continue;

    if (!best || distance < best.distance) {
      if (best) secondBestDistance = best.distance;
      best = { user, distance };
    } else if (distance < secondBestDistance) {
      secondBestDistance = distance;
    }
  }

  if (!best) return null;

  // Reject ambiguous matches (two faces similarly close)
  if (secondBestDistance < threshold && best.distance / secondBestDistance > 0.85) {
    return { ambiguous: true };
  }

  return best;
}

module.exports = {
  DESCRIPTOR_LENGTH,
  DEFAULT_THRESHOLD,
  parseDescriptor,
  euclideanDistance,
  isMatch,
  findBestMatch,
};
