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
