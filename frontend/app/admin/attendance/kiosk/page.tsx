'use client';

import { useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { attendanceApi } from '@/lib/api';
import FaceAutoKiosk, { MEMBER_COOLDOWN_MS } from '@/components/attendance/FaceAutoKiosk';
import toast from 'react-hot-toast';

const ADMIN_ROLES = ['admin', 'gym_admin', 'super_admin'];

export default function AttendanceKioskPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const cooldownRef = useRef<Map<string, number>>(new Map());

  const handleDetect = useCallback(async (descriptor: number[]) => {
    const now = Date.now();
    for (const [id, ts] of cooldownRef.current.entries()) {
      if (now - ts > MEMBER_COOLDOWN_MS) cooldownRef.current.delete(id);
    }

    try {
      const res = await attendanceApi.faceKiosk({
        descriptor,
        deviceInfo: navigator.userAgent,
      });
      const { matchedMember, action } = res.data;
      const memberId = matchedMember.id;

      const last = cooldownRef.current.get(memberId) ?? 0;
      if (now - last < MEMBER_COOLDOWN_MS) {
        return { success: true, skipped: true, memberId };
      }
      cooldownRef.current.set(memberId, now);

      toast.success(
        `${matchedMember.name} — ${action === 'punch-in' ? 'checked in' : 'checked out'}`,
        { id: `kiosk-${memberId}` }
      );

      return {
        success: true,
        memberId,
        memberName: matchedMember.name,
        action: action as 'punch-in' | 'punch-out',
      };
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Recognition failed';
      if (err.response?.status !== 403) {
        toast.error(msg, { id: 'kiosk-error' });
      }
      return { success: false, error: msg };
    }
  }, []);

  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        Access denied
      </div>
    );
  }

  return (
    <FaceAutoKiosk
      active
      fullscreen
      onDetect={handleDetect}
      onClose={() => router.push('/admin/attendance')}
    />
  );
}
