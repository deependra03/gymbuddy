'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import {
  Dumbbell, Users, ListChecks, UtensilsCrossed, Image, LogOut, ChevronRight, Fingerprint, DollarSign, Calendar, Award, MoreVertical, X, Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import NotificationsPanel from '@/components/shared/NotificationsPanel';

const mainNavItems = [
  { href: '/admin/members', label: 'Members', icon: Users },
  { href: '/admin/trainers', label: 'Trainers', icon: Award },
  { href: '/admin/attendance', label: 'Attendance', icon: Fingerprint },
  { href: '/admin/payroll', label: 'Payroll', icon: DollarSign },
  { href: '/admin/training-sessions', label: 'Sessions', icon: Calendar },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
];

const moreNavItems = [
  { href: '/admin/exercises', label: 'Exercises', icon: ListChecks },
  { href: '/admin/diet-plans', label: 'Diet Plans', icon: UtensilsCrossed },
  { href: '/admin/gallery', label: 'Gallery', icon: Image },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, initFromStorage, isLoading } = useAuthStore();
  const redirectRef = useRef(false);

  useEffect(() => {
    initFromStorage();
  }, []);

  useEffect(() => {
    if (!isLoading && !redirectRef.current) {
      if (!user) {
        redirectRef.current = true;
        router.replace('/auth/login');
      } else if (user.role !== 'admin' && user.role !== 'gym_admin' && user.role !== 'super_admin') {
        redirectRef.current = true;
        router.replace('/member/dashboard');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  const handleLogout = () => {
    logout();
    router.replace('/auth/login');
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col shrink-0 fixed inset-y-0 left-0 z-40 hidden lg:flex">
        {/* Logo */}
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-black text-zinc-900 dark:text-white text-lg leading-none">GymBuddy</p>
              <p className="text-xs text-zinc-500 mt-0.5">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {[...mainNavItems, ...moreNavItems].map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                  active
                    ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {label}
                {active && <ChevronRight className="w-4 h-4 ml-auto text-brand-500" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="flex items-center gap-2 px-1">
            <ThemeToggle />
            <NotificationsPanel />
            <span className="text-xs text-zinc-500 dark:text-zinc-500">Theme</span>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 text-xs font-bold">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{user.name}</p>
              <p className="text-xs text-zinc-500 capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-600 hover:bg-red-500/10 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-zinc-900 dark:text-white">GymBuddy</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button onClick={handleLogout} className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 p-2">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex">
        {mainNavItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[10px] font-medium transition-colors',
                active ? 'text-brand-600 dark:text-brand-400' : 'text-zinc-500'
              )}
            >
              <Icon className={cn('w-5 h-5', active && 'text-brand-600 dark:text-brand-400')} />
              {label}
            </Link>
          );
        })}
        <button
          onClick={() => setShowMoreMenu(true)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[10px] font-medium transition-colors',
            moreNavItems.some(item => pathname.startsWith(item.href)) ? 'text-brand-600 dark:text-brand-400' : 'text-zinc-500'
          )}
        >
          <MoreVertical className={cn('w-5 h-5', moreNavItems.some(item => pathname.startsWith(item.href)) && 'text-brand-600 dark:text-brand-400')} />
          More
        </button>
      </nav>

      {/* Mobile more menu */}
      {showMoreMenu && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="bg-white dark:bg-zinc-900 w-full rounded-t-3xl max-h-[70vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-zinc-900 px-4 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">More Options</h3>
              <button onClick={() => setShowMoreMenu(false)} className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2">
              {moreNavItems.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setShowMoreMenu(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                      active
                        ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                        : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64 min-h-screen">
        <div className="pt-14 lg:pt-0 pb-20 lg:pb-0">
          {children}
        </div>
      </main>
    </div>
  );
}
