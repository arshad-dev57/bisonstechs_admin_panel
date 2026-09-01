const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string }> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  console.log(`API ${path} response:`, JSON.stringify(json, null, 2));
  return json;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function loginWithPassword(email: string, password: string) {
  return apiFetch('/api/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function verifyLoginOtp(email: string, otp: string) {
  return apiFetch<{ token: string; refreshToken: string; user: Record<string, unknown> }>(
    '/api/users/verify-login-otp',
    { method: 'POST', body: JSON.stringify({ email, otp }) }
  ).then(res => {
    console.log("Verify Login OTP raw response:", res);
    return res;
  });
}

// ─── Platform Admin ───────────────────────────────────────────────────────────
export async function getStats() {
  return apiFetch('/api/platform/stats');
}

export async function getCompanies() {
  return apiFetch('/api/platform/companies');
}

export async function getCompany(id: string) {
  return apiFetch(`/api/platform/companies/${id}`);
}

export async function updateCompanyStatus(id: string, isActive: boolean) {
  return apiFetch(`/api/platform/companies/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ isActive }),
  });
}

export async function getSubscriptionStats() {
  return apiFetch('/api/platform/subscription-stats');
}

export async function searchSubscriptions(query: string) {
  return apiFetch(`/api/subscription/search?q=${encodeURIComponent(query)}`);
}

export async function getUserSubscriptionHistory(userId: string) {
  return apiFetch(`/api/subscription/history?userId=${userId}`);
}

export interface CompanyRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  businessType: string | null;
  isActive: boolean;
  subscriptionPlan: string;
  subscriptionStatus: string;
  productTier?: string;
  licensedUsers?: number;
  licensedBranches?: number;
  billingCycle?: string | null;
  trialEndDate: string | null;
  subscriptionEndDate: string | null;
  createdAt: string;
  _count: { users: number };
}

export interface CompanyCapacity {
  licensedUsers: number;
  licensedBranches: number;
  usedUsers: number;
  usedBranches: number;
  productTier: string;
  billingCycle: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  hasAccess: boolean;
  isTrial: boolean;
  isPaid: boolean;
  canAddUser: boolean;
  canAddBranch: boolean;
  trialEndDate?: string | null;
  subscriptionEndDate?: string | null;
  currentAmount?: number;
}

export interface CompanyUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface CompanyDetail extends CompanyRow {
  users: CompanyUser[];
  capacity?: CompanyCapacity;
}

export type SubscriptionPlanType = 'trial' | 'monthly' | 'yearly' | 'none';

export interface UpdateCompanySubscriptionBody {
  subscriptionPlan?: SubscriptionPlanType;
  subscriptionStatus?: string;
  productTier?: 'pos' | 'erp_pos';
  licensedUsers?: number;
  licensedBranches?: number;
  billingCycle?: 'monthly' | 'yearly';
  trialDaysRemaining?: number;
}

export async function updateCompanySubscription(id: string, body: UpdateCompanySubscriptionBody) {
  return apiFetch<{ company: CompanyRow; capacity: CompanyCapacity }>(
    `/api/platform/companies/${id}/subscription`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    }
  );
}
