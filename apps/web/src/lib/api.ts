import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirigir a login en 401 (token inválido o expirado), pero no al fallar el propio login
// — si no, un intento con contraseña mala dispara un reload y el mensaje de error se pierde.
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const path = String(err.config?.url || '').split('?')[0];
    const isLoginAttempt =
      err.config?.method === 'post' &&
      (path === 'auth/login' || path === '/auth/login' || path.endsWith('/auth/login'));
    if (
      err.response?.status === 401 &&
      typeof window !== 'undefined' &&
      !isLoginAttempt
    ) {
      localStorage.removeItem('token');
      window.location.href = '/auth/login';
    }
    return Promise.reject(err);
  },
);

// ── Auth
export const authApi = {
  register: (data: RegisterData) => api.post('/auth/register', data),
  login: (data: LoginData) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// ── Patients
export const patientsApi = {
  list: () => api.get('/patients'),
  get: (id: string) => api.get(`/patients/${id}`),
  create: (data: CreatePatientData) => api.post('/patients', data),
};

// ── Notes
export const notesApi = {
  generate: (data: GenerateNoteData) => api.post('/notes/generate', data),
  save: (data: SaveNoteData) => api.post('/notes', data),
  get: (id: string) => api.get(`/notes/${id}`),
  download: async (id: string, filename: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const res = await fetch(`${baseURL}/notes/${id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Error al descargar la nota');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};

// ── Types
export interface RegisterData {
  email: string;
  password: string;
  name: string;
  cedula?: string;
  institution?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface CreatePatientData {
  name: string;
  birthDate: string;
  sex: 'M' | 'F' | 'OTHER';
  phone?: string;
  address?: string;
  maritalStatus?: string;
  occupation?: string;
  curp?: string;
  birthPlace?: string;
  guardian?: string;
  guardianRelation?: string;
  referredBy?: string;
  interrogatorio?: string;
  insurance?: string;
  insuranceNumber?: string;
}

export interface GenerateNoteData {
  patientId: string;
  type: 'INTAKE' | 'FOLLOWUP';
  rawNote: string;
  consultDate: string;
}

export interface SaveNoteData extends GenerateNoteData {
  subjective: string;
  objective: string;
  assessment: string;
  treatment: string;
  prognosis: string;
  plan: string;
  diagnoses: Diagnosis[];
  summary: string;
  hora?: string;
  peso?: string;
  talla?: string;
  ta?: string;
  fc?: string;
  fr?: string;
  temperatura?: string;
  psicometria?: string;
  historiaPrevia?: string;
  desarrolloPsicobiologico?: string;
  allergies?: string;
  nextAppointment?: string;
  medications?: object[];
  familyMembers?: object[];
  hamAScore?: number;
  hamDScore?: number;
}

export interface Diagnosis {
  code: string;
  name: string;
  detail: string;
}
