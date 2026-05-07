'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { trainingSessionsApi, membersApi } from '@/lib/api';
import { Calendar, Clock, DollarSign, User as UserIcon } from 'lucide-react';

export default function MemberSessionsPage() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    try {
      const res = await trainingSessionsApi.list({ memberId: user?.id });
      setSessions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">My Training Sessions</h1>
        <p className="text-sm text-zinc-500 mt-1">View your personal training sessions with trainers</p>
      </div>

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
            <p className="text-zinc-600 dark:text-zinc-400">No training sessions booked yet</p>
            <p className="text-sm text-zinc-500 mt-2">Contact gym administration to book a session</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {session.trainer.photoUrl ? (
                      <img src={session.trainer.photoUrl} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-zinc-500 dark:text-zinc-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{session.trainer.name}</p>
                      <p className="text-xs text-zinc-500">Personal Trainer</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadge(session.status)}`}>
                      {session.status.replace('_', ' ')}
                    </span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getSessionTypeBadge(session.sessionType)}`}>
                      {session.sessionType === 'session_based' ? 'Session' : 'Month'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    <div>
                      <p className="text-xs text-zinc-500">Date</p>
                      <p className="text-sm text-zinc-900 dark:text-zinc-100">{formatDate(session.scheduledDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    <div>
                      <p className="text-xs text-zinc-500">Time</p>
                      <p className="text-sm text-zinc-900 dark:text-zinc-100">
                        {formatTime(session.startTime)} - {session.endTime ? formatTime(session.endTime) : 'TBD'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-zinc-500" />
                    <div>
                      <p className="text-xs text-zinc-500">Rate</p>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{formatCurrency(session.sessionRate)}</p>
                    </div>
                  </div>
                  {session.durationMinutes && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-zinc-500" />
                      <div>
                        <p className="text-xs text-zinc-500">Duration</p>
                        <p className="text-sm text-zinc-900 dark:text-zinc-100">{session.durationMinutes} min</p>
                      </div>
                    </div>
                  )}
                </div>

                {session.notes && (
                  <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500 mb-1">Notes</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{session.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
