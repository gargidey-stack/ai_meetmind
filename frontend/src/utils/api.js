import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance with base configuration
const getBaseURL = () => {
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_BASE_URL_PRODUCTION || '/api';
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;
    
    if (response) {
      const { status, data } = response;
      
      // Handle authentication errors
      if (status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        toast.error('Session expired. Please login again.');
        return Promise.reject(error);
      }
      
      // Handle other errors
      const errorMessage = data?.error?.message || 'An error occurred';
      
      // Don't show toast for certain endpoints (like checking auth status)
      if (!error.config?.skipErrorToast) {
        toast.error(errorMessage);
      }
    } else if (error.request) {
      // Network error
      toast.error('Network error. Please check your connection.');
    } else {
      // Other error
      toast.error('An unexpected error occurred.');
    }
    
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/me', { skipErrorToast: true }),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
};

// Projects API calls
export const projectsAPI = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  create: (projectData) => api.post('/projects', projectData),
  update: (id, projectData) => api.put(`/projects/${id}`, projectData),
  delete: (id) => api.delete(`/projects/${id}`),
  addMember: (id, memberId) => api.post(`/projects/${id}/members`, { member_id: memberId }),
  removeMember: (id, memberId) => api.delete(`/projects/${id}/members/${memberId}`),
};

// Meetings API calls
export const meetingsAPI = {
  getById: (id) => api.get(`/meetings/${id}`),
  getByProject: (projectId) => api.get(`/meetings/project/${projectId}`),
  upload: (formData) => {
    return api.post('/meetings/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5 minutes for file upload
    });
  },
  update: (id, meetingData) => api.put(`/meetings/${id}`, meetingData),
  delete: (id) => api.delete(`/meetings/${id}`),
};

// Tasks API calls
export const tasksAPI = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    return api.get(`/tasks?${params.toString()}`);
  },
  getById: (id) => api.get(`/tasks/${id}`),
  getByProject: (projectId, filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    return api.get(`/tasks/project/${projectId}?${params.toString()}`);
  },
  create: (taskData) => api.post('/tasks', taskData),
  update: (id, taskData) => api.put(`/tasks/${id}`, taskData),
  updateStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  delete: (id) => api.delete(`/tasks/${id}`),
  getStats: (projectId = null) => {
    const params = projectId ? `?project=${projectId}` : '';
    return api.get(`/tasks/stats/overview${params}`);
  },
  getOverdue: (projectId = null) => {
    const params = projectId ? `?project=${projectId}` : '';
    return api.get(`/tasks/overdue/list${params}`);
  },
  getDueSoon: (projectId = null, days = 7) => {
    const params = new URLSearchParams();
    if (projectId) params.append('project', projectId);
    params.append('days', days);
    return api.get(`/tasks/due-soon/list?${params.toString()}`);
  },
  bulkUpdateStatus: (taskIds, status) => api.patch('/tasks/bulk/status', { task_ids: taskIds, status }),
};

// Utility functions
export const handleApiError = (error) => {
  if (error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  return 'An unexpected error occurred';
};

export const isNetworkError = (error) => {
  return !error.response && error.request;
};

export const isAuthError = (error) => {
  return error.response?.status === 401;
};

export const isValidationError = (error) => {
  return error.response?.status === 400;
};

export const isForbiddenError = (error) => {
  return error.response?.status === 403;
};

export const isNotFoundError = (error) => {
  return error.response?.status === 404;
};

export const isServerError = (error) => {
  return error.response?.status >= 500;
};

// File upload helper
export const createFormData = (file, additionalData = {}) => {
  const formData = new FormData();
  formData.append('recording', file);
  
  Object.entries(additionalData).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });
  
  return formData;
};

// Token management
export const setAuthToken = (token) => {
  localStorage.setItem('access_token', token);
};

export const getAuthToken = () => {
  return localStorage.getItem('access_token');
};

export const removeAuthToken = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};

export default api;
