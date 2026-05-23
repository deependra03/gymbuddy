'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import { payrollApi } from '@/lib/api';
import {
  DollarSign,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Filter,
  Loader2,
  FileText,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';

type PayrollPreview = {
  userId: string;
  name: string;
  role: string;
  baseSalary: number;
  originalBaseSalary: number;
  sessionEarnings: number;
  completedSessions: number;
  hoursWorked: number;
  attendanceDays: number;
  proRataDays: number | null;
  proRataMonths: number | null;
  isProRata: boolean;
  suggestedTotal: number;
};

const ROLE_LABELS: Record<string, string> = {
  trainer: 'Trainer',
  gym_admin: 'Gym Admin',
  admin: 'Admin',
};

export default function PayrollPage() {
  const { user } = useAuthStore();
  const [payroll, setPayroll] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [preview, setPreview] = useState<PayrollPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    baseSalary: '',
    bonus: '0',
    deductions: '0',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    paymentReference: '',
    notes: '',
    periodStart: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    periodEnd: new Date().toISOString().split('T')[0],
    useProRata: false,
    generateInvoice: false,
  });
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
  });

  const isPayrollAdmin =
    user?.role === 'admin' || user?.role === 'gym_admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (isPayrollAdmin) {
      fetchPayroll();
      fetchStats();
      fetchEmployees();
    }
  }, [user, filters, isPayrollAdmin]);

  const fetchPayroll = async () => {
    try {
      const res = await payrollApi.list(filters);
      setPayroll(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await payrollApi.stats(filters);
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await payrollApi.employees();
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load employees');
    }
  };

  const loadPreview = useCallback(async () => {
    if (!formData.userId || !formData.periodStart || !formData.periodEnd) {
      setPreview(null);
      return;
    }
    if (formData.periodStart > formData.periodEnd) {
      setPreview(null);
      return;
    }

    setPreviewLoading(true);
    try {
      const res = await payrollApi.preview({
        userId: formData.userId,
        periodStart: formData.periodStart,
        periodEnd: formData.periodEnd,
        useProRata: formData.useProRata ? 'true' : 'false',
      });
      const data = res.data as PayrollPreview;
      setPreview(data);
      setFormData((prev) => ({
        ...prev,
        baseSalary: String(data.baseSalary),
      }));
    } catch (err: any) {
      setPreview(null);
      toast.error(err.response?.data?.error || 'Failed to calculate payroll');
    } finally {
      setPreviewLoading(false);
    }
  }, [formData.userId, formData.periodStart, formData.periodEnd, formData.useProRata]);

  useEffect(() => {
    if (!showForm) return;
    const timer = setTimeout(loadPreview, 400);
    return () => clearTimeout(timer);
  }, [showForm, loadPreview]);

  const handleEmployeeChange = (userId: string) => {
    const emp = employees.find((e) => e.id === userId);
    setFormData((prev) => ({
      ...prev,
      userId,
      baseSalary: emp?.baseSalary != null ? String(emp.baseSalary) : '',
    }));
    setPreview(null);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const computedTotal = () => {
    const base = parseFloat(formData.baseSalary) || 0;
    const sessions = preview?.sessionEarnings ?? 0;
    const bonus = parseFloat(formData.bonus) || 0;
    const deductions = parseFloat(formData.deductions) || 0;
    return base + sessions + bonus - deductions;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId) {
      toast.error('Select an employee');
      return;
    }
    setSubmitting(true);
    try {
      await payrollApi.create({
        userId: formData.userId,
        baseSalary: parseFloat(formData.baseSalary) || 0,
        bonus: parseFloat(formData.bonus) || 0,
        deductions: parseFloat(formData.deductions) || 0,
        paymentDate: formData.paymentDate,
        paymentMethod: formData.paymentMethod || undefined,
        paymentReference: formData.paymentReference || undefined,
        notes: formData.notes || undefined,
        periodStart: formData.periodStart,
        periodEnd: formData.periodEnd,
        useProRata: formData.useProRata,
        generateInvoice: formData.generateInvoice,
      });
      toast.success('Payroll created');
      setShowForm(false);
      setPreview(null);
      setFormData({
        userId: '',
        baseSalary: '',
        bonus: '0',
        deductions: '0',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: '',
        paymentReference: '',
        notes: '',
        periodStart: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        periodEnd: new Date().toISOString().split('T')[0],
        useProRata: false,
        generateInvoice: false,
      });
      fetchPayroll();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create payroll record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    const paymentMethod = prompt('Enter payment method (cash, bank_transfer, upi, card):');
    if (!paymentMethod) return;
    const paymentReference = prompt('Enter payment reference (optional):') || '';

    try {
      await payrollApi.markPaid(id, { paymentMethod, paymentReference });
      toast.success('Marked as paid');
      fetchPayroll();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to mark as paid');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payroll record?')) return;

    try {
      await payrollApi.delete(id);
      toast.success('Payroll deleted');
      fetchPayroll();
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete payroll record');
    }
  };

  const handleGenerateInvoice = async (id: string) => {
    try {
      const res = await payrollApi.generateInvoice(id);
      toast.success('Invoice generated successfully');
      fetchPayroll();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to generate invoice');
    }
  };

  const handleViewInvoice = async (id: string) => {
    try {
      const res = await payrollApi.getInvoice(id);
      const invoice = res.data;
      alert(`Invoice #${invoice.invoiceNumber}\nAmount: ${formatCurrency(invoice.amount)}\nStatus: ${invoice.status}\nIssue Date: ${formatDate(invoice.issueDate)}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to fetch invoice');
    }
  };

  const handleDownloadInvoicePDF = async (id: string) => {
    try {
      const res = await payrollApi.downloadInvoicePDF(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Invoice downloaded successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to download invoice');
    }
  };

  const handleDownloadSalarySlipPDF = async (id: string) => {
    try {
      const res = await payrollApi.downloadSalarySlipPDF(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `salary-slip-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Salary slip downloaded successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to download salary slip');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      paid: 'bg-green-500/10 text-green-600 dark:text-green-400',
      cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400',
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  if (!isPayrollAdmin) {
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
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Payroll</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Base salary + completed training sessions for the selected period
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Payroll
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="card">
            <p className="text-xs text-zinc-500 mb-1">Total Paid</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(stats.totalPaid)}
            </p>
          </div>
          <div className="card">
            <p className="text-xs text-zinc-500 mb-1">Pending</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(stats.totalPending)}
            </p>
          </div>
          <div className="card">
            <p className="text-xs text-zinc-500 mb-1">Total Records</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.statusBreakdown?.reduce((sum: number, s: any) => sum + s.count, 0) || 0}
            </p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
            />
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
              Create Payroll Record
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Employee / Trainer</label>
                <select
                  required
                  value={formData.userId}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                >
                  <option value="">Select employee or trainer</option>
                  {employees.length === 0 && (
                    <option disabled value="">
                      No staff found — add trainers with base salary in Trainers
                    </option>
                  )}
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {ROLE_LABELS[emp.role] || emp.role}
                      {emp.baseSalary != null ? ` (₹${emp.baseSalary}/mo)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Period Start</label>
                  <input
                    type="date"
                    required
                    value={formData.periodStart}
                    onChange={(e) =>
                      setFormData({ ...formData, periodStart: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Period End</label>
                  <input
                    type="date"
                    required
                    value={formData.periodEnd}
                    onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={formData.useProRata}
                    onChange={(e) => setFormData({ ...formData, useProRata: e.target.checked })}
                    className="rounded border-zinc-300"
                  />
                  Use Pro-rata Calculation
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={formData.generateInvoice}
                    onChange={(e) => setFormData({ ...formData, generateInvoice: e.target.checked })}
                    className="rounded border-zinc-300"
                  />
                  Generate Invoice
                </label>
              </div>

              {previewLoading && (
                <div className="flex items-center gap-2 text-sm text-zinc-500 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calculating from period...
                </div>
              )}

              {preview && !previewLoading && (
                <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-4 space-y-2 text-sm">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">{preview.name}</p>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Base salary</span>
                    <span>{formatCurrency(preview.baseSalary)}</span>
                  </div>
                  {preview.isProRata && (
                    <div className="flex justify-between text-amber-600 dark:text-amber-400">
                      <span className="text-zinc-500">Pro-rata calculation</span>
                      <span>
                        {preview.proRataDays ? `${preview.proRataDays} days` : ''}
                        {preview.proRataMonths ? `${preview.proRataMonths} months` : ''}
                      </span>
                    </div>
                  )}
                  {preview.role === 'trainer' && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">
                        Sessions ({preview.completedSessions} completed)
                      </span>
                      <span>{formatCurrency(preview.sessionEarnings)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Hours worked
                    </span>
                    <span>{preview.hoursWorked}h ({preview.attendanceDays} days)</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700 font-medium">
                    <span>Subtotal (base + sessions)</span>
                    <span>{formatCurrency(preview.suggestedTotal)}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Base Salary (editable)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.baseSalary}
                  onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Bonus</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.bonus}
                    onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Deductions</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.deductions}
                    onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-brand-500/10 border border-brand-500/20 px-4 py-3 flex justify-between items-center">
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Total payout
                </span>
                <span className="text-lg font-bold text-brand-600 dark:text-brand-400">
                  {formatCurrency(computedTotal())}
                </span>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Payment Date</label>
                <input
                  type="date"
                  required
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Payment Method</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                >
                  <option value="">Select Method</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Payment Reference</label>
                <input
                  type="text"
                  value={formData.paymentReference}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentReference: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setPreview(null);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || previewLoading || !preview}
                  className="flex-1 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Payroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded" />
            ))}
          </div>
        ) : payroll.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
            <p className="text-zinc-600 dark:text-zinc-400">No payroll records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">
                    Employee
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">
                    Period
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">
                    Base + Sessions
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">
                    Total
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {payroll.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium">{record.user.name}</p>
                      <p className="text-xs text-zinc-500">
                        {ROLE_LABELS[record.user.role] || record.user.role}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {formatDate(record.periodStart)} – {formatDate(record.periodEnd)}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <p>{formatCurrency(record.baseSalary)}</p>
                      {(record.sessionEarnings ?? 0) > 0 && (
                        <p className="text-xs text-zinc-500">
                          + {formatCurrency(record.sessionEarnings)} sessions
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-semibold">
                        {formatCurrency(record.totalAmount)}
                      </span>
                      {record.hoursWorked != null && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          <span className="text-xs text-zinc-500">
                            {Number(record.hoursWorked).toFixed(1)}h
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadge(record.status)}`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {record.status === 'pending' && (
                          <button
                            onClick={() => handleMarkPaid(record.id)}
                            className="p-1.5 text-green-600 hover:bg-green-500/10 rounded-lg"
                            title="Mark as Paid"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleGenerateInvoice(record.id)}
                          className="p-1.5 text-blue-600 hover:bg-blue-500/10 rounded-lg"
                          title="Generate Invoice"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadInvoicePDF(record.id)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-500/10 rounded-lg"
                          title="Download Invoice PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadSalarySlipPDF(record.id)}
                          className="p-1.5 text-teal-600 hover:bg-teal-500/10 rounded-lg"
                          title="Download Salary Slip PDF"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-1.5 text-red-600 hover:bg-red-500/10 rounded-lg"
                          title="Delete"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
