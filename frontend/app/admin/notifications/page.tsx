'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { notificationsApi, membersApi } from '@/lib/api';
import { Bell, Send, Users, CheckCircle2, XCircle, Info, AlertTriangle, AlertCircle } from 'lucide-react';

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    actionUrl: '',
  });

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'gym_admin' || user?.role === 'super_admin') {
      fetchMembers();
    }
  }, [user]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await membersApi.list({ isActive: true });
      setMembers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    setSelectAll(!selectAll);
    if (!selectAll) {
      setSelectedMembers(members.map(m => m.id));
    } else {
      setSelectedMembers([]);
    }
  };

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
    setSelectAll(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      alert('Please fill in title and message');
      return;
    }

    try {
      setSending(true);
      const res = await notificationsApi.send({
        userIds: selectedMembers.length > 0 ? selectedMembers : [],
        title: formData.title,
        message: formData.message,
        type: formData.type,
        actionUrl: formData.actionUrl || undefined,
      });
      alert(`Notification sent to ${res.data.count} users`);
      setFormData({ title: '', message: '', type: 'info', actionUrl: '' });
      setSelectedMembers([]);
      setSelectAll(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const notificationTypes = [
    { value: 'info', label: 'Info', icon: Info, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    { value: 'success', label: 'Success', icon: CheckCircle2, color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
    { value: 'warning', label: 'Warning', icon: AlertTriangle, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { value: 'error', label: 'Error', icon: AlertCircle, color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  ];

  if (user?.role !== 'admin' && user?.role !== 'gym_admin' && user?.role !== 'super_admin' && user?.role !== 'trainer') {
    return (
      <div className="page-container">
        <p className="text-zinc-500">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Send Notifications</h1>
        <p className="text-sm text-zinc-500 mt-1">Send messages and reminders to members</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notification Form */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-brand-500" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Compose Notification</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Notification title"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="label">Message</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Notification message"
                rows={4}
                className="input-field resize-none"
                required
              />
            </div>

            <div>
              <label className="label">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {notificationTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.value })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                        formData.type === type.value
                          ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="label">Action URL (optional)</label>
              <input
                type="url"
                value={formData.actionUrl}
                onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                placeholder="https://example.com"
                className="input-field"
              />
              <p className="text-xs text-zinc-500 mt-1">Users will be redirected to this URL when they click the notification</p>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Sending...' : selectedMembers.length > 0 ? `Send to ${selectedMembers.length} members` : 'Send to all members'}
            </button>
          </form>
        </div>

        {/* Recipient Selection */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-500" />
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Recipients</h2>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-zinc-300 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Select All</span>
            </label>
          </div>

          {loading ? (
            <div className="text-center py-8 text-zinc-500">Loading members...</div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {members.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">No active members found</div>
              ) : (
                members.map((member) => (
                  <label
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => handleMemberToggle(member.id)}
                      className="w-4 h-4 rounded border-zinc-300 text-brand-500 focus:ring-brand-500"
                    />
                    {member.photoUrl ? (
                      <img src={member.photoUrl} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 text-sm font-bold">
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{member.name}</p>
                      <p className="text-xs text-zinc-500">{member.phone}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          )}

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {selectedMembers.length > 0
                ? `${selectedMembers.length} member${selectedMembers.length > 1 ? 's' : ''} selected`
                : 'All active members will receive the notification'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
