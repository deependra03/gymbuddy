import axios from 'axios';
import { useAuthStore } from './store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage (more reliable during hydration)
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('gymbuddy_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → clear auth (only for invalid/expired session, not face mismatch)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const url = err.config?.url ?? '';
      const skipLogout =
        url.includes('/attendance/face') ||
        url.includes('/attendance/face-kiosk');
      if (!skipLogout) {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const authApi = {
  login: (data: { phone: string; password: string }) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// Members
export const membersApi = {
  list: (params?: { search?: string; isActive?: boolean }) => api.get('/members', { params }),
  get: (id: string) => api.get(`/members/${id}`),
  create: (data: any) => api.post('/members', data),
  update: (id: string, data: any) => api.put(`/members/${id}`, data),
  delete: (id: string) => api.delete(`/members/${id}`),
  assignExercise: (memberId: string, data: { exerciseId: string; notes?: string }) =>
    api.post(`/members/${memberId}/assign-exercise`, data),
  removeExercise: (memberId: string, exerciseId: string) =>
    api.delete(`/members/${memberId}/assign-exercise/${exerciseId}`),
};

// Exercises
export const exercisesApi = {
  list: (params?: { category?: string; level?: string; focusArea?: string; search?: string }) =>
    api.get('/exercises', { params }),
  get: (id: string) => api.get(`/exercises/${id}`),
  create: (data: any) => api.post('/exercises', data),
  update: (id: string, data: any) => api.put(`/exercises/${id}`, data),
  delete: (id: string) => api.delete(`/exercises/${id}`),
  forMember: (memberId: string) => api.get(`/exercises/member/${memberId}`),
};

// Diet
export const dietApi = {
  forMember: (memberId: string) => api.get(`/diet/member/${memberId}`),
  create: (data: any) => api.post('/diet', data),
  update: (id: string, data: any) => api.put(`/diet/${id}`, data),
  delete: (id: string) => api.delete(`/diet/${id}`),
};

// Gallery
export const galleryApi = {
  list: (params?: { type?: string; search?: string }) => api.get('/gallery', { params }),
  create: (data: any) => api.post('/gallery', data),
  update: (id: string, data: any) => api.put(`/gallery/${id}`, data),
  delete: (id: string) => api.delete(`/gallery/${id}`),
};

// Upload
export const uploadApi = {
  image: (file: File, folder?: string) => {
    const fd = new FormData();
    fd.append('file', file);
    if (folder) fd.append('folder', folder);
    return api.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  video: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/upload/video', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  ocr: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/upload/ocr', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// Attendance
export const attendanceApi = {
  list: (params?: { userId?: string; startDate?: string; endDate?: string; method?: string }) =>
    api.get('/attendance', { params }),
  today: () => api.get('/attendance/today'),
  punchIn: (data?: { method?: string; biometricData?: string; deviceInfo?: string; location?: string; notes?: string }) =>
    api.post('/attendance/punch-in', data),
  punchOut: () => api.post('/attendance/punch-out'),
  biometric: (data: { biometricData: string; action: 'punch-in' | 'punch-out'; deviceInfo?: string; location?: string }) =>
    api.post('/attendance/biometric', data),
  face: (data: { descriptor: number[]; action: 'punch-in' | 'punch-out'; deviceInfo?: string; location?: string }) =>
    api.post('/attendance/face', data),
  faceKiosk: (data: { descriptor: number[]; deviceInfo?: string; location?: string }) =>
    api.post('/attendance/face-kiosk', data),
  stats: (params?: { startDate?: string; endDate?: string }) => api.get('/attendance/stats', { params }),
};

// Face enrollment
export const faceApi = {
  status: () => api.get<{ enrolled: boolean }>('/face/status'),
  enroll: (descriptor: number[]) => api.post('/face/enroll', { descriptor }),
  remove: () => api.delete('/face/enroll'),
};

// Payroll
export const payrollApi = {
  list: (params?: { userId?: string; status?: string; startDate?: string; endDate?: string; gymId?: string }) =>
    api.get('/payroll', { params }),
  employees: () => api.get('/payroll/employees'),
  preview: (params: { userId: string; periodStart: string; periodEnd: string; useProRata?: string }) =>
    api.get('/payroll/preview', { params }),
  get: (id: string) => api.get(`/payroll/${id}`),
  create: (data: {
    userId: string;
    baseSalary?: number;
    bonus?: number;
    deductions?: number;
    paymentDate: string;
    paymentMethod?: string;
    paymentReference?: string;
    notes?: string;
    periodStart: string;
    periodEnd: string;
    useProRata?: boolean;
    generateInvoice?: boolean;
  }) => api.post('/payroll', data),
  update: (id: string, data: any) => api.put(`/payroll/${id}`, data),
  delete: (id: string) => api.delete(`/payroll/${id}`),
  markPaid: (id: string, data: { paymentMethod?: string; paymentReference?: string }) =>
    api.post(`/payroll/${id}/mark-paid`, data),
  generateInvoice: (id: string) => api.post(`/payroll/${id}/generate-invoice`),
  getInvoice: (id: string) => api.get(`/payroll/${id}/invoice`),
  downloadInvoicePDF: (id: string) => api.get(`/payroll/${id}/invoice/pdf`, { responseType: 'blob' }),
  downloadSalarySlipPDF: (id: string) => api.get(`/payroll/${id}/salary-slip/pdf`, { responseType: 'blob' }),
  stats: (params?: { startDate?: string; endDate?: string; gymId?: string }) => api.get('/payroll/stats', { params }),
};

// Training Sessions
export const trainingSessionsApi = {
  list: (params?: { trainerId?: string; memberId?: string; status?: string; sessionType?: string; startDate?: string; endDate?: string }) =>
    api.get('/training-sessions', { params }),
  get: (id: string) => api.get(`/training-sessions/${id}`),
  create: (data: {
    trainerId: string;
    memberId: string;
    sessionType: 'session_based' | 'month_based';
    scheduledDate: string;
    startTime: string;
    endTime?: string;
    sessionRate: number;
    notes?: string;
  }) => api.post('/training-sessions', data),
  update: (id: string, data: any) => api.put(`/training-sessions/${id}`, data),
  delete: (id: string) => api.delete(`/training-sessions/${id}`),
  start: (id: string) => api.post(`/training-sessions/${id}/start`),
  complete: (id: string) => api.post(`/training-sessions/${id}/complete`),
  stats: (params?: { trainerId?: string; startDate?: string; endDate?: string }) => api.get('/training-sessions/stats', { params }),
};

// Trainers
export const trainersApi = {
  list: (params?: { isActive?: boolean }) => api.get('/trainers', { params }),
  get: (id: string) => api.get(`/trainers/${id}`),
  create: (data: {
    name: string;
    phone: string;
    email?: string;
    password: string;
    baseSalary?: number;
    sessionRate?: number;
    specialization?: string;
    bio?: string;
    age?: number;
    weight?: number;
    height?: number;
    goal?: string;
  }) => api.post('/trainers', data),
  update: (id: string, data: any) => api.put(`/trainers/${id}`, data),
  delete: (id: string) => api.delete(`/trainers/${id}`),
  stats: () => api.get('/trainers/stats'),
};

// Notifications
export const notificationsApi = {
  list: async () => api.get('/notifications'),
  unreadCount: async () => api.get('/notifications/unread-count'),
  markAsRead: async (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: async () => api.patch('/notifications/mark-all-read'),
  delete: async (id: string) => api.delete(`/notifications/${id}`),
  send: async (data: any) => api.post('/notifications/send', data),
};
