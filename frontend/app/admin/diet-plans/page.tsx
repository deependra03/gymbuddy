'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { UtensilsCrossed, Plus, X, Edit3, Trash2, User, ChevronDown, ChevronUp, Download, MessageCircle } from 'lucide-react';
import { membersApi, dietApi, sendApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

type Member = { id: string; name: string; phone: string };
type DietPlan = { id: string; memberId: string; title: string; content: string; notes?: string; createdAt: string };

export default function AdminDietPlansPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [plans, setPlans] = useState<DietPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DietPlan | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  const { register, handleSubmit, reset } = useForm<any>();

  useEffect(() => {
    membersApi.list().then((r) => setMembers(r.data)).catch(() => {});
  }, []);

  const fetchPlans = useCallback(async (memberId: string) => {
    setLoading(true);
    try {
      const res = await dietApi.forMember(memberId);
      setPlans(res.data);
    } catch {
      toast.error('Failed to load diet plans');
    } finally {
      setLoading(false);
    }
  }, []);

  const selectMember = (m: Member) => {
    setSelectedMember(m);
    fetchPlans(m.id);
    setExpandedPlan(null);
  };

  const openAdd = () => {
    setEditing(null);
    reset({ title: '', content: '', notes: '' });
    setShowModal(true);
  };

  const openEdit = (plan: DietPlan) => {
    setEditing(plan);
    let content = plan.content;
    try {
      const parsed = JSON.parse(plan.content);
      content = JSON.stringify(parsed, null, 2);
    } catch {}
    reset({ title: plan.title, content, notes: plan.notes || '' });
    setShowModal(true);
  };

  const onSubmit = async (data: any) => {
    if (!selectedMember) return;
    try {
      if (editing) {
        await dietApi.update(editing.id, data);
        toast.success('Diet plan updated');
      } else {
        await dietApi.create({ memberId: selectedMember.id, ...data });
        toast.success('Diet plan created');
      }
      setShowModal(false);
      fetchPlans(selectedMember.id);
    } catch {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this diet plan?')) return;
    try {
      await dietApi.delete(id);
      toast.success('Deleted');
      fetchPlans(selectedMember!.id);
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleDownloadPDF = async (planId: string, title: string) => {
    try {
      const res = await sendApi.dietPlanPDF(planId);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_')}_diet_plan.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to download PDF');
    }
  };

  const handleSendWhatsApp = async (planId: string) => {
    try {
      await sendApi.dietPlanPDF(planId, 'whatsapp');
      toast.success('Diet plan sent via WhatsApp');
    } catch {
      toast.error('Failed to send via WhatsApp');
    }
  };

  const renderMeals = (content: string) => {
    try {
      const data = JSON.parse(content);
      if (data.meals) {
        return (
          <div className="space-y-3">
            {data.meals.map((meal: any, i: number) => (
              <div key={i} className="bg-zinc-100 dark:bg-zinc-800/50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-zinc-800 dark:text-zinc-200">{meal.name}</span>
                  {meal.calories && <span className="text-xs text-brand-400 font-semibold">{meal.calories} kcal</span>}
                </div>
                <ul className="space-y-1">
                  {meal.items.map((item: string, j: number) => (
                    <li key={j} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-1.5">
                      <span className="text-brand-500 mt-0.5">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {data.totalCalories && (
              <div className="flex justify-between text-sm border-t border-zinc-200 dark:border-zinc-800 pt-3 mt-3">
                <span className="text-zinc-600 dark:text-zinc-400">Total</span>
                <span className="font-bold text-brand-400">{data.totalCalories} kcal · {data.protein} protein</span>
              </div>
            )}
          </div>
        );
      }
    } catch {}
    return <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{content}</p>;
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title flex items-center gap-2"><UtensilsCrossed className="w-5 h-5 text-brand-500" /> Diet Plans</h1>
          <p className="text-zinc-500 text-sm">Create and manage member diet plans</p>
        </div>
        {selectedMember && (
          <button onClick={openAdd} className="btn-primary">
            <Plus className="w-4 h-4" /> New Plan
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Member list */}
        <div className="card h-fit">
          <h2 className="font-semibold text-zinc-800 dark:text-zinc-300 mb-3 text-sm">Select Member</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => selectMember(m)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  selectedMember?.id === m.id
                    ? 'bg-brand-500/10 border border-brand-500/30'
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-400">
                  {m.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{m.name}</p>
                  <p className="text-xs text-zinc-500">{m.phone}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedMember ? (
            <div className="card text-center py-16">
              <UtensilsCrossed className="w-12 h-12 text-zinc-400 dark:text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-600 dark:text-zinc-400">Select a member to view their diet plans</p>
            </div>
          ) : loading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => <div key={i} className="card h-32 animate-pulse" />)}
            </div>
          ) : plans.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">No diet plans for {selectedMember.name}</p>
              <button onClick={openAdd} className="btn-primary mx-auto">
                <Plus className="w-4 h-4" /> Create First Plan
              </button>
            </div>
          ) : (
            plans.map((plan) => (
              <div key={plan.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{plan.title}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{formatDate(plan.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleDownloadPDF(plan.id, plan.title)} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400" title="Download PDF">
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleSendWhatsApp(plan.id)} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400" title="Send via WhatsApp">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEdit(plan)} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(plan.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                      className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400"
                    >
                      {expandedPlan === plan.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {plan.notes && <p className="text-xs text-zinc-500 mt-2 italic">{plan.notes}</p>}
                {expandedPlan === plan.id && (
                  <div className="mt-4 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                    {renderMeals(plan.content)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-white dark:bg-zinc-900 flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{editing ? 'Edit Diet Plan' : 'New Diet Plan'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="label">Plan Title *</label>
                <input {...register('title', { required: true })} className="input-field" placeholder="Week 1 - Muscle Building" />
              </div>
              <div>
                <label className="label">Content (JSON or plain text) *</label>
                <textarea
                  {...register('content', { required: true })}
                  className="input-field font-mono text-xs min-h-48 resize-none"
                  placeholder='{"meals": [{"name": "Breakfast 7am", "items": ["4 eggs", "Oats"], "calories": 500}], "totalCalories": 2500}'
                />
                <p className="text-xs text-zinc-600 mt-1">Tip: Use JSON format for structured meal plans, or write plain text.</p>
              </div>
              <div>
                <label className="label">Notes</label>
                <input {...register('notes')} className="input-field" placeholder="Drink 3L water daily..." />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 btn-primary">{editing ? 'Save' : 'Create Plan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
