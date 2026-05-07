'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { trainingSessionsApi, membersApi, trainersApi } from '@/lib/api';
import { Calendar, Clock, DollarSign, Plus, Filter, Play, CheckCircle2, XCircle } from 'lucide-react';

export default function TrainingSessionsPage() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    trainerId: '',
    memberId: '',
    sessionType: 'session_based' as 'session_based' | 'month_based',
    scheduledDate: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    sessionRate: '',
    notes: '',
  });
  const [filters, setFilters] = useState({
    trainerId: '',
    memberId: '',
    status: '',
    sessionType: '',
  });

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'gym_admin' || user?.role === 'super_admin' || user?.role === 'trainer') {
      fetchSessions();
      fetchTrainers();
      fetchMembers();
    }
  }, [user, filters]);

  const fetchSessions = async () => {
    try {
      const res = await trainingSessionsApi.list(filters);
      setSessions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainers = async () => {
    try {
      const res = await trainersApi.list({ isActive: true });
      setTrainers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await membersApi.list({ isActive: true });
      setMembers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await trainingSessionsApi.create({
        ...formData,
        sessionRate: parseFloat(formData.sessionRate),
        startTime: `${formData.scheduledDate}T${formData.startTime}`,
        endTime: formData.endTime ? `${formData.scheduledDate}T${formData.endTime}` : undefined,
      });
      setShowForm(false);
      setFormData({
        trainerId: '',
        memberId: '',
        sessionType: 'session_based',
        scheduledDate: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        sessionRate: '',
        notes: '',
      });
      fetchSessions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create training session');
    }
  };

  const handleStart = async (id: string) => {
    try {
      await trainingSessionsApi.start(id);
      fetchSessions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to start session');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await trainingSessionsApi.complete(id);
      fetchSessions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to complete session');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    
    try {
      await trainingSessionsApi.delete(id);
      fetchSessions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete session');
    }
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      scheduled: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      in_progress: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      completed: 'bg-green-500/10 text-green-600 dark:text-green-400',
      cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400',
      no_show: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
    };
    return styles[status as keyof typeof styles] || styles.scheduled;
  };

  const getSessionTypeBadge = (type: string) => {
    const styles = {
      session_based: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      month_based: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    };
    return styles[type as keyof typeof styles] || styles.session_based;
  };

  if (user?.role !== 'admin' && user?.role !== 'gym_admin' && user?.role !== 'super_admin' && user?.role !== 'trainer') {
    return (
      <div className="page-container">
        <p className="text-zinc-500">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Training Sessions</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage personal training sessions</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'gym_admin' || user?.role === 'super_admin') && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Book Session
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Trainer</label>
            <select
              value={filters.trainerId}
              onChange={(e) => handleFilterChange('trainerId', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Trainers</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Member</label>
            <select
              value={filters.memberId}
              onChange={(e) => handleFilterChange('memberId', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Members</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Type</label>
            <select
              value={filters.sessionType}
              onChange={(e) => handleFilterChange('sessionType', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Types</option>
              <option value="session_based">Session Based</option>
              <option value="month_based">Month Based</option>
            </select>
          </div>
        </div>
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Book Training Session</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Trainer</label>
                <select
                  required
                  value={formData.trainerId}
                  onChange={(e) => setFormData({ ...formData, trainerId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select Trainer</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Member</label>
                <select
                  required
                  value={formData.memberId}
                  onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select Member</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Session Type</label>
                <select
                  required
                  value={formData.sessionType}
                  onChange={(e) => setFormData({ ...formData, sessionType: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="session_based">Session Based</option>
                  <option value="month_based">Month Based</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">End Time</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Session Rate (₹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.sessionRate}
                  onChange={(e) => setFormData({ ...formData, sessionRate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors"
                >
                  Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sessions List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-zinc-400 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-600 dark:text-zinc-400">No training sessions found</p>
          </div>
        ) : (
          <>
            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-500" />
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formatDate(session.scheduledDate)}</p>
                        <p className="text-xs text-zinc-500">{formatTime(session.startTime)} - {session.endTime ? formatTime(session.endTime) : 'TBD'}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadge(session.status)}`}>
                      {session.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                      {session.trainer.photoUrl ? (
                        <img src={session.trainer.photoUrl} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            {session.trainer.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-500">Trainer</p>
                        <p className="text-sm text-zinc-900 dark:text-zinc-100 truncate">{session.trainer.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.member.photoUrl ? (
                        <img src={session.member.photoUrl} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            {session.member.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-500">Member</p>
                        <p className="text-sm text-zinc-900 dark:text-zinc-100 truncate">{session.member.name}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex gap-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${getSessionTypeBadge(session.sessionType)}`}>
                        {session.sessionType === 'session_based' ? 'Session' : 'Month'}
                      </span>
                      <span className="text-sm text-zinc-900 dark:text-zinc-100 font-medium">{formatCurrency(session.sessionRate)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {session.status === 'scheduled' && (
                        <button
                          onClick={() => handleStart(session.id)}
                          className="p-2 text-amber-600 hover:bg-amber-500/10 rounded-lg transition-colors"
                          title="Start Session"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {session.status === 'in_progress' && (
                        <button
                          onClick={() => handleComplete(session.id)}
                          className="p-2 text-green-600 hover:bg-green-500/10 rounded-lg transition-colors"
                          title="Complete Session"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      {(user?.role === 'admin' || user?.role === 'gym_admin' || user?.role === 'super_admin') && (
                        <button
                          onClick={() => handleDelete(session.id)}
                          className="p-2 text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
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
                    <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date & Time</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Trainer</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Member</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Type</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Rate</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id} className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-zinc-500" />
                          <div>
                            <p className="text-sm text-zinc-900 dark:text-zinc-100">{formatDate(session.scheduledDate)}</p>
                            <p className="text-xs text-zinc-500">{formatTime(session.startTime)} - {session.endTime ? formatTime(session.endTime) : 'TBD'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {session.trainer.photoUrl ? (
                            <img src={session.trainer.photoUrl} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                {session.trainer.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          <span className="text-sm text-zinc-900 dark:text-zinc-100">{session.trainer.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {session.member.photoUrl ? (
                            <img src={session.member.photoUrl} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                {session.member.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          <span className="text-sm text-zinc-900 dark:text-zinc-100">{session.member.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getSessionTypeBadge(session.sessionType)}`}>
                          {session.sessionType === 'session_based' ? 'Session' : 'Month'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-zinc-900 dark:text-zinc-100">{formatCurrency(session.sessionRate)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadge(session.status)}`}>
                          {session.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {session.status === 'scheduled' && (
                            <button
                              onClick={() => handleStart(session.id)}
                              className="p-1.5 text-amber-600 hover:bg-amber-500/10 rounded-lg transition-colors"
                              title="Start Session"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          {session.status === 'in_progress' && (
                            <button
                              onClick={() => handleComplete(session.id)}
                              className="p-1.5 text-green-600 hover:bg-green-500/10 rounded-lg transition-colors"
                              title="Complete Session"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {(user?.role === 'admin' || user?.role === 'gym_admin' || user?.role === 'super_admin') && (
                            <button
                              onClick={() => handleDelete(session.id)}
                              className="p-1.5 text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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
