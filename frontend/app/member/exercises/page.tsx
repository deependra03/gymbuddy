'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { exercisesApi, membersApi } from '@/lib/api';
import { Dumbbell, Play, X } from 'lucide-react';
import { formatDate, getBadgeClass, getYouTubeEmbedUrl, type PlanAccess } from '@/lib/utils';
import toast from 'react-hot-toast';

type Assignment = {
  id: string;
  notes?: string;
  assignedAt: string;
  exercise: {
    id: string;
    title: string;
    description?: string;
    category: string;
    focusArea: string;
    level: string;
    videoUrl?: string;
    thumbnailUrl?: string;
  };
};

export default function MemberExercisesPage() {
  const { user } = useAuthStore();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [planAccess, setPlanAccess] = useState<PlanAccess>('none');
  const [planStart, setPlanStart] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<Assignment | null>(null);
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([exercisesApi.forMember(user.id), membersApi.get(user.id)])
      .then(([exRes, meRes]) => {
        setAssignments(exRes.data);
        setPlanAccess(meRes.data.planAccess ?? 'none');
        setPlanStart(meRes.data.membershipStart ?? null);
      })
      .catch(() => toast.error('Failed to load exercises'))
      .finally(() => setLoading(false));
  }, [user]);

  const categories = [...new Set(assignments.map((a) => a.exercise.category))];
  const filtered = filterCategory
    ? assignments.filter((a) => a.exercise.category === filterCategory)
    : assignments;

  const grouped = filtered.reduce<Record<string, Assignment[]>>((acc, a) => {
    const cat = a.exercise.category;
    acc[cat] = acc[cat] || [];
    acc[cat].push(a);
    return acc;
  }, {});

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="section-title flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-brand-500" /> My Exercises
        </h1>
        <p className="text-zinc-500 text-sm">
          {planAccess === 'upcoming' || planAccess === 'expired'
            ? 'Trainer assignments follow your membership dates'
            : `${assignments.length} exercises assigned by your trainer`}
        </p>
      </div>

      {/* Category filter pills */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setFilterCategory('')}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              !filterCategory ? 'bg-brand-500 text-white' : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                filterCategory === cat ? 'bg-brand-500 text-white' : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Exercise list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-24 animate-pulse" />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div className="card text-center py-16">
          <Dumbbell className="w-14 h-14 text-zinc-400 dark:text-zinc-700 mx-auto mb-3" />
          {planAccess === 'upcoming' && planStart ? (
            <>
              <p className="text-zinc-700 dark:text-zinc-300 font-semibold">Your plan has not started</p>
              <p className="text-zinc-500 text-sm mt-1">
                Assigned workouts appear on {formatDate(planStart)}. Public exercises in the library stay available.
              </p>
            </>
          ) : planAccess === 'expired' ? (
            <>
              <p className="text-zinc-700 dark:text-zinc-300 font-semibold">Membership plan ended</p>
              <p className="text-zinc-500 text-sm mt-1">Renew at the gym to unlock trainer assignments again.</p>
            </>
          ) : (
            <>
              <p className="text-zinc-700 dark:text-zinc-300 font-semibold">No exercises assigned yet</p>
              <p className="text-zinc-500 text-sm mt-1">Your trainer will assign exercises to your plan soon.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, group]) => (
            <div key={category}>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-500" />
                {category}
              </p>
              <div className="space-y-3">
                {group.map((assignment) => (
                  <ExerciseCard
                    key={assignment.id}
                    assignment={assignment}
                    onPlay={() => setActiveVideo(assignment)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div>
              <p className="font-bold text-white text-sm">{activeVideo.exercise.title}</p>
              <p className="text-xs text-zinc-400">{activeVideo.exercise.category} · {activeVideo.exercise.focusArea}</p>
            </div>
            <button
              onClick={() => setActiveVideo(null)}
              className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Video */}
          <div className="aspect-video w-full bg-zinc-900">
            {activeVideo.exercise.videoUrl ? (
              <iframe
                src={getYouTubeEmbedUrl(activeVideo.exercise.videoUrl)}
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

          {/* Details */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className={getBadgeClass(activeVideo.exercise.level)}>{activeVideo.exercise.level}</span>
              <span className="badge bg-zinc-800 text-zinc-400">{activeVideo.exercise.focusArea}</span>
            </div>

            {activeVideo.notes && (
              <div className="card bg-brand-500/5 border-brand-500/20">
                <p className="text-xs font-semibold text-brand-400 mb-1">Trainer's Note</p>
                <p className="text-sm text-zinc-300">{activeVideo.notes}</p>
              </div>
            )}

            {activeVideo.exercise.description && (
              <div>
                <p className="text-sm font-semibold text-zinc-300 mb-1">How to perform</p>
                <p className="text-sm text-zinc-400 leading-relaxed">{activeVideo.exercise.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ExerciseCard({
  assignment,
  onPlay,
}: {
  assignment: Assignment;
  onPlay: () => void;
}) {
  const ex = assignment.exercise;
  return (
    <div className="card flex items-center gap-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
      {/* Thumbnail */}
      <div className="relative w-16 h-16 rounded-xl bg-zinc-200 dark:bg-zinc-800 overflow-hidden shrink-0">
        {ex.thumbnailUrl ? (
          <img src={ex.thumbnailUrl} alt={ex.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Dumbbell className="w-6 h-6 text-zinc-500 dark:text-zinc-600" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm truncate">{ex.title}</p>
        <p className="text-xs text-zinc-500 mt-0.5 truncate">{assignment.notes || ex.description || ex.focusArea}</p>
        <div className="flex gap-1.5 mt-1.5">
          <span className={getBadgeClass(ex.level)}>{ex.level}</span>
        </div>
      </div>

      {/* Play button */}
      <button
        onClick={onPlay}
        className="w-10 h-10 rounded-full bg-brand-500/10 hover:bg-brand-500/20 flex items-center justify-center shrink-0 transition-colors border border-brand-500/20"
      >
        <Play className="w-4 h-4 text-brand-600 dark:text-brand-400" />
      </button>
    </div>
  );
}
