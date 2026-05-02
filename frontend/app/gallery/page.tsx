'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { galleryApi } from '@/lib/api';
import { Image, Search, Play, X, ArrowLeft, Tag } from 'lucide-react';

type GalleryItem = {
  id: string;
  title: string;
  description?: string;
  type: string;
  imageUrl?: string;
  videoUrl?: string;
  tags: string[];
  createdAt: string;
};

export default function PublicGalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [activeVideo, setActiveVideo] = useState<GalleryItem | null>(null);
  const [activeImage, setActiveImage] = useState<GalleryItem | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await galleryApi.list({
        type: filterType || undefined,
        search: search || undefined,
      });
      setItems(res.data);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [filterType, search]);

  useEffect(() => {
    const t = setTimeout(fetchItems, 300);
    return () => clearTimeout(t);
  }, [fetchItems]);

  const recipes = items.filter((i) => i.type === 'recipe');
  const exercises = items.filter((i) => i.type === 'exercise');

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/60">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-black text-white text-lg leading-none">Gallery</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Recipes & exercise tutorials</p>
          </div>
        </div>

        {/* Search and filter */}
        <div className="max-w-4xl mx-auto px-4 pb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search recipes & tutorials..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex gap-2">
            {[
              { value: '', label: 'All' },
              { value: 'recipe', label: '🍽 Recipes' },
              { value: 'exercise', label: '💪 Tutorials' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilterType(value)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  filterType === value
                    ? 'bg-brand-500 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card h-52 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Image className="w-14 h-14 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400">No items found</p>
          </div>
        ) : (
          <>
            {/* Recipes */}
            {(filterType === '' || filterType === 'recipe') && recipes.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-400" />
                  Recipes ({recipes.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recipes.map((item) => (
                    <GalleryCard
                      key={item.id}
                      item={item}
                      onOpen={() => item.videoUrl ? setActiveVideo(item) : setActiveImage(item)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Exercise tutorials */}
            {(filterType === '' || filterType === 'exercise') && exercises.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-500" />
                  Exercise Tutorials ({exercises.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {exercises.map((item) => (
                    <GalleryCard
                      key={item.id}
                      item={item}
                      onOpen={() => item.videoUrl ? setActiveVideo(item) : setActiveImage(item)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Image lightbox */}
      {activeImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={() => setActiveImage(null)}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800" onClick={(e) => e.stopPropagation()}>
            <div>
              <p className="font-bold text-white text-sm">{activeImage.title}</p>
              {activeImage.description && (
                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{activeImage.description}</p>
              )}
            </div>
            <button onClick={() => setActiveImage(null)} className="p-2 rounded-full bg-zinc-800 text-zinc-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            {activeImage.imageUrl && (
              <img
                src={activeImage.imageUrl}
                alt={activeImage.title}
                className="max-w-full max-h-full object-contain rounded-xl"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
          {activeImage.description && (
            <div className="px-4 pb-6 text-center">
              <p className="text-sm text-zinc-400">{activeImage.description}</p>
              {activeImage.tags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                  {activeImage.tags.map((tag) => (
                    <span key={tag} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Video modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div>
              <p className="font-bold text-white text-sm">{activeVideo.title}</p>
              <p className="text-xs text-zinc-400 capitalize">{activeVideo.type}</p>
            </div>
            <button onClick={() => setActiveVideo(null)} className="p-2 rounded-full bg-zinc-800 text-zinc-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="aspect-video w-full bg-zinc-900">
            <iframe
              src={activeVideo.videoUrl}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activeVideo.description && (
              <p className="text-sm text-zinc-400 leading-relaxed">{activeVideo.description}</p>
            )}
            {activeVideo.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activeVideo.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full">#{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GalleryCard({ item, onOpen }: { item: GalleryItem; onOpen: () => void }) {
  const hasVideo = !!item.videoUrl;

  return (
    <div
      className="card hover:border-zinc-700 transition-colors cursor-pointer group overflow-hidden"
      onClick={onOpen}
    >
      <div className="relative -mx-5 -mt-5 mb-4 h-44 bg-zinc-800 rounded-t-2xl overflow-hidden">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image className="w-10 h-10 text-zinc-700" />
          </div>
        )}
        {hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center shadow-xl">
              <Play className="w-5 h-5 text-white" />
            </div>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className={`badge text-[10px] ${item.type === 'recipe' ? 'bg-orange-500/80 text-white' : 'bg-brand-500/80 text-white'}`}>
            {item.type === 'recipe' ? '🍽 Recipe' : '💪 Tutorial'}
          </span>
        </div>
        {hasVideo && (
          <div className="absolute top-2 right-2">
            <span className="badge bg-black/60 text-white text-[10px] flex items-center gap-1">
              <Play className="w-2.5 h-2.5" /> Video
            </span>
          </div>
        )}
      </div>

      <h3 className="font-semibold text-zinc-100 text-sm mb-1 line-clamp-1">{item.title}</h3>
      {item.description && (
        <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{item.description}</p>
      )}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">#{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}
