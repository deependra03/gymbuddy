import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getYouTubeEmbedUrl(url: string): string {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11
    ? `https://www.youtube.com/embed/${match[2]}`
    : url;
}

export function isYouTubeUrl(url: string): boolean {
  return /youtube|youtu\.be/.test(url);
}

export const EXERCISE_CATEGORIES = [
  'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Full Body', 'Flexibility',
];

export const FOCUS_AREAS = ['Strength', 'Endurance', 'Flexibility', 'Balance', 'Power', 'Hypertrophy'];

export const LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** YYYY-MM-DD for date inputs from API ISO strings (local calendar day) */
export function toDateInputValue(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Inclusive plan end: start date + N calendar months, minus one day (local). */
export function addMonthsToPlanEnd(startYmd: string, months: number): string {
  const parts = startYmd.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return '';
  const [y, mo, d] = parts;
  const end = new Date(y, mo - 1 + months, d);
  end.setDate(end.getDate() - 1);
  return toDateInputValue(end);
}

export function formatMembershipDurationLabel(months: number | null | undefined): string | null {
  if (months == null || Number.isNaN(months)) return null;
  if (months === 24) return '2 years';
  if (months === 12) return '12 months (1 year)';
  if (months === 1) return '1 month';
  return `${months} months`;
}

export type PlanAccess = 'none' | 'upcoming' | 'active' | 'expired';

export function getBadgeClass(level: string): string {
  switch (level) {
    case 'beginner': return 'badge badge-beginner';
    case 'intermediate': return 'badge badge-intermediate';
    case 'advanced': return 'badge badge-advanced';
    default: return 'badge bg-zinc-800 text-zinc-300';
  }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
