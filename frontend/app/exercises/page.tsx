'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { exercisesApi } from '@/lib/api';
import {
  Dumbbell, Search, Play, X, ArrowLeft, Filter,
} from 'lucide-react';
import { getBadgeClass, getYouTubeEmbedUrl, EXERCISE_CATEGORIES, LEVELS } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';

type Exercise = {
  id: string;
  title: string;
  description?: string;
  category: string;
  focusArea: string;
  level: string;
  videoUrl?: string;
  thumbnailUrl?: string;
};

export default function PublicExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [activeVideo, setActiveVideo] = useState<Exercise | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchExercises = useCallback(async () => {
    try {
      const res = await exercisesApi.list({
        search: search || undefined,
        category: filterCategory || undefined,
        level: filterLevel || undefined,
      });
      setExercises(res.data);
    } catch {
      // silent fail for public page
    } finally {
      setLoading(false);
    }
  }, [search, filterCategory, filterLevel]);

  useEffect(() => {
    const t = setTimeout(fetchExercises, 300);
    return () => clearTimeout(t);
  }, [fetchExercises]);

  const grouped = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    acc[ex.category] = acc[ex.category] || [];
    acc[ex.category].push(ex);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/60">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-black text-zinc-900 dark:text-white text-lg leading-none">Exercise Library</h1>
              <p className="text-xs text-zinc-500 mt-0.5">{exercises.length} exercises</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search exercises..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="max-w-4xl mx-auto px-4 pb-4 flex flex-wrap gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="input-field text-sm w-auto flex-1 min-w-32"
            >
              <option value="">All categories</option>
              {EXERCISE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="input-field text-sm w-auto flex-1 min-w-32"
            >
              <option value="">All levels</option>
              {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            {(filterCategory || filterLevel) && (
              <button
                onClick={() => { setFilterCategory(''); setFilterLevel(''); }}
                className="btn-secondary text-xs px-3 py-2"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        )}
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card h-52 animate-pulse" />
            ))}
          </div>
        ) : exercises.length === 0 ? (
          <div className="text-center py-20">
            <Dumbbell className="w-14 h-14 text-zinc-400 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-600 dark:text-zinc-400 font-medium">No exercises found</p>
          </div>
        ) : (
          Object.entries(grouped).map(([category, exs]) => (
            <div key={category}>
              <h2 className="text-sm font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-500" />
                {category}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {exs.map((ex) => (
                  <div
                    key={ex.id}
                    className="card hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer group"
                    onClick={() => setActiveVideo(ex)}
                  >
                    <div className="relative -mx-5 -mt-5 mb-4 h-40 bg-zinc-200 dark:bg-zinc-800 rounded-t-2xl overflow-hidden">
                      {ex.thumbnailUrl ? (
                        <img src={ex.thumbnailUrl} alt={ex.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Dumbbell className="w-10 h-10 text-zinc-500 dark:text-zinc-700" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center shadow-xl">
                          <Play className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{ex.title}</h3>
                      <span className={getBadgeClass(ex.level)}>{ex.level}</span>
                    </div>
                    {ex.description && (
                      <p className="text-xs text-zinc-500 line-clamp-2 mt-1">{ex.description}</p>
                    )}
                    <p className="text-xs text-zinc-500 dark:text-zinc-600 mt-2">{ex.focusArea}</p>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>

      {/* Video Modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div>
              <p className="font-bold text-white text-sm">{activeVideo.title}</p>
              <p className="text-xs text-zinc-400">{activeVideo.category} · {activeVideo.focusArea}</p>
            </div>
            <button onClick={() => setActiveVideo(null)} className="p-2 rounded-full bg-zinc-800 text-zinc-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="aspect-video w-full bg-zinc-900">
            {activeVideo.videoUrl ? (
              <iframe
                src={getYouTubeEmbedUrl(activeVideo.videoUrl)}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-zinc-600 text-sm">No video available</p>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex gap-2">
              <span className={getBadgeClass(activeVideo.level)}>{activeVideo.level}</span>
              <span className="badge bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{activeVideo.focusArea}</span>
            </div>
            {activeVideo.description && (
              <p className="text-sm text-zinc-400 leading-relaxed">{activeVideo.description}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
