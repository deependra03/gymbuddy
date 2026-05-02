import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('gymbuddy_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('gymbuddy_token');
      localStorage.removeItem('gymbuddy_user');
      window.location.href = '/auth/login';
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
