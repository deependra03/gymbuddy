'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { attendanceApi } from '@/lib/api';
import { Clock, MapPin, Fingerprint, LogIn, LogOut, CheckCircle2, XCircle } from 'lucide-react';

export default function AttendancePage() {
  const { user } = useAuthStore();
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTodayAttendance();
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

  const handlePunchIn = async () => {
    setActionLoading(true);
    setError('');
    try {
      // Try to get location if available
      let location = null;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            location = `${pos.coords.latitude},${pos.coords.longitude}`;
            performPunchIn(location);
          },
          () => {
            performPunchIn(null);
          }
        );
      } else {
        performPunchIn(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to punch in');
      setActionLoading(false);
    }
  };

  const performPunchIn = async (location: string | null) => {
    try {
      await attendanceApi.punchIn({
        method: 'manual',
        deviceInfo: navigator.userAgent,
        location: location ?? undefined,
      });
      await fetchTodayAttendance();
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
      // Simulate biometric data - in real app, this would use WebAuthn or a biometric SDK
      const biometricData = btoa(`${user?.id}-${Date.now()}`);
      
      let location = null;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            location = `${pos.coords.latitude},${pos.coords.longitude}`;
            performBiometric(action, biometricData, location);
          },
          () => {
            performBiometric(action, biometricData, null);
          }
        );
      } else {
        performBiometric(action, biometricData, null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Biometric authentication failed');
      setActionLoading(false);
    }
  };

  const performBiometric = async (action: 'punch-in' | 'punch-out', biometricData: string, location: string | null) => {
    try {
      await attendanceApi.biometric({
        biometricData,
        action,
        deviceInfo: navigator.userAgent,
        location: location ?? undefined,
      });
      await fetchTodayAttendance();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Biometric authentication failed');
    } finally {
      setActionLoading(false);
    }
  };

  const isPunchedIn = todayAttendance && !todayAttendance.punchOutTime;

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
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
        <p className="text-sm text-zinc-500 mt-1">Track your gym check-in and check-out times</p>
      </div>

      {/* Today's Status Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Today's Status</h2>
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

            {todayAttendance.durationMinutes && (
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

      {/* Action Buttons */}
      <div className="space-y-3">
        {isPunchedIn ? (
          <button
            onClick={handlePunchOut}
            disabled={actionLoading}
            className="w-full py-4 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {actionLoading ? 'Processing...' : 'Punch Out'}
          </button>
        ) : (
          <>
            <button
              onClick={handlePunchIn}
              disabled={actionLoading}
              className="w-full py-4 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <LogIn className="w-5 h-5" />
              {actionLoading ? 'Processing...' : 'Punch In'}
            </button>

            <button
              onClick={() => handleBiometricPunch('punch-in')}
              disabled={actionLoading}
              className="w-full py-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:bg-zinc-900/50 dark:disabled:bg-zinc-100/50 text-white dark:text-zinc-900 font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Fingerprint className="w-5 h-5" />
              {actionLoading ? 'Processing...' : 'Biometric Punch In'}
            </button>
          </>
        )}

        {isPunchedIn && (
          <button
            onClick={() => handleBiometricPunch('punch-out')}
            disabled={actionLoading}
            className="w-full py-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:bg-zinc-900/50 dark:disabled:bg-zinc-100/50 text-white dark:text-zinc-900 font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Fingerprint className="w-5 h-5" />
            {actionLoading ? 'Processing...' : 'Biometric Punch Out'}
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Info Card */}
      <div className="card bg-brand-500/5 border-brand-500/20">
        <div className="flex items-start gap-3">
          <Fingerprint className="w-5 h-5 text-brand-600 dark:text-brand-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Biometric Authentication</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              Use biometric authentication for secure check-in and check-out. Your biometric data is securely processed and stored.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
