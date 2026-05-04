'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ListChecks, Plus, Search, X, Edit3, Trash2, Play, Filter, Upload, Download, MessageCircle } from 'lucide-react';
import { exercisesApi, uploadApi, sendApi } from '@/lib/api';
import { cn, getBadgeClass, EXERCISE_CATEGORIES, FOCUS_AREAS, LEVELS } from '@/lib/utils';

type Exercise = {
  id: string;
  title: string;
  description?: string;
  category: string;
  focusArea: string;
  level: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  isPublic: boolean;
};

export default function AdminExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  const { register, handleSubmit, reset, setValue, watch } = useForm<any>();

  const fetch = useCallback(async () => {
    try {
      const res = await exercisesApi.list({
        search: search || undefined,
        category: filterCategory || undefined,
        level: filterLevel || undefined,
      });
      setExercises(res.data);
    } catch {
      toast.error('Failed to load exercises');
    } finally {
      setLoading(false);
    }
  }, [search, filterCategory, filterLevel]);

  useEffect(() => {
    const t = setTimeout(fetch, 300);
    return () => clearTimeout(t);
  }, [fetch]);

  const openAdd = () => {
    setEditing(null);
    reset({ level: 'beginner', isPublic: true });
    setShowModal(true);
  };

  const openEdit = (ex: Exercise) => {
    setEditing(ex);
    reset(ex);
    setShowModal(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (editing) {
        await exercisesApi.update(editing.id, data);
        toast.success('Exercise updated');
      } else {
        await exercisesApi.create(data);
        toast.success('Exercise created');
      }
      setShowModal(false);
      fetch();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this exercise?')) return;
    try {
      await exercisesApi.delete(id);
      toast.success('Exercise deleted');
      fetch();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleDownloadPDF = async (exerciseId: string, title: string) => {
    try {
      const res = await sendApi.exercisePDF(exerciseId);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to download PDF');
    }
  };

  const handleSendWhatsApp = async (exerciseId: string) => {
    const memberId = prompt('Enter Member ID to send via WhatsApp:');
    if (!memberId) return;

    try {
      await sendApi.exercisePDF(exerciseId, memberId, 'whatsapp');
      toast.success('Exercise sent via WhatsApp');
    } catch {
      toast.error('Failed to send via WhatsApp');
    }
  };

  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingThumb(true);
    try {
      const res = await uploadApi.image(file, 'exercises');
      setValue('thumbnailUrl', res.data.url);
      toast.success('Thumbnail uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploadingThumb(false);
    }
  };

  const thumbnailUrl = watch('thumbnailUrl');

  const grouped = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    acc[ex.category] = acc[ex.category] || [];
    acc[ex.category].push(ex);
    return acc;
  }, {});

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title flex items-center gap-2"><ListChecks className="w-5 h-5 text-brand-500" /> Exercises</h1>
          <p className="text-zinc-500 text-sm">{exercises.length} exercises in directory</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Exercise
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="input-field sm:w-40">
          <option value="">All categories</option>
          {EXERCISE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="input-field sm:w-40">
          <option value="">All levels</option>
          {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </div>

      {/* Exercise list grouped by category */}
      {loading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-32 animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, j) => <div key={j} className="card h-40 animate-pulse" />)}
              </div>
            </div>
          ))}
        </div>
      ) : exercises.length === 0 ? (
        <div className="card text-center py-16">
          <ListChecks className="w-12 h-12 text-zinc-400 dark:text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-600 dark:text-zinc-400 font-medium">No exercises found</p>
          <button onClick={openAdd} className="btn-primary mx-auto mt-4">
            <Plus className="w-4 h-4" /> Add Exercise
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, exs]) => (
            <div key={category}>
              <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-500 inline-block" />
                {category} ({exs.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {exs.map((ex) => (
                  <div key={ex.id} className="card hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors group">
                    {/* Thumbnail or placeholder */}
                    <div className="relative -mx-5 -mt-5 mb-4 h-36 bg-zinc-200 dark:bg-zinc-800 rounded-t-2xl overflow-hidden">
                      {ex.thumbnailUrl ? (
                        <img src={ex.thumbnailUrl} alt={ex.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-10 h-10 text-zinc-500 dark:text-zinc-700" />
                        </div>
                      )}
                      {ex.videoUrl && (
                        <button
                          onClick={() => setPreviewVideo(ex.videoUrl!)}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <div className="w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center">
                            <Play className="w-5 h-5 text-white" />
                          </div>
                        </button>
                      )}
                    </div>

                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm leading-tight">{ex.title}</h3>
                      <span className={getBadgeClass(ex.level)}>{ex.level}</span>
                    </div>

                    <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{ex.description || 'No description'}</p>

                    <div className="flex gap-1 mb-3">
                      <span className="badge bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 text-[11px]">{ex.focusArea}</span>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => handleDownloadPDF(ex.id, ex.title)} className="btn-secondary text-xs py-2" title="Download PDF">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleSendWhatsApp(ex.id)} className="btn-secondary text-xs py-2" title="Send via WhatsApp">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openEdit(ex)} className="flex-1 btn-secondary text-xs py-2">
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => handleDelete(ex.id)} className="flex-1 btn-danger text-xs py-2">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setPreviewVideo(null)}>
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewVideo(null)} className="mb-3 btn-secondary ml-auto flex">
              <X className="w-4 h-4" /> Close
            </button>
            <div className="aspect-video rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900">
              <iframe
                src={previewVideo.includes('youtube') ? previewVideo : previewVideo}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          </div>
        </div>
      )}

      {/* Exercise Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-white dark:bg-zinc-900 flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{editing ? 'Edit Exercise' : 'Add Exercise'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              {/* Thumbnail upload */}
              <div>
                <label className="label">Thumbnail Image</label>
                <div className="flex items-center gap-3">
                  {thumbnailUrl ? (
                    <img src={thumbnailUrl} className="w-16 h-16 rounded-xl object-cover bg-zinc-200 dark:bg-zinc-800" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                      <Play className="w-6 h-6 text-zinc-500 dark:text-zinc-600" />
                    </div>
                  )}
                  <label className="btn-secondary text-sm cursor-pointer">
                    {uploadingThumb ? 'Uploading...' : 'Upload Image'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleThumbUpload} />
                  </label>
                </div>
              </div>

              <div>
                <label className="label">Title *</label>
                <input {...register('title', { required: true })} className="input-field" placeholder="Push Up" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea {...register('description')} className="input-field min-h-20 resize-none" placeholder="Exercise description..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category *</label>
                  <select {...register('category', { required: true })} className="input-field">
                    <option value="">Select...</option>
                    {EXERCISE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Focus Area *</label>
                  <select {...register('focusArea', { required: true })} className="input-field">
                    <option value="">Select...</option>
                    {FOCUS_AREAS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Level *</label>
                  <select {...register('level', { required: true })} className="input-field">
                    {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Public</label>
                  <select {...register('isPublic')} className="input-field">
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Video URL (YouTube embed or Cloudinary)</label>
                <input {...register('videoUrl')} className="input-field" placeholder="https://www.youtube.com/embed/..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 btn-primary">{editing ? 'Save' : 'Add Exercise'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
