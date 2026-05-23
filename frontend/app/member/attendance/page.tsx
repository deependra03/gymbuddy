'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { attendanceApi, faceApi } from '@/lib/api';
import FaceScanner from '@/components/attendance/FaceScanner';
import {
  Clock,
  MapPin,
  Fingerprint,
  LogIn,
  LogOut,
  CheckCircle2,
  XCircle,
  ScanFace,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function AttendancePage() {
  const { user } = useAuthStore();
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [faceEnrolled, setFaceEnrolled] = useState<boolean | null>(null);
  const [faceScannerOpen, setFaceScannerOpen] = useState(false);
  const [faceAction, setFaceAction] = useState<'punch-in' | 'punch-out'>('punch-in');

  useEffect(() => {
    fetchTodayAttendance();
    faceApi
      .status()
      .then((r) => setFaceEnrolled(r.data.enrolled))
      .catch(() => setFaceEnrolled(false));
  }, [user]);

  const fetchTodayAttendance = async () => {
    try {
      const res = await attendanceApi.today();
      setTodayAttendance(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getLocation = (): Promise<string | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(`${pos.coords.latitude},${pos.coords.longitude}`),
        () => resolve(null)
      );
    });

  const handlePunchIn = async () => {
    setActionLoading(true);
    setError('');
    try {
      const location = await getLocation();
      await attendanceApi.punchIn({
        method: 'manual',
        deviceInfo: navigator.userAgent,
        location: location ?? undefined,
      });
      await fetchTodayAttendance();
      toast.success('Punched in successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to punch in');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePunchOut = async () => {
    setActionLoading(true);
    setError('');
    try {
      await attendanceApi.punchOut();
      await fetchTodayAttendance();
      toast.success('Punched out successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to punch out');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBiometricPunch = async (action: 'punch-in' | 'punch-out') => {
    setActionLoading(true);
    setError('');
    try {
      const biometricData = btoa(`${user?.id}-${Date.now()}`);
      const location = await getLocation();
      await attendanceApi.biometric({
        biometricData,
        action,
        deviceInfo: navigator.userAgent,
        location: location ?? undefined,
      });
      await fetchTodayAttendance();
      toast.success(action === 'punch-in' ? 'Biometric check-in done' : 'Biometric check-out done');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Biometric authentication failed');
    } finally {
      setActionLoading(false);
    }
  };

  const openFaceScanner = (action: 'punch-in' | 'punch-out') => {
    if (!faceEnrolled) {
      setError('Face not enrolled. Enroll your face in Profile first.');
      return;
    }
    setFaceAction(action);
    setFaceScannerOpen(true);
    setError('');
  };

  const handleFaceCapture = async (descriptor: number[]) => {
    setFaceScannerOpen(false);
    setActionLoading(true);
    setError('');
    try {
      const location = await getLocation();
      await attendanceApi.face({
        descriptor,
        action: faceAction,
        deviceInfo: navigator.userAgent,
        location: location ?? undefined,
      });
      await fetchTodayAttendance();
      toast.success(
        faceAction === 'punch-in' ? 'Face check-in successful' : 'Face check-out successful'
      );
    } catch (err: any) {
      setError(err.response?.data?.error || 'Face recognition failed');
    } finally {
      setActionLoading(false);
    }
  };

  const isPunchedIn = todayAttendance && !todayAttendance.punchOutTime;

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Attendance</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Check in with manual punch, biometric, or face recognition
        </p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Today&apos;s Status</h2>
          {isPunchedIn ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-500/10 px-2 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" /> Checked In
            </span>
          ) : todayAttendance ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 bg-zinc-500/10 px-2 py-1 rounded-full">
              <XCircle className="w-3.5 h-3.5" /> Checked Out
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 bg-zinc-500/10 px-2 py-1 rounded-full">
              <Clock className="w-3.5 h-3.5" /> Not Checked In
            </span>
          )}
        </div>

        {loading ? (
          <div className="h-24 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
        ) : todayAttendance ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <LogIn className="w-4 h-4 text-green-600" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Punch In</span>
              </div>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {formatTime(todayAttendance.punchInTime)}
              </span>
            </div>

            {todayAttendance.punchOutTime && (
              <div className="flex items-center justify-between py-2 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <LogOut className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Punch Out</span>
                </div>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {formatTime(todayAttendance.punchOutTime)}
                </span>
              </div>
            )}

            {todayAttendance.durationMinutes != null && (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-600" />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Duration</span>
                </div>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {formatDuration(todayAttendance.durationMinutes)}
                </span>
              </div>
            )}

            {todayAttendance.location && (
              <div className="flex items-center gap-2 pt-2">
                <MapPin className="w-4 h-4 text-zinc-500" />
                <span className="text-xs text-zinc-500">Location recorded</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-zinc-500 dark:text-zinc-400 py-4">
            No attendance record for today
          </p>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Check in / out</p>

        {isPunchedIn ? (
          <>
            <button
              onClick={handlePunchOut}
              disabled={actionLoading}
              className="w-full py-4 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              {actionLoading ? 'Processing...' : 'Manual Punch Out'}
            </button>

            <button
              onClick={() => handleBiometricPunch('punch-out')}
              disabled={actionLoading}
              className="w-full py-3.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 text-white dark:text-zinc-900 font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Fingerprint className="w-5 h-5" />
              Biometric Punch Out
            </button>

            <button
              onClick={() => openFaceScanner('punch-out')}
              disabled={actionLoading || !faceEnrolled}
              className="w-full py-3.5 rounded-xl border-2 border-brand-500 text-brand-600 dark:text-brand-400 hover:bg-brand-500/10 disabled:opacity-50 font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <ScanFace className="w-5 h-5" />
              Face Recognition Punch Out
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handlePunchIn}
              disabled={actionLoading}
              className="w-full py-4 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <LogIn className="w-5 h-5" />
              {actionLoading ? 'Processing...' : 'Manual Punch In'}
            </button>

            <button
              onClick={() => handleBiometricPunch('punch-in')}
              disabled={actionLoading}
              className="w-full py-3.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 text-white dark:text-zinc-900 font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Fingerprint className="w-5 h-5" />
              Biometric Punch In
            </button>

            <button
              onClick={() => openFaceScanner('punch-in')}
              disabled={actionLoading || !faceEnrolled}
              className="w-full py-3.5 rounded-xl border-2 border-brand-500 text-brand-600 dark:text-brand-400 hover:bg-brand-500/10 disabled:opacity-50 font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <ScanFace className="w-5 h-5" />
              Face Recognition Punch In
            </button>
          </>
        )}
      </div>

      {faceEnrolled === false && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm">
          Face not enrolled yet.{' '}
          <Link href="/member/profile" className="font-semibold underline">
            Enroll in Profile
          </Link>{' '}
          to use face recognition check-in.
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="card bg-brand-500/5 border-brand-500/20">
        <div className="flex items-start gap-3">
          <ScanFace className="w-5 h-5 text-brand-600 dark:text-brand-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Three ways to mark attendance
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              Manual punch records time instantly. Biometric uses device authentication.
              Face recognition matches your enrolled face for secure check-in and check-out.
            </p>
          </div>
        </div>
      </div>

      <FaceScanner
        open={faceScannerOpen}
        mode="attendance"
        title={faceAction === 'punch-in' ? 'Face Check-In' : 'Face Check-Out'}
        subtitle="Look at the camera and tap Scan Face"
        onCapture={handleFaceCapture}
        onClose={() => setFaceScannerOpen(false)}
      />
    </div>
  );
}
