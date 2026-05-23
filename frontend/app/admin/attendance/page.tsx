'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/lib/store';
import { attendanceApi } from '@/lib/api';
import FaceAutoKiosk, { MEMBER_COOLDOWN_MS } from '@/components/attendance/FaceAutoKiosk';
import Link from 'next/link';
import { Calendar, Clock, Fingerprint, Filter, Download, ScanFace } from 'lucide-react';
import toast from 'react-hot-toast';

const ADMIN_ROLES = ['admin', 'gym_admin', 'super_admin'];

export default function AdminAttendancePage() {
  const { user } = useAuthStore();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    method: '',
  });
  const [kioskActive, setKioskActive] = useState(false);
  const cooldownRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (user && ADMIN_ROLES.includes(user.role)) {
      fetchAttendance();
      fetchStats();
    }
  }, [user, filters]);

  const fetchAttendance = async () => {
    try {
      const res = await attendanceApi.list(filters);
      setAttendance(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await attendanceApi.stats(filters);
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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

  const getMethodBadge = (method: string) => {
    const styles: Record<string, string> = {
      manual: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
      biometric: 'bg-brand-500/10 text-brand-600 dark:text-brand-400',
      face: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
      qr: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    };
    return styles[method] || styles.manual;
  };

  const handleKioskDetect = useCallback(
    async (descriptor: number[]) => {
      const now = Date.now();
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

        fetchAttendance();
        fetchStats();

        return {
          success: true,
          memberId,
          memberName: matchedMember.name,
          action: action as 'punch-in' | 'punch-out',
        };
      } catch (err: any) {
        return {
          success: false,
          error: err.response?.data?.error || 'Face not recognized',
        };
      }
    },
    []
  );

  const exportCSV = () => {
    const headers = ['Date', 'Name', 'Phone', 'Punch In', 'Punch Out', 'Duration', 'Method'];
    const rows = attendance.map((a) => [
      formatDate(a.punchInTime),
      a.user.name,
      a.user.phone,
      formatTime(a.punchInTime),
      a.punchOutTime ? formatTime(a.punchOutTime) : '—',
      a.durationMinutes ? formatDuration(a.durationMinutes) : '—',
      a.method,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return (
      <div className="page-container">
        <p className="text-zinc-500">Access denied. Admin only.</p>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Attendance</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Auto face kiosk marks check-in/out when members approach the camera
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setKioskActive(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            <ScanFace className="w-4 h-4" />
            Start Auto Kiosk
          </button>
          <Link
            href="/admin/attendance/kiosk"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-500 text-brand-600 dark:text-brand-400 text-sm font-medium hover:bg-brand-500/10 transition-colors"
          >
            Fullscreen Kiosk
          </Link>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="card bg-brand-500/5 border-brand-500/20">
        <div className="flex items-start gap-3">
          <ScanFace className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">Automatic check-in kiosk</p>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1 text-xs">
              Open <strong>Start Auto Kiosk</strong> or <strong>Fullscreen Kiosk</strong> at the gym entrance.
              When an enrolled member stands in front of the camera, attendance is marked automatically —
              check-in if they are not in, check-out if they are already checked in today.
            </p>
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card">
            <p className="text-xs text-zinc-500 mb-1">Total Records</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.totalRecords}</p>
          </div>
          <div className="card">
            <p className="text-xs text-zinc-500 mb-1">Unique Users</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.uniqueUsers}</p>
          </div>
          <div className="card">
            <p className="text-xs text-zinc-500 mb-1">Avg Duration</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {formatDuration(Math.round(stats.averageDurationMinutes))}
            </p>
          </div>
          <div className="card">
            <p className="text-xs text-zinc-500 mb-1">Face %</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.totalRecords > 0
                ? Math.round(
                    ((stats.methodBreakdown?.find((m: any) => m.method === 'face')?.count || 0) /
                      stats.totalRecords) *
                      100
                  )
                : 0}
              %
            </p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Method</label>
            <select
              value={filters.method}
              onChange={(e) => handleFilterChange('method', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
            >
              <option value="">All Methods</option>
              <option value="manual">Manual</option>
              <option value="biometric">Biometric</option>
              <option value="face">Face Recognition</option>
              <option value="qr">QR Code</option>
            </select>
          </div>
        </div>
      </div>

      <FaceAutoKiosk
        active={kioskActive}
        onDetect={handleKioskDetect}
        onClose={() => setKioskActive(false)}
      />

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded" />
            ))}
          </div>
        ) : attendance.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
            <p className="text-zinc-600 dark:text-zinc-400">No attendance records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Member</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Punch In</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Punch Out</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Duration</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Method</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record) => (
                  <tr key={record.id} className="border-b border-zinc-200 dark:border-zinc-800">
                    <td className="py-3 px-4 text-sm">{formatDate(record.punchInTime)}</td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium">{record.user.name}</p>
                      <p className="text-xs text-zinc-500">{record.user.phone}</p>
                    </td>
                    <td className="py-3 px-4 text-sm">{formatTime(record.punchInTime)}</td>
                    <td className="py-3 px-4 text-sm">
                      {record.punchOutTime ? formatTime(record.punchOutTime) : '—'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {record.durationMinutes ? formatDuration(record.durationMinutes) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${getMethodBadge(record.method)}`}>
                        {record.method === 'biometric' && <Fingerprint className="w-3 h-3 inline mr-1" />}
                        {record.method === 'face' && <ScanFace className="w-3 h-3 inline mr-1" />}
                        {record.method}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
