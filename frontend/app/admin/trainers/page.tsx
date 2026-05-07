'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { trainersApi } from '@/lib/api';
import { Award, Plus, DollarSign, Clock, Edit, Trash2, User as UserIcon } from 'lucide-react';

export default function TrainersPage() {
  const { user } = useAuthStore();
  const [trainers, setTrainers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    baseSalary: '',
    sessionRate: '',
    specialization: '',
    bio: '',
    age: '',
    weight: '',
    height: '',
    goal: '',
    isActive: true,
  });

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'gym_admin' || user?.role === 'super_admin') {
      fetchTrainers();
      fetchStats();
    }
  }, [user]);

  const fetchTrainers = async () => {
    try {
      const res = await trainersApi.list();
      setTrainers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await trainersApi.stats();
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTrainer) {
        await trainersApi.update(editingTrainer.id, formData);
      } else {
        await trainersApi.create(formData);
      }
      setShowForm(false);
      setEditingTrainer(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        password: '',
        baseSalary: '',
        sessionRate: '',
        specialization: '',
        bio: '',
        age: '',
        weight: '',
        height: '',
        goal: '',
        isActive: true,
      });
      fetchTrainers();
      fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.error || (editingTrainer ? 'Failed to update trainer' : 'Failed to create trainer'));
    }
  };

  const handleEdit = (trainer: any) => {
    setEditingTrainer(trainer);
    setFormData({
      name: trainer.name,
      phone: trainer.phone,
      email: trainer.email || '',
      password: '',
      baseSalary: trainer.baseSalary ? String(trainer.baseSalary) : '',
      sessionRate: trainer.sessionRate ? String(trainer.sessionRate) : '',
      specialization: trainer.specialization || '',
      bio: trainer.bio || '',
      age: trainer.age ? String(trainer.age) : '',
      weight: trainer.weight ? String(trainer.weight) : '',
      height: trainer.height ? String(trainer.height) : '',
      goal: trainer.goal || '',
      isActive: trainer.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trainer?')) return;
    
    try {
      await trainersApi.delete(id);
      fetchTrainers();
      fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete trainer');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (user?.role !== 'admin' && user?.role !== 'gym_admin' && user?.role !== 'super_admin') {
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
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Trainers</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage gym trainers and their rates</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Trainer
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="card">
            <p className="text-xs text-zinc-500 mb-1">Total Trainers</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.totalTrainers}</p>
          </div>
          <div className="card">
            <p className="text-xs text-zinc-500 mb-1">Active</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.activeTrainers}</p>
          </div>
          <div className="card">
            <p className="text-xs text-zinc-500 mb-1">Inactive</p>
            <p className="text-2xl font-bold text-zinc-500 dark:text-zinc-400">{stats.inactiveTrainers}</p>
          </div>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
              {editingTrainer ? 'Edit Trainer' : 'Add Trainer'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              {!editingTrainer && (
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Base Salary (₹/month)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.baseSalary}
                    onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Session Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.sessionRate}
                    onChange={(e) => setFormData({ ...formData, sessionRate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Specialization</label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  placeholder="e.g., Strength, Cardio, Yoga"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  placeholder="Short description about the trainer"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Age</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Height (cm)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Goal</label>
                <input
                  type="text"
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  placeholder="Personal fitness goal"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              {editingTrainer && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-brand-500 focus:ring-brand-500"
                  />
                  <label htmlFor="isActive" className="text-sm text-zinc-700 dark:text-zinc-300">Active</label>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingTrainer(null);
                    setFormData({
                      name: '',
                      phone: '',
                      email: '',
                      password: '',
                      baseSalary: '',
                      sessionRate: '',
                      specialization: '',
                      bio: '',
                      age: '',
                      weight: '',
                      height: '',
                      goal: '',
                      isActive: true,
                    });
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors"
                >
                  {editingTrainer ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trainers List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded" />
            ))}
          </div>
        ) : trainers.length === 0 ? (
          <div className="text-center py-12">
            <Award className="w-12 h-12 text-zinc-400 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-600 dark:text-zinc-400">No trainers found</p>
            <p className="text-sm text-zinc-500 mt-2">Add trainers to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trainers.map((trainer) => (
              <div key={trainer.id} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {trainer.photoUrl ? (
                      <img src={trainer.photoUrl} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-zinc-500 dark:text-zinc-600" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">{trainer.name}</p>
                        {!trainer.isActive && (
                          <span className="text-xs bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full">Inactive</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">{trainer.phone}</p>
                      {trainer.specialization && (
                        <p className="text-xs text-brand-600 dark:text-brand-400 mt-1">{trainer.specialization}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(trainer)}
                      className="p-1.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(trainer.id)}
                      className="p-1.5 text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-zinc-500" />
                    <div>
                      <p className="text-xs text-zinc-500">Base Salary</p>
                      <p className="text-sm text-zinc-900 dark:text-zinc-100">
                        {trainer.baseSalary ? formatCurrency(trainer.baseSalary) : 'Not set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-zinc-500" />
                    <div>
                      <p className="text-xs text-zinc-500">Session Rate</p>
                      <p className="text-sm text-zinc-900 dark:text-zinc-100">
                        {trainer.sessionRate ? formatCurrency(trainer.sessionRate) : 'Not set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    <div>
                      <p className="text-xs text-zinc-500">Sessions Completed</p>
                      <p className="text-sm text-zinc-900 dark:text-zinc-100">{trainer._count?.trainerSessions || 0}</p>
                    </div>
                  </div>
                </div>

                {trainer.bio && (
                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500 mb-1">Bio</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{trainer.bio}</p>
                  </div>
                )}

                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 mt-3">
                  <p className="text-xs text-zinc-500">Joined {formatDate(trainer.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
