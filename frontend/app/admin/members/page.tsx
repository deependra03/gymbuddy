'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Users, Plus, Search, X, Upload, Scan, UserX, Phone, Edit3, Trash2, Image as ImageIcon,
  Dumbbell,
} from 'lucide-react';
import { membersApi, uploadApi, exercisesApi } from '@/lib/api';
import { cn, formatDate, formatCurrency, getInitials, toDateInputValue } from '@/lib/utils';

type Member = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  photoUrl?: string;
  age?: number;
  weight?: number;
  height?: number;
  goal?: string;
  isActive: boolean;
  joinDate: string;
  membershipStart?: string | null;
  membershipEnd?: string | null;
  membershipPurchasePrice?: number | null;
  _count?: { assignedExercises: number; dietPlans: number };
};

type ExerciseRow = { id: string; title: string; category: string; level: string };
type AssignmentRow = { id: string; notes?: string | null; exercise: ExerciseRow };

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [exerciseMember, setExerciseMember] = useState<Member | null>(null);
  const [exerciseAssignments, setExerciseAssignments] = useState<AssignmentRow[]>([]);
  const [exerciseLibrary, setExerciseLibrary] = useState<ExerciseRow[]>([]);
  const [exerciseLoading, setExerciseLoading] = useState(false);
  const [assignExerciseId, setAssignExerciseId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  const { register, handleSubmit, reset, setValue, watch } = useForm<any>();

  const fetchMembers = useCallback(async () => {
    try {
      const res = await membersApi.list({ search: search || undefined });
      setMembers(res.data);
    } catch {
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchMembers, 300);
    return () => clearTimeout(t);
  }, [fetchMembers]);

  const openAdd = () => {
    setEditingMember(null);
    reset({});
    setShowModal(true);
  };

  const openEdit = (m: Member) => {
    setEditingMember(m);
    reset({
      name: m.name,
      phone: m.phone,
      email: m.email || '',
      age: m.age || '',
      weight: m.weight || '',
      height: m.height || '',
      goal: m.goal || '',
      photoUrl: m.photoUrl || '',
      membershipStart: toDateInputValue(m.membershipStart),
      membershipEnd: toDateInputValue(m.membershipEnd),
      membershipPurchasePrice:
        m.membershipPurchasePrice != null ? String(m.membershipPurchasePrice) : '',
    });
    setShowModal(true);
  };

  const openExerciseModal = async (m: Member) => {
    setExerciseMember(m);
    setExerciseLoading(true);
    setAssignExerciseId('');
    setAssignNotes('');
    try {
      const [assignRes, libRes] = await Promise.all([
        exercisesApi.forMember(m.id),
        exercisesApi.list(),
      ]);
      setExerciseAssignments(assignRes.data);
      setExerciseLibrary(libRes.data);
    } catch {
      toast.error('Failed to load exercises');
    } finally {
      setExerciseLoading(false);
    }
  };

  const refreshExerciseAssignments = async () => {
    if (!exerciseMember) return;
    const r = await exercisesApi.forMember(exerciseMember.id);
    setExerciseAssignments(r.data);
    fetchMembers();
  };

  const handleAssignExercise = async () => {
    if (!assignExerciseId || !exerciseMember) return;
    try {
      await membersApi.assignExercise(exerciseMember.id, {
        exerciseId: assignExerciseId,
        notes: assignNotes.trim() || undefined,
      });
      toast.success('Exercise assigned');
      setAssignNotes('');
      setAssignExerciseId('');
      await refreshExerciseAssignments();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to assign exercise');
    }
  };

  const handleRemoveExercise = async (exerciseId: string) => {
    if (!exerciseMember || !confirm('Remove this exercise from the member?')) return;
    try {
      await membersApi.removeExercise(exerciseMember.id, exerciseId);
      toast.success('Exercise removed');
      await refreshExerciseAssignments();
    } catch {
      toast.error('Failed to remove exercise');
    }
  };

  const onSubmit = async (data: any) => {
    try {
      const rawPrice =
        data.membershipPurchasePrice === '' || data.membershipPurchasePrice == null
          ? null
          : parseFloat(String(data.membershipPurchasePrice));
      const membershipPurchase =
        rawPrice !== null && !Number.isNaN(rawPrice) ? rawPrice : null;

      if (editingMember) {
        await membersApi.update(editingMember.id, {
          name: data.name,
          email: data.email || null,
          age: data.age,
          weight: data.weight,
          height: data.height,
          goal: data.goal,
          photoUrl: data.photoUrl,
          membershipStart: data.membershipStart || null,
          membershipEnd: data.membershipEnd || null,
          membershipPurchasePrice: membershipPurchase,
        });
        toast.success('Member updated');
      } else {
        await membersApi.create({
          name: data.name,
          phone: data.phone,
          email: data.email,
          password: data.password || '123456',
          age: data.age,
          weight: data.weight,
          height: data.height,
          goal: data.goal,
          photoUrl: data.photoUrl,
          membershipStart: data.membershipStart || undefined,
          membershipEnd: data.membershipEnd || undefined,
          membershipPurchasePrice: membershipPurchase ?? undefined,
        });
        toast.success('Member created! Default password: 123456');
      }
      setShowModal(false);
      fetchMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this member?')) return;
    try {
      await membersApi.delete(id);
      toast.success('Member deactivated');
      fetchMembers();
    } catch {
      toast.error('Failed to deactivate');
    }
  };

  const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    try {
      const res = await uploadApi.ocr(file);
      const { extracted, formImageUrl } = res.data;
      if (extracted.name) setValue('name', extracted.name);
      if (extracted.phone) setValue('phone', extracted.phone);
      if (extracted.email) setValue('email', extracted.email);
      if (extracted.age) setValue('age', extracted.age);
      if (extracted.weight) setValue('weight', extracted.weight);
      if (extracted.height) setValue('height', extracted.height);
      if (extracted.goal) setValue('goal', extracted.goal);
      if (formImageUrl) setValue('photoUrl', formImageUrl);
      toast.success('Form scanned! Please review the extracted data.');
    } catch {
      toast.error('OCR failed. Please fill in manually.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const res = await uploadApi.image(file, 'profiles');
      setValue('photoUrl', res.data.url);
      toast.success('Photo uploaded');
    } catch {
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const photoUrl = watch('photoUrl');

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title flex items-center gap-2"><Users className="w-5 h-5 text-brand-500" /> Members</h1>
          <p className="text-zinc-500 text-sm">{members.length} registered members</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Member
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Members Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-zinc-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-zinc-800 rounded w-3/4" />
                  <div className="h-3 bg-zinc-800 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">No members found</p>
          <p className="text-zinc-600 text-sm mt-1">Add your first member to get started</p>
          <button onClick={openAdd} className="btn-primary mx-auto mt-4">
            <Plus className="w-4 h-4" /> Add Member
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <div key={member.id} className={cn('card hover:border-zinc-700 transition-colors cursor-pointer', !member.isActive && 'opacity-60')}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {member.photoUrl ? (
                    <img src={member.photoUrl} alt={member.name} className="w-12 h-12 rounded-full object-cover bg-zinc-800" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-400 font-bold text-sm">
                      {getInitials(member.name)}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-zinc-100">{member.name}</p>
                    <p className="text-xs text-zinc-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {member.phone}
                    </p>
                  </div>
                </div>
                <span className={cn('badge', member.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500')}>
                  {member.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                {[
                  { label: 'Age', value: member.age ? `${member.age}y` : '—' },
                  { label: 'Weight', value: member.weight ? `${member.weight}kg` : '—' },
                  { label: 'Exercises', value: member._count?.assignedExercises ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-zinc-800/50 rounded-lg p-2">
                    <p className="text-xs text-zinc-500">{label}</p>
                    <p className="text-sm font-semibold text-zinc-200">{value}</p>
                  </div>
                ))}
              </div>

              {(member.membershipStart ||
                member.membershipEnd ||
                member.membershipPurchasePrice != null) && (
                <div className="mb-3 rounded-lg bg-zinc-800/40 border border-zinc-800 px-3 py-2 text-xs text-zinc-400 space-y-1">
                  <p className="font-semibold text-zinc-300">Membership</p>
                  <p>
                    {member.membershipStart || member.membershipEnd
                      ? `${member.membershipStart ? formatDate(member.membershipStart) : '—'} → ${member.membershipEnd ? formatDate(member.membershipEnd) : '—'}`
                      : 'Dates not set'}
                  </p>
                  {member.membershipPurchasePrice != null && (
                    <p className="text-brand-400">
                      Paid {formatCurrency(member.membershipPurchasePrice)}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => openEdit(member)}
                  className="flex-1 min-w-[5rem] btn-secondary text-xs py-2"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => openExerciseModal(member)}
                  className="flex-1 min-w-[5rem] btn-secondary text-xs py-2"
                >
                  <Dumbbell className="w-3.5 h-3.5" /> Exercises
                </button>
                <button
                  onClick={() => handleDeactivate(member.id)}
                  className="flex-1 min-w-[5rem] btn-danger text-xs py-2"
                >
                  <UserX className="w-3.5 h-3.5" /> Deactivate
                </button>
              </div>
              <p className="text-xs text-zinc-600 mt-2 text-center">Joined {formatDate(member.joinDate)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-zinc-900 flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-lg font-bold">{editingMember ? 'Edit Member' : 'Add New Member'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              {/* OCR Upload */}
              {!editingMember && (
                <div className="p-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-800/30">
                  <p className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                    <Scan className="w-4 h-4 text-brand-400" /> Scan Physical Form (OCR)
                  </p>
                  <label className="btn-secondary text-sm w-full cursor-pointer">
                    {ocrLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
                        Scanning...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 justify-center">
                        <Upload className="w-4 h-4" /> Upload Form Image
                      </span>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleOCR} disabled={ocrLoading} />
                  </label>
                  <p className="text-xs text-zinc-600 mt-2">Upload a photo of the gym registration form to auto-fill details</p>
                </div>
              )}

              {/* Photo Upload */}
              <div>
                <label className="label">Profile Photo</label>
                <div className="flex items-center gap-3">
                  {photoUrl ? (
                    <img src={photoUrl} className="w-14 h-14 rounded-full object-cover bg-zinc-800" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-zinc-600" />
                    </div>
                  )}
                  <label className="btn-secondary text-sm cursor-pointer">
                    {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                  </label>
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="label">Full Name *</label>
                  <input {...register('name', { required: true })} className="input-field" placeholder="Rahul Sharma" />
                </div>
                <div>
                  <label className="label">Phone *</label>
                  <input {...register('phone', { required: !editingMember })} className="input-field" placeholder="9876543210" type="tel" disabled={!!editingMember} />
                </div>
                <div>
                  <label className="label">Email (optional)</label>
                  <input {...register('email')} className="input-field" placeholder="user@email.com" type="email" />
                </div>
                {!editingMember && (
                  <div className="col-span-2">
                    <label className="label">Password (default: 123456)</label>
                    <input {...register('password')} className="input-field" placeholder="Min 6 characters" type="password" />
                  </div>
                )}
                <div>
                  <label className="label">Age</label>
                  <input {...register('age')} className="input-field" placeholder="25" type="number" />
                </div>
                <div>
                  <label className="label">Weight (kg)</label>
                  <input {...register('weight')} className="input-field" placeholder="70" type="number" step="0.1" />
                </div>
                <div>
                  <label className="label">Height (cm)</label>
                  <input {...register('height')} className="input-field" placeholder="175" type="number" />
                </div>
                <div className="col-span-2">
                  <label className="label">Goal</label>
                  <input {...register('goal')} className="input-field" placeholder="Build muscle, lose weight..." />
                </div>
                <div>
                  <label className="label">Membership start</label>
                  <input type="date" {...register('membershipStart')} className="input-field" />
                </div>
                <div>
                  <label className="label">Membership end</label>
                  <input type="date" {...register('membershipEnd')} className="input-field" />
                </div>
                <div className="col-span-2">
                  <label className="label">Membership price (INR)</label>
                  <input
                    {...register('membershipPurchasePrice')}
                    className="input-field"
                    placeholder="e.g. 4999"
                    type="number"
                    min={0}
                    step="0.01"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  {editingMember ? 'Save Changes' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {exerciseMember && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-zinc-900 flex items-center justify-between p-6 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-brand-400" /> Assign exercises
                </h2>
                <p className="text-sm text-zinc-500 mt-0.5">{exerciseMember.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setExerciseMember(null)}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Add from library
                </p>
                {exerciseLoading ? (
                  <div className="h-24 rounded-xl bg-zinc-800/50 animate-pulse" />
                ) : (
                  <div className="space-y-3">
                    <select
                      value={assignExerciseId}
                      onChange={(e) => setAssignExerciseId(e.target.value)}
                      className="input-field w-full"
                    >
                      <option value="">Select an exercise…</option>
                      {exerciseLibrary
                        .filter(
                          (ex) =>
                            !exerciseAssignments.some((a) => a.exercise.id === ex.id)
                        )
                        .map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            {ex.title} · {ex.category}
                          </option>
                        ))}
                    </select>
                    <input
                      value={assignNotes}
                      onChange={(e) => setAssignNotes(e.target.value)}
                      className="input-field"
                      placeholder="Optional note for the member (sets, reps…)"
                    />
                    <button
                      type="button"
                      onClick={handleAssignExercise}
                      disabled={!assignExerciseId}
                      className="btn-primary w-full disabled:opacity-50"
                    >
                      Add exercise
                    </button>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Assigned ({exerciseAssignments.length})
                </p>
                {exerciseLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-14 rounded-xl bg-zinc-800/50 animate-pulse" />
                    ))}
                  </div>
                ) : exerciseAssignments.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-6 border border-dashed border-zinc-800 rounded-xl">
                    No exercises yet. Pick one above to assign.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {exerciseAssignments.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-800/30 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-100 truncate">
                            {a.exercise.title}
                          </p>
                          <p className="text-xs text-zinc-500 truncate">
                            {a.exercise.category} · {a.exercise.level}
                            {a.notes ? ` · ${a.notes}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(a.exercise.id)}
                          className="shrink-0 p-2 rounded-lg text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
