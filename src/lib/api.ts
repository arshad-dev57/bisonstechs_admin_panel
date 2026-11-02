const API_BASE = process.env.API_URL;

if (!API_BASE) {
  console.error('API_URL is not set. Add it to .env.local and restart the dev server.');
}

type ApiOptions = RequestInit & { _retry?: boolean; skipAuth?: boolean };

function cleanToken(token: string | null | undefined): string | null {
  if (!token) return null;
  return token.trim().replace(/"/g, '').replace(/\s/g, '') || null;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return cleanToken(localStorage.getItem('admin_token'));
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return cleanToken(localStorage.getItem('admin_refresh_token'));
}

/** True when JWT is missing/invalid or past exp (with small skew). */
function isJwtExpired(token: string | null, skewMs = 60_000): boolean {
  if (!token) return true;
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return true;
    const json = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { exp?: number };
    if (!payload?.exp) return false;
    return payload.exp * 1000 <= Date.now() + skewMs;
  } catch {
    return true;
  }
}

export function setAdminTokens(token: string, refreshToken?: string | null) {
  if (typeof window === 'undefined') return;
  const access = cleanToken(token);
  if (access) localStorage.setItem('admin_token', access);
  const refresh = cleanToken(refreshToken);
  if (refresh) localStorage.setItem('admin_refresh_token', refresh);
}

export function clearAdminSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_refresh_token');
  localStorage.removeItem('admin_user');
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  clearAdminSession();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.replace('/login');
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (!API_BASE) return false;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken, client: 'admin' }),
      });
      const json = await res.json().catch(() => ({}));
      const nextToken = json?.token || json?.data?.token;
      const nextRefresh = json?.refreshToken || json?.data?.refreshToken;
      if (res.ok && json?.success && nextToken) {
        setAdminTokens(nextToken, nextRefresh || refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/** Restore session; refresh when access JWT is missing or expired. */
export async function ensureAdminSession(): Promise<boolean> {
  const access = getToken();
  if (access && !isJwtExpired(access)) return true;
  if (!getRefreshToken()) return false;
  return refreshAccessToken();
}

function isAuthExemptPath(path: string) {
  return (
    path.startsWith('/api/users/login') ||
    path.startsWith('/api/users/refresh-token')
  );
}

async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<{ success: boolean; data?: T; message?: string; token?: string; refreshToken?: string }> {
  if (!API_BASE) {
    return { success: false, message: 'API_URL is not configured' };
  }

  const { _retry, skipAuth, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  if (!skipAuth && !isAuthExemptPath(path)) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });
  } catch {
    return { success: false, message: 'Network error. Please try again.' };
  }

  const json = await res.json().catch(() => ({}));

  const unauthorized = res.status === 401;

  if (unauthorized && !_retry && !skipAuth && !isAuthExemptPath(path)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, _retry: true });
    }
    redirectToLogin();
    return { success: false, message: json?.message || 'Session expired. Please login again.' };
  }

  console.log(`API ${path} response:`, JSON.stringify(json, null, 2));
  return json;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
/** Admin panel: password-only (no OTP). Backend skips OTP when client=admin / directLogin. */
export async function loginWithPassword(email: string, password: string) {
  return apiFetch<{ token: string; refreshToken: string; user: Record<string, unknown> }>(
    '/api/users/login',
    {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        client: 'admin',
        directLogin: true,
        skipOtp: true,
      }),
      skipAuth: true,
    }
  );
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

export async function getCompanyActivity(id: string, limit = 80) {
  return apiFetch<CompanyActivityPayload>(
    `/api/platform/companies/${id}/activity?limit=${limit}`
  );
}

