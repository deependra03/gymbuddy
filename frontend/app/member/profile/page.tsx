'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { membersApi } from '@/lib/api';
import {
  User, Phone, Mail, Scale, Ruler, Calendar, Target,
  LogOut, ChevronRight, Dumbbell, UtensilsCrossed, CreditCard,
} from 'lucide-react';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function MemberProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    membersApi
      .get(user.id)
      .then((r) => setProfile(r.data))
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [user]);

  const handleLogout = () => {
    logout();
    router.replace('/auth/login');
  };

  const infoRows = profile
    ? [
        { icon: Phone, label: 'Phone', value: profile.phone },
        { icon: Mail, label: 'Email', value: profile.email || '—' },
        { icon: Calendar, label: 'Age', value: profile.age ? `${profile.age} years` : '—' },
        { icon: Scale, label: 'Weight', value: profile.weight ? `${profile.weight} kg` : '—' },
        { icon: Ruler, label: 'Height', value: profile.height ? `${profile.height} cm` : '—' },
        { icon: Target, label: 'Goal', value: profile.goal || '—' },
        { icon: Calendar, label: 'Member since', value: formatDate(profile.joinDate) },
        ...(profile.membershipStart || profile.membershipEnd
          ? [
              {
                icon: Calendar,
                label: 'Membership',
                value: `${profile.membershipStart ? formatDate(profile.membershipStart) : '—'} → ${profile.membershipEnd ? formatDate(profile.membershipEnd) : '—'}`,
              },
            ]
          : []),
        ...(profile.membershipPurchasePrice != null
          ? [
              {
                icon: CreditCard,
                label: 'Membership paid',
                value: formatCurrency(profile.membershipPurchasePrice),
              },
            ]
          : []),
      ]
    : [];

  return (
    <div className="page-container space-y-6">
      {/* Profile Card */}
      <div className="card text-center py-8">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-full bg-zinc-800 animate-pulse" />
            <div className="h-5 w-36 bg-zinc-800 rounded animate-pulse" />
            <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
          </div>
        ) : (
          <>
            {profile?.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={profile.name}
                className="w-24 h-24 rounded-full object-cover mx-auto ring-4 ring-brand-500/20"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-500/20 to-brand-700/20 flex items-center justify-center mx-auto ring-4 ring-brand-500/10">
                <span className="text-3xl font-black text-brand-400">
                  {getInitials(profile?.name || user?.name || 'U')}
                </span>
              </div>
            )}
            <h1 className="text-xl font-bold text-zinc-100 mt-4">{profile?.name || user?.name}</h1>
            <span className="inline-block mt-1.5 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs font-semibold border border-brand-500/20">
              Member
            </span>
            {profile?.goal && (
              <p className="text-sm text-zinc-500 mt-3 max-w-xs mx-auto">{profile.goal}</p>
            )}
          </>
        )}
      </div>

      {/* Stats Row */}
      {!loading && profile && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Exercises', value: profile.assignedExercises?.length ?? 0, emoji: '💪' },
            { label: 'Diet Plans', value: profile.dietPlans?.length ?? 0, emoji: '🥗' },
            { label: 'Active', value: profile.isActive ? 'Yes' : 'No', emoji: '✅' },
          ].map(({ label, value, emoji }) => (
            <div key={label} className="card text-center py-4">
              <p className="text-2xl mb-1">{emoji}</p>
              <p className="font-bold text-zinc-100">{value}</p>
              <p className="text-[11px] text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Info List */}
      {!loading && (
        <div className="card divide-y divide-zinc-800 p-0 overflow-hidden">
          {infoRows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 px-5 py-4">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-zinc-500">{label}</p>
                <p className="text-sm font-medium text-zinc-200 truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="space-y-2">
        <Link href="/exercises" className="card flex items-center gap-4 hover:border-zinc-700 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
            <Dumbbell className="w-5 h-5 text-brand-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-zinc-200">Exercise Library</p>
            <p className="text-xs text-zinc-500">Browse all public exercises</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-600" />
        </Link>
        <Link href="/gallery" className="card flex items-center gap-4 hover:border-zinc-700 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
            <UtensilsCrossed className="w-5 h-5 text-orange-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-zinc-200">Recipe Gallery</p>
            <p className="text-xs text-zinc-500">Healthy recipes & diet tips</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-600" />
        </Link>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full btn-danger py-3"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
}
