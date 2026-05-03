'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { membersApi } from '@/lib/api';
import {
  Flame, Dumbbell, UtensilsCrossed, ChevronRight, Target, Scale,
  Ruler, Calendar, ListChecks, TrendingUp, CreditCard,
} from 'lucide-react';
import { formatCurrency, formatDate, getBadgeClass } from '@/lib/utils';

export default function MemberDashboard() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    membersApi.get(user.id)
      .then((r) => setProfile(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const assignedExercises = profile?.assignedExercises ?? [];
  const latestDiet = profile?.dietPlans?.[0] ?? null;
  const membershipEnd = profile?.membershipEnd ? new Date(profile.membershipEnd) : null;
  const membershipActive =
    membershipEnd && !Number.isNaN(membershipEnd.getTime())
      ? membershipEnd.getTime() >= new Date().setHours(0, 0, 0, 0)
      : null;

  const quickStats = [
    { label: 'Age', value: profile?.age ? `${profile.age} yrs` : '—', icon: Calendar },
    { label: 'Weight', value: profile?.weight ? `${profile.weight} kg` : '—', icon: Scale },
    { label: 'Height', value: profile?.height ? `${profile.height} cm` : '—', icon: Ruler },
    { label: 'Exercises', value: assignedExercises.length, icon: ListChecks },
  ];

  return (
    <div className="page-container space-y-6">
      {/* Greeting Banner */}
      <div className="relative rounded-2xl bg-gradient-to-br from-brand-600 via-brand-500 to-orange-400 p-6 overflow-hidden">
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -right-2 -bottom-8 w-24 h-24 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-orange-100 text-sm font-medium">{greeting},</p>
          <h1 className="text-2xl font-black text-white mt-0.5">{user?.name} 💪</h1>
          {profile?.goal && (
            <div className="flex items-center gap-1.5 mt-3">
              <Target className="w-3.5 h-3.5 text-orange-200" />
              <p className="text-orange-100 text-xs">{profile.goal}</p>
            </div>
          )}
          <p className="text-orange-200/70 text-xs mt-1">
            Member since {profile ? formatDate(profile.joinDate) : '—'}
          </p>
        </div>
      </div>

      {!loading &&
        (profile?.membershipStart ||
          profile?.membershipEnd ||
          profile?.membershipPurchasePrice != null) && (
          <div
            className={`rounded-2xl border p-4 ${
              membershipActive === false
                ? 'border-amber-500/30 bg-amber-500/5'
                : 'border-zinc-800 bg-zinc-900/50'
            }`}
          >
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> Membership
            </p>
            <p className="text-sm text-zinc-200">
              {profile.membershipStart ? formatDate(profile.membershipStart) : '—'} —{' '}
              {profile.membershipEnd ? formatDate(profile.membershipEnd) : '—'}
            </p>
            {profile.membershipPurchasePrice != null && (
              <p className="text-sm text-brand-400 mt-1 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                {formatCurrency(profile.membershipPurchasePrice)}
              </p>
            )}
            {membershipActive === false && (
              <p className="text-xs text-amber-400 mt-2">Your membership period has ended. Contact the gym to renew.</p>
            )}
          </div>
        )}

      {/* Quick Stats */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-20 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {quickStats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="card flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">{label}</p>
                <p className="font-bold text-zinc-100">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Today's Exercises */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-zinc-100 flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-brand-400" /> Your Workout
          </h2>
          <Link href="/member/exercises" className="text-xs text-brand-400 flex items-center gap-1">
            View all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="card h-16 animate-pulse" />)}
          </div>
        ) : assignedExercises.length === 0 ? (
          <div className="card text-center py-8">
            <Dumbbell className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
            <p className="text-zinc-400 text-sm">No exercises assigned yet</p>
            <p className="text-zinc-600 text-xs mt-1">Your trainer will assign exercises soon</p>
          </div>
        ) : (
          <div className="space-y-2">
            {assignedExercises.slice(0, 3).map((ae: any) => (
              <Link
                key={ae.id}
                href="/member/exercises"
                className="card flex items-center gap-4 hover:border-zinc-700 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden shrink-0">
                  {ae.exercise.thumbnailUrl ? (
                    <img src={ae.exercise.thumbnailUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-zinc-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-100 text-sm truncate">{ae.exercise.title}</p>
                  <p className="text-xs text-zinc-500 truncate">{ae.notes || ae.exercise.focusArea}</p>
                </div>
                <span className={getBadgeClass(ae.exercise.level)}>{ae.exercise.level}</span>
              </Link>
            ))}
            {assignedExercises.length > 3 && (
              <Link
                href="/member/exercises"
                className="block text-center text-xs text-brand-400 py-2 hover:text-brand-300"
              >
                +{assignedExercises.length - 3} more exercises
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Diet Plan Preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-zinc-100 flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-brand-400" /> Diet Plan
          </h2>
          <Link href="/member/diet" className="text-xs text-brand-400 flex items-center gap-1">
            View full <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="card h-28 animate-pulse" />
        ) : !latestDiet ? (
          <div className="card text-center py-8">
            <UtensilsCrossed className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
            <p className="text-zinc-400 text-sm">No diet plan assigned yet</p>
          </div>
        ) : (
          <Link href="/member/diet" className="card block hover:border-zinc-700 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-zinc-100">{latestDiet.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{formatDate(latestDiet.createdAt)}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
            </div>
            {(() => {
              try {
                const parsed = JSON.parse(latestDiet.content);
                if (parsed.totalCalories) {
                  return (
                    <div className="flex gap-4 mt-3 pt-3 border-t border-zinc-800">
                      {[
                        { label: 'Calories', value: `${parsed.totalCalories} kcal` },
                        { label: 'Protein', value: parsed.protein || '—' },
                        { label: 'Carbs', value: parsed.carbs || '—' },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-[10px] text-zinc-500">{label}</p>
                          <p className="text-xs font-semibold text-brand-400">{value}</p>
                        </div>
                      ))}
                    </div>
                  );
                }
              } catch {}
              return null;
            })()}
          </Link>
        )}
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="font-bold text-zinc-100 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-400" /> Explore
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/exercises"
            className="card flex flex-col items-center py-5 gap-2 hover:border-zinc-700 transition-colors text-center"
          >
            <div className="w-11 h-11 rounded-xl bg-brand-500/10 flex items-center justify-center">
              <ListChecks className="w-5 h-5 text-brand-400" />
            </div>
            <span className="text-sm font-medium text-zinc-300">Exercise Library</span>
            <span className="text-[10px] text-zinc-600">Browse all exercises</span>
          </Link>
          <Link
            href="/gallery"
            className="card flex flex-col items-center py-5 gap-2 hover:border-zinc-700 transition-colors text-center"
          >
            <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-sm font-medium text-zinc-300">Diet Gallery</span>
            <span className="text-[10px] text-zinc-600">Recipes & tips</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