export async function updateCompanyStatus(id: string, isActive: boolean) {
  return apiFetch(`/api/platform/companies/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ isActive }),
  });
}

export async function deleteCompany(id: string) {
  return apiFetch<{
    id: string;
    name: string;
    usersDeleted: number;
    companyDeleted: boolean;
  }>(`/api/platform/companies/${id}`, {
    method: 'DELETE',
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

export interface CompanyAdmin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  contactNo: string;
  country: string;
  address: string;
  organizationName: string;
  websiteLink: string;
  role: string;
  isActive: boolean;
  lastActiveAt?: string | null;
  createdAt: string;
  businessDetails?: Record<string, unknown> | null;
}

export interface CompanyRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address?: string | null;
  businessType: string | null;
  taxRegistrationNumber?: string | null;
  website?: string | null;
  isActive: boolean;
  subscriptionPlan: string;
  subscriptionStatus: string;
  productTier?: string;
  licensedUsers?: number;
  licensedBranches?: number;
  billingCycle?: string | null;
  trialStartDate?: string | null;
  trialEndDate: string | null;
  subscriptionStartDate?: string | null;
  subscriptionEndDate: string | null;
  createdAt: string;
  lastActiveAt?: string | null;
  _count: { users: number };
  admin?: CompanyAdmin | null;
}

export interface CompanyActivitySummary {
  lastActiveAt: string | null;
  eventsToday: number;
  eventsWeek: number;
  activeUsersToday: number;
  activeUsersWeek: number;
  totalUsers: number;
}

export interface CompanyActivityUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  lastActiveAt: string | null;
  createdAt: string;
}

export interface CompanyActivityEvent {
  id: string;
  action: string;
  source: string;
  path: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

export interface CompanyActivityPayload {
  companyId: string;
  companyName: string;
  summary: CompanyActivitySummary;
  users: CompanyActivityUser[];
  events: CompanyActivityEvent[];
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
  phone?: string;
  contactNo?: string;
  country?: string;
  address?: string;
  organizationName?: string;
  websiteLink?: string;
  role: string;
  isActive: boolean;
  lastActiveAt?: string | null;
  createdAt: string;
  businessDetails?: Record<string, unknown> | null;
}

export interface CompanyDetail extends CompanyRow {
  users: CompanyUser[];
  admin?: CompanyAdmin | null;
  lastActiveAt?: string | null;
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

export interface PlatformUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  companyId: string | null;
  companyName: string;
}

export async function getPlatformUsers(query = '', limit = 200) {
  const qs = new URLSearchParams();
  if (query.trim()) qs.set('q', query.trim());
  qs.set('limit', String(limit));
  return apiFetch<PlatformUser[]>(`/api/platform/users?${qs.toString()}`) as Promise<{
    success: boolean;
    data?: PlatformUser[];
    message?: string;
    meta?: { total: number; activeTotal: number; returned: number };
  }>;
}

export async function sendPlatformNotification(body: {
  title: string;
  message: string;
  audience: 'all' | 'selected';
  userIds?: string[];
  type?: 'info' | 'success' | 'warning' | 'error';
}) {
  return apiFetch<{ sent: number; failed: number; total: number; audience: string }>(
    '/api/platform/notifications',
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
}

export async function sendPlatformEmail(body: {
  subject: string;
  message: string;
  audience: 'all' | 'selected';
  userIds?: string[];
  actionUrl?: string;
  actionText?: string;
}) {
  return apiFetch<{ sent: number; failed: number; skipped: number; total: number; audience: string }>(
    '/api/platform/emails',
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
}

// ─── Company Storage Usage ────────────────────────────────────────────────────

export interface StorageBreakdownItem {
  table: string;
  rowCount: number;
  storageBytes: number;
  storageMB: number;
}

export interface CompanyStorageEntry {
  companyId: string;
  companyName: string;
  storageBytes: number;
  storageMB: number;
  storageGB: number;
  breakdown?: StorageBreakdownItem[];
}

export interface CompanyStorageReport {
  success: boolean;
  calculationMethod: 'estimated';
  calculationNote: string;
  computedAt: string;
  fromCache: boolean;
  cacheExpiresInSeconds: number;
  companies: CompanyStorageEntry[];
  totalStorageBytes: number;
  totalStorageMB: number;
  totalStorageGB: number;
  message?: string;
}

export async function getCompanyStorageUsage(opts?: {
  breakdown?: boolean;
  forceRefresh?: boolean;
}): Promise<CompanyStorageReport> {
  const qs = new URLSearchParams();
  if (opts?.breakdown === false) qs.set('breakdown', 'false');
  if (opts?.forceRefresh) qs.set('forceRefresh', 'true');
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<CompanyStorageReport>(
    `/api/admin/company-storage-usage${query}`
  ) as Promise<CompanyStorageReport>;
}

export async function invalidateStorageCache() {
  return apiFetch('/api/admin/company-storage-usage/invalidate-cache', {
    method: 'POST',
  });
}
