import { User, Student, Drive, Offer, AttendanceRecord, PolicyViolation, AuditLog, PolicyEvaluation } from '../types';

const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('nfsu_token');
}

export function setToken(token: string) {
  localStorage.setItem('nfsu_token', token);
}

export function removeToken() {
  localStorage.removeItem('nfsu_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ success: boolean; token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),

  getMe: () =>
    request<{ success: boolean; user: User }>('/auth/me'),

  demoSwitch: (role: string, course?: string, company?: string) =>
    request<{ success: boolean; token: string; user: User }>('/auth/demo-switch', {
      method: 'POST',
      body: JSON.stringify({ role, course, company })
    }),

  // Students
  getStudents: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{ success: boolean; total: number; page: number; limit: number; students: Student[] }>(`/students?${query}`);
  },

  getStudent: (id: number) =>
    request<{ success: boolean; student: Student; offers: Offer[]; attendance: AttendanceRecord[]; violations: PolicyViolation[] }>(`/students/${id}`),

  createStudent: (studentData: Partial<Student>) =>
    request<{ success: boolean; student: Student }>('/students', {
      method: 'POST',
      body: JSON.stringify(studentData)
    }),

  updateStudent: (id: number, studentData: Partial<Student>) =>
    request<{ success: boolean; student: Student }>(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(studentData)
    }),

  archiveStudent: (id: number, archive: boolean, reason?: string) =>
    request<{ success: boolean; message: string }>(`/students/${id}/archive`, {
      method: 'PATCH',
      body: JSON.stringify({ archive, reason })
    }),

  exportStudentsCsvUrl: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return `${API_BASE}/students/export/csv?${query}`;
  },

  importStudentsCsv: (formData: FormData) =>
    request<{ success: boolean; results: { total: number; imported: number; skipped: number; errors: string[] } }>('/students/import/csv', {
      method: 'POST',
      body: formData
    }),

  // Drives
  getDrives: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{ success: boolean; drives: Drive[] }>(`/drives?${query}`);
  },

  getDrive: (id: number) =>
    request<{ success: boolean; drive: Drive; offers: Offer[] }>(`/drives/${id}`),

  createDrive: (driveData: Partial<Drive>) =>
    request<{ success: boolean; drive: Drive }>('/drives', {
      method: 'POST',
      body: JSON.stringify(driveData)
    }),

  updateDriveStatus: (id: number, status: string) =>
    request<{ success: boolean; message: string }>(`/drives/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),

  getCandidatesEligibility: (driveId: number) =>
    request<{
      success: boolean;
      drive_id: number;
      company_name: string;
      total_evaluated: number;
      eligible_count: number;
      blocked_count: number;
      review_count: number;
      evaluations: Array<{ student: Student; evaluation: PolicyEvaluation }>;
    }>(`/drives/${driveId}/candidates-eligibility`),

  // Offers
  getOffers: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{ success: boolean; offers: Offer[] }>(`/offers?${query}`);
  },

  createOffer: (offerData: any) =>
    request<{ success: boolean; offer: Offer; policyEvaluation?: PolicyEvaluation }>('/offers', {
      method: 'POST',
      body: JSON.stringify(offerData)
    }),

  updateOfferAcceptance: (offerId: number, acceptance: 'Accepted' | 'Declined', reason?: string) =>
    request<{ success: boolean; offer: Offer }>(`/offers/${offerId}/acceptance`, {
      method: 'PATCH',
      body: JSON.stringify({ acceptance, reason })
    }),

  updateJoiningNoc: (offerId: number, data: { joining_status?: string; noc_status?: string; remarks?: string }) =>
    request<{ success: boolean; offer: Offer }>(`/offers/${offerId}/joining-noc`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),

  // Attendance
  recordAttendance: (data: { drive_id: number; student_id: number; activity_type: string; status: string; excuse_reason?: string }) =>
    request<{ success: boolean; message: string }>('/attendance/record', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  grantEmergencyWaiver: (student_id: number, excuse_reason: string, violation_id?: number) =>
    request<{ success: boolean; message: string }>('/attendance/emergency-waiver', {
      method: 'POST',
      body: JSON.stringify({ student_id, excuse_reason, violation_id })
    }),

  getDriveAttendance: (driveId: number) =>
    request<{ success: boolean; records: AttendanceRecord[] }>(`/attendance/drive/${driveId}`),

  // Policy
  simulatePolicy: (body: { student_id?: number; mock_student?: any; target_drive: any }) =>
    request<{ success: boolean; student: any; targetDrive: any; evaluation: PolicyEvaluation }>('/policy/simulate', {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  getPolicyViolations: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{ success: boolean; violations: PolicyViolation[] }>(`/policy/violations?${query}`);
  },

  updatePolicyViolation: (id: number, status: string, action_taken?: string) =>
    request<{ success: boolean; message: string }>(`/policy/violations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, action_taken })
    }),

  getGuidelines: () =>
    request<{ success: boolean; guidelines: any }>('/policy/guidelines'),

  // Reports
  getDashboardReports: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{ success: boolean; summary: any; courseStats: any[] }>(`/reports/dashboard?${query}`);
  },

  getCompanyReports: () =>
    request<{ success: boolean; companyStats: any[] }>('/reports/company-report'),

  // Audit Logs
  getAuditLogs: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{ success: boolean; total: number; page: number; limit: number; logs: AuditLog[] }>(`/audit?${query}`);
  }
};
