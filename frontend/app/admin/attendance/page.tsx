'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { attendanceApi } from '@/lib/api';
import { Calendar, Clock, MapPin, Fingerprint, Filter, Download } from 'lucide-react';

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

  useEffect(() => {
    if (user?.role === 'admin') {
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
    setFilters(prev => ({ ...prev, [key]: value }));
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
    const styles = {
      manual: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
      biometric: 'bg-brand-500/10 text-brand-600 dark:text-brand-400',
      qr: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    };
    return styles[method as keyof typeof styles] || styles.manual;
  };

  const exportCSV = () => {
    const headers = ['Date', 'Name', 'Phone', 'Punch In', 'Punch Out', 'Duration', 'Method'];
    const rows = attendance.map(a => [
      formatDate(a.punchInTime),
      a.user.name,
      a.user.phone,
      formatTime(a.punchInTime),
      a.punchOutTime ? formatTime(a.punchOutTime) : '—',
      a.durationMinutes ? formatDuration(a.durationMinutes) : '—',
      a.method,
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (user?.role !== 'admin') {
    return (
      <div className="page-container">
        <p className="text-zinc-500">Access denied. Admin only.</p>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Attendance</h1>
          <p className="text-sm text-zinc-500 mt-1">View and manage member attendance records</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
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
            <p className="text-xs text-zinc-500 mb-1">Biometric %</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.totalRecords > 0
                ? Math.round((stats.methodBreakdown?.find((m: any) => m.method === 'biometric')?.count || 0) / stats.totalRecords * 100)
                : 0}%
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
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
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Method</label>
            <select
              value={filters.method}
              onChange={(e) => handleFilterChange('method', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Methods</option>
              <option value="manual">Manual</option>
              <option value="biometric">Biometric</option>
              <option value="qr">QR Code</option>
            </select>
          </div>
        </div>
      </div>

      {/* Attendance List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded" />
            ))}
          </div>
        ) : attendance.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-zinc-400 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-600 dark:text-zinc-400">No attendance records found</p>
          </div>
        ) : (
          <>
            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-3">
              {attendance.map((record) => (
                <div key={record.id} className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {record.user.photoUrl ? (
                      <img src={record.user.photoUrl} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                          {record.user.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{record.user.name}</p>
                      <p className="text-xs text-zinc-500">{record.user.phone}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getMethodBadge(record.method)}`}>
                      {record.method === 'biometric' && <Fingerprint className="w-3 h-3 inline mr-1" />}
                      {record.method}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Date</p>
                      <div className="flex items-center gap-1 text-zinc-900 dark:text-zinc-100">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        {formatDate(record.punchInTime)}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Duration</p>
                      <p className="text-zinc-900 dark:text-zinc-100">
                        {record.durationMinutes ? formatDuration(record.durationMinutes) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Punch In</p>
                      <p className="text-zinc-900 dark:text-zinc-100">{formatTime(record.punchInTime)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Punch Out</p>
                      <p className="text-zinc-900 dark:text-zinc-100">
                        {record.punchOutTime ? formatTime(record.punchOutTime) : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop Table Layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Member</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Punch In</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Punch Out</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Duration</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record) => (
                    <tr key={record.id} className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm text-zinc-900 dark:text-zinc-100">{formatDate(record.punchInTime)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {record.user.photoUrl ? (
                            <img src={record.user.photoUrl} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                {record.user.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{record.user.name}</p>
                            <p className="text-xs text-zinc-500">{record.user.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-zinc-900 dark:text-zinc-100">{formatTime(record.punchInTime)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-zinc-900 dark:text-zinc-100">
                          {record.punchOutTime ? formatTime(record.punchOutTime) : '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-zinc-900 dark:text-zinc-100">
                          {record.durationMinutes ? formatDuration(record.durationMinutes) : '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getMethodBadge(record.method)}`}>
                          {record.method === 'biometric' && <Fingerprint className="w-3 h-3 inline mr-1" />}
                          {record.method}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
