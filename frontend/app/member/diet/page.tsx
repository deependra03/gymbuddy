'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { dietApi, membersApi } from '@/lib/api';
import { UtensilsCrossed, Clock, Flame, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { formatDate, type PlanAccess } from '@/lib/utils';
import toast from 'react-hot-toast';

type DietPlan = {
  id: string;
  title: string;
  content: string;
  notes?: string;
  createdAt: string;
};

type Meal = {
  name: string;
  items: string[];
  calories?: number;
};

type PlanData = {
  meals?: Meal[];
  totalCalories?: number;
  protein?: string;
  carbs?: string;
  fats?: string;
};

export default function MemberDietPage() {
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<DietPlan[]>([]);
  const [planAccess, setPlanAccess] = useState<PlanAccess>('none');
  const [planStart, setPlanStart] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePlan, setActivePlan] = useState<DietPlan | null>(null);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([dietApi.forMember(user.id), membersApi.get(user.id)])
      .then(([dRes, meRes]) => {
        setPlans(dRes.data);
        if (dRes.data.length > 0) setActivePlan(dRes.data[0]);
        setPlanAccess(meRes.data.planAccess ?? 'none');
        setPlanStart(meRes.data.membershipStart ?? null);
      })
      .catch(() => toast.error('Failed to load diet plan'))
      .finally(() => setLoading(false));
  }, [user]);

  const parsePlan = (content: string): PlanData | null => {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  };

  const macroColor = (label: string) => {
    if (label === 'Protein') return 'text-blue-400 bg-blue-500/10';
    if (label === 'Carbs') return 'text-amber-400 bg-amber-500/10';
    if (label === 'Fats') return 'text-rose-400 bg-rose-500/10';
    return 'text-brand-400 bg-brand-500/10';
  };

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="section-title flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 text-brand-500" /> My Diet Plan
        </h1>
        <p className="text-zinc-500 text-sm">Nutrition plan from your trainer</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="card h-28 animate-pulse" />
          <div className="card h-48 animate-pulse" />
        </div>
      ) : plans.length === 0 ? (
        <div className="card text-center py-16">
          <UtensilsCrossed className="w-14 h-14 text-zinc-400 dark:text-zinc-700 mx-auto mb-3" />
          {planAccess === 'upcoming' && planStart ? (
            <>
              <p className="text-zinc-700 dark:text-zinc-300 font-semibold">Diet plan unlocks with your membership</p>
              <p className="text-zinc-500 text-sm mt-1">
                Your trainer&apos;s plan will be visible from {formatDate(planStart)}.
              </p>
            </>
          ) : planAccess === 'expired' ? (
            <>
              <p className="text-zinc-700 dark:text-zinc-300 font-semibold">Membership plan ended</p>
              <p className="text-zinc-500 text-sm mt-1">Renew to access your nutrition plan again.</p>
            </>
          ) : (
            <>
              <p className="text-zinc-700 dark:text-zinc-300 font-semibold">No diet plan yet</p>
              <p className="text-zinc-500 text-sm mt-1">
                Your trainer will create a customized nutrition plan for you.
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Plan selector (if multiple) */}
          {plans.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setActivePlan(plan)}
                  className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                    activePlan?.id === plan.id
                      ? 'bg-brand-500 text-white'
                      : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {plan.title}
                </button>
              ))}
            </div>
          )}

          {activePlan && (() => {
            const planData = parsePlan(activePlan.content);

            return (
              <div className="space-y-4">
                {/* Plan Header */}
                <div className="card bg-gradient-to-br from-zinc-100 to-zinc-200 border-zinc-300 dark:from-zinc-900 dark:to-zinc-800 dark:border-zinc-700">
                  <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">{activePlan.title}</h2>
                  <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Created {formatDate(activePlan.createdAt)}
                  </p>

                  {/* Macro summary */}
                  {planData && planData.totalCalories && (
                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {[
                        { label: 'Calories', value: `${planData.totalCalories}`, unit: 'kcal' },
                        { label: 'Protein', value: planData.protein || '—', unit: '' },
                        { label: 'Carbs', value: planData.carbs || '—', unit: '' },
                        { label: 'Fats', value: planData.fats || '—', unit: '' },
                      ].map(({ label, value, unit }) => (
                        <div key={label} className={`rounded-xl p-2.5 text-center ${macroColor(label)}`}>
                          <p className="text-[10px] opacity-80 font-medium">{label}</p>
                          <p className="font-black text-sm mt-0.5">{value}</p>
                          {unit && <p className="text-[9px] opacity-60">{unit}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {activePlan.notes && (
                    <div className="flex items-start gap-2 mt-4 p-3 bg-white/60 dark:bg-zinc-800/60 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{activePlan.notes}</p>
                    </div>
                  )}
                </div>

                {/* Meals */}
                {planData?.meals ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Meal Schedule</p>
                    {planData.meals.map((meal, i) => (
                      <div key={i} className="card hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                        <button
                          className="w-full flex items-center justify-between"
                          onClick={() => setExpandedMeal(expandedMeal === meal.name ? null : meal.name)}
                        >
                          <div className="flex items-center gap-3 text-left">
                            <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
                              <span className="text-base">{['🍳', '🥜', '🍱', '🍌', '🥤', '🍽', '🥛'][i % 7]}</span>
                            </div>
                            <div>
                              <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">{meal.name}</p>
                              <p className="text-xs text-zinc-500">{meal.items.length} items{meal.calories ? ` · ${meal.calories} kcal` : ''}</p>
                            </div>
                          </div>
                          {expandedMeal === meal.name ? (
                            <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
                          )}
                        </button>

                        {expandedMeal === meal.name && (
                          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                            {meal.items.map((item, j) => (
                              <div key={j} className="flex items-start gap-2.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                                <p className="text-sm text-zinc-700 dark:text-zinc-300">{item}</p>
                              </div>
                            ))}
                            {meal.calories && (
                              <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-200 dark:border-zinc-800/60">
                                <Flame className="w-3.5 h-3.5 text-orange-400" />
                                <p className="text-xs text-zinc-500">{meal.calories} calories</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Plain text plan */
                  <div className="card">
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{activePlan.content}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
