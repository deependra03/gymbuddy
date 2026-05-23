'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { membersApi, faceApi } from '@/lib/api';
import FaceScanner from '@/components/attendance/FaceScanner';
import {
  User, Phone, Mail, Scale, Ruler, Calendar, Target,
  LogOut, ChevronRight, Dumbbell, UtensilsCrossed, CreditCard, ScanFace,
} from 'lucide-react';
import { formatCurrency, formatDate, formatMembershipDurationLabel, getInitials } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function MemberProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [faceScannerOpen, setFaceScannerOpen] = useState(false);
  const [faceEnrolling, setFaceEnrolling] = useState(false);

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

  const handleFaceEnroll = async (descriptor: number[]) => {
    setFaceScannerOpen(false);
    setFaceEnrolling(true);
    try {
      await faceApi.enroll(descriptor);
      setProfile((p: any) => (p ? { ...p, faceEnrolled: true } : p));
      toast.success('Face enrolled successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to enroll face');
    } finally {
      setFaceEnrolling(false);
    }
  };

  const handleRemoveFace = async () => {
    if (!confirm('Remove your enrolled face? You will need to enroll again for face check-in.')) return;
    try {
      await faceApi.remove();
      setProfile((p: any) => (p ? { ...p, faceEnrolled: false } : p));
      toast.success('Face enrollment removed');
    } catch {
      toast.error('Failed to remove face enrollment');
    }
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
                label: 'Plan dates',
                value: `${profile.membershipStart ? formatDate(profile.membershipStart) : '—'} → ${profile.membershipEnd ? formatDate(profile.membershipEnd) : '—'}`,
              },
            ]
          : []),
        ...(formatMembershipDurationLabel(profile.membershipDurationMonths)
          ? [
              {
                icon: Calendar,
                label: 'Plan length',
                value: formatMembershipDurationLabel(profile.membershipDurationMonths) as string,
              },
            ]
          : []),
        ...(profile.planAccess && profile.planAccess !== 'none'
          ? [
              {
                icon: Calendar,
                label: 'Plan access',
                value:
                  profile.planAccess === 'upcoming'
                    ? `Not started — begins ${profile.membershipStart ? formatDate(profile.membershipStart) : '—'}`
                    : profile.planAccess === 'expired'
                      ? 'Ended — contact gym to renew'
                      : 'Active (trainer content unlocked)',
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
            <div className="w-24 h-24 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            <div className="h-5 w-36 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
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
                <span className="text-3xl font-black text-brand-600 dark:text-brand-400">
                  {getInitials(profile?.name || user?.name || 'U')}
                </span>
              </div>
            )}
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-4">{profile?.name || user?.name}</h1>
            <span className="inline-block mt-1.5 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-semibold border border-brand-500/20">
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
              <p className="font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
              <p className="text-[11px] text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Info List */}
      {!loading && (
        <div className="card divide-y divide-zinc-200 dark:divide-zinc-800 p-0 overflow-hidden">
          {infoRows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 px-5 py-4">
              <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-zinc-500">{label}</p>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Face enrollment */}
      {!loading && (
        <div className="card">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
              <ScanFace className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Face Recognition</p>
              <p className="text-xs text-zinc-500 mt-1">
                {profile?.faceEnrolled
                  ? 'Your face is enrolled for attendance check-in.'
                  : 'Enroll your face to use face recognition on the Attendance page.'}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setFaceScannerOpen(true)}
                  disabled={faceEnrolling}
                  className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium disabled:opacity-50"
                >
                  {profile?.faceEnrolled ? 'Re-enroll Face' : 'Enroll Face'}
                </button>
                {profile?.faceEnrolled && (
                  <button
                    type="button"
                    onClick={handleRemoveFace}
                    className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <FaceScanner
        open={faceScannerOpen}
        mode="enroll"
        title="Enroll Your Face"
        subtitle="Capture 3 samples for better accuracy"
        samplesRequired={3}
        onCapture={handleFaceEnroll}
        onClose={() => setFaceScannerOpen(false)}
      />

      {/* Quick actions */}
      <div className="space-y-2">
        <Link href="/exercises" className="card flex items-center gap-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
            <Dumbbell className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Exercise Library</p>
            <p className="text-xs text-zinc-500">Browse all public exercises</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-600" />
        </Link>
        <Link href="/gallery" className="card flex items-center gap-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
            <UtensilsCrossed className="w-5 h-5 text-orange-500 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Recipe Gallery</p>
            <p className="text-xs text-zinc-500">Healthy recipes & diet tips</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-600" />
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
