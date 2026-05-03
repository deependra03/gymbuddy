'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Image, Plus, X, Edit3, Trash2, Play, Search, Tag, Upload } from 'lucide-react';
import { galleryApi, uploadApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

type GalleryItem = {
  id: string;
  title: string;
  description?: string;
  type: string;
  imageUrl?: string;
  videoUrl?: string;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
};

export default function AdminGalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [tagsInput, setTagsInput] = useState('');

  const { register, handleSubmit, reset, setValue, watch } = useForm<any>();

  const fetchItems = useCallback(async () => {
    try {
      const res = await galleryApi.list({
        type: filterType || undefined,
        search: search || undefined,
      });
      setItems(res.data);
    } catch {
      toast.error('Failed to load gallery');
    } finally {
      setLoading(false);
    }
  }, [filterType, search]);

  useEffect(() => {
    const t = setTimeout(fetchItems, 300);
    return () => clearTimeout(t);
  }, [fetchItems]);

  const openAdd = () => {
    setEditing(null);
    setTagsInput('');
    reset({ type: 'recipe', isPublic: true });
    setShowModal(true);
  };

  const openEdit = (item: GalleryItem) => {
    setEditing(item);
    setTagsInput(item.tags.join(', '));
    reset({
      title: item.title,
      description: item.description || '',
      type: item.type,
      imageUrl: item.imageUrl || '',
      videoUrl: item.videoUrl || '',
      isPublic: item.isPublic,
    });
    setShowModal(true);
  };

  const onSubmit = async (data: any) => {
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = { ...data, tags, isPublic: data.isPublic === 'true' || data.isPublic === true };

    try {
      if (editing) {
        await galleryApi.update(editing.id, payload);
        toast.success('Item updated');
      } else {
        await galleryApi.create(payload);
        toast.success('Item added to gallery');
      }
      setShowModal(false);
      fetchItems();
    } catch {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this gallery item?')) return;
    try {
      await galleryApi.delete(id);
      toast.success('Deleted');
      fetchItems();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const res = await uploadApi.image(file, 'gallery');
      setValue('imageUrl', res.data.url);
      toast.success('Image uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const imageUrl = watch('imageUrl');

  const recipes = items.filter((i) => i.type === 'recipe');
  const exercises = items.filter((i) => i.type === 'exercise');

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <Image className="w-5 h-5 text-brand-500" /> Gallery
          </h1>
          <p className="text-zinc-500 text-sm">{items.length} items · public showcase</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search gallery..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['', 'recipe', 'exercise'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                filterType === t
                  ? 'bg-brand-500 text-white'
                  : 'bg-zinc-200 text-zinc-600 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              {t === '' ? 'All' : t === 'recipe' ? '🍽 Recipes' : '💪 Exercises'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card h-56 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card text-center py-16">
          <Image className="w-12 h-12 text-zinc-400 dark:text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-600 dark:text-zinc-400 font-medium">Gallery is empty</p>
          <button onClick={openAdd} className="btn-primary mx-auto mt-4">
            <Plus className="w-4 h-4" /> Add First Item
          </button>
        </div>
      ) : (
        <>
          {/* Recipes Section */}
          {(filterType === '' || filterType === 'recipe') && recipes.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                Recipes ({recipes.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recipes.map((item) => (
                  <GalleryCard
                    key={item.id}
                    item={item}
                    onEdit={() => openEdit(item)}
                    onDelete={() => handleDelete(item.id)}
                    onPreview={() => item.videoUrl && setPreviewVideo(item.videoUrl)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Exercise Tutorials Section */}
          {(filterType === '' || filterType === 'exercise') && exercises.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-500 inline-block" />
                Exercise Tutorials ({exercises.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {exercises.map((item) => (
                  <GalleryCard
                    key={item.id}
                    item={item}
                    onEdit={() => openEdit(item)}
                    onDelete={() => handleDelete(item.id)}
                    onPreview={() => item.videoUrl && setPreviewVideo(item.videoUrl)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Video Preview */}
      {previewVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
          onClick={() => setPreviewVideo(null)}
        >
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewVideo(null)} className="mb-3 btn-secondary ml-auto flex">
              <X className="w-4 h-4" /> Close
            </button>
            <div className="aspect-video rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900">
              <iframe src={previewVideo} className="w-full h-full" allowFullScreen />
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-white dark:bg-zinc-900 flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{editing ? 'Edit Gallery Item' : 'Add to Gallery'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              {/* Image upload */}
              <div>
                <label className="label">Cover Image</label>
                <div className="flex items-center gap-3">
                  {imageUrl ? (
                    <img src={imageUrl} className="w-20 h-16 rounded-xl object-cover bg-zinc-200 dark:bg-zinc-800" />
                  ) : (
                    <div className="w-20 h-16 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                      <Image className="w-6 h-6 text-zinc-500 dark:text-zinc-600" />
                    </div>
                  )}
                  <label className="btn-secondary text-sm cursor-pointer">
                    {uploadingImage ? 'Uploading...' : 'Upload Image'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
              </div>

              <div>
                <label className="label">Title *</label>
                <input {...register('title', { required: true })} className="input-field" placeholder="Protein Smoothie Bowl" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea {...register('description')} className="input-field min-h-20 resize-none" placeholder="High protein breakfast..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Type *</label>
                  <select {...register('type', { required: true })} className="input-field">
                    <option value="recipe">Recipe</option>
                    <option value="exercise">Exercise Tutorial</option>
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
                <label className="label">Video URL (optional)</label>
                <input {...register('videoUrl')} className="input-field" placeholder="https://www.youtube.com/embed/..." />
              </div>
              <div>
                <label className="label">Tags (comma separated)</label>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="input-field"
                  placeholder="protein, breakfast, healthy"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 btn-primary">{editing ? 'Save' : 'Add Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function GalleryCard({
  item,
  onEdit,
  onDelete,
  onPreview,
}: {
  item: GalleryItem;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
}) {
  return (
    <div className="card hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors group overflow-hidden">
      <div className="relative -mx-5 -mt-5 mb-4 h-40 bg-zinc-200 dark:bg-zinc-800 rounded-t-2xl overflow-hidden">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image className="w-10 h-10 text-zinc-500 dark:text-zinc-700" />
          </div>
        )}
        {item.videoUrl && (
          <button
            onClick={onPreview}
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center shadow-lg">
              <Play className="w-5 h-5 text-white" />
            </div>
          </button>
        )}
        <div className="absolute top-2 right-2">
          <span
            className={`badge text-[10px] ${
              item.type === 'recipe'
                ? 'bg-orange-500/20 text-orange-300'
                : 'bg-brand-500/20 text-brand-300'
            }`}
          >
            {item.type === 'recipe' ? '🍽 Recipe' : '💪 Exercise'}
          </span>
        </div>
      </div>

      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm mb-1 line-clamp-1">{item.title}</h3>
      {item.description && (
        <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{item.description}</p>
      )}

      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 px-2 py-0.5 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onEdit} className="flex-1 btn-secondary text-xs py-2">
          <Edit3 className="w-3.5 h-3.5" /> Edit
        </button>
        <button onClick={onDelete} className="flex-1 btn-danger text-xs py-2">
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>
    </div>
  );
}
