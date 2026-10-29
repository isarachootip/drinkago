export const LINE_TOKEN_STORAGE_KEY = 'drinkgo_line_token_v1';
export const CUSTOMER_USER_STORAGE_KEY = 'drinkgo_customer_user_v1';
export const DEMO_UNLOCK_STORAGE_KEY = 'drinkgo_demo_unlocked_v1';
export const STAFF_SESSION_STORAGE_KEY = 'drinkgo_staff_session_v1';

export type UserRole = 'customer' | 'rider' | 'warehouse' | 'admin';
export type AppRoleTab = 'customer' | 'rider' | 'admin';

export interface ActiveIdentity {
  displayName: string;
  username: string | null;
  lineUserId: string;
  role: UserRole;
  appTab: AppRoleTab;
  isAuthenticated: boolean;
}

export function canCustomerCancelOrder(status: string): boolean {
  return status === 'PENDING' || status === 'CONFIRMED';
}

export function shouldRequireEntryGate(input: {
  hostname: string;
  hasLineToken: boolean;
  hasStaffSession: boolean;
  demoUnlocked: boolean;
}): boolean {
  const host = input.hostname.toLowerCase();
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '';
  if (isLocal) return false;
  if (input.hasLineToken || input.hasStaffSession || input.demoUnlocked) return false;
  return true;
}

export function loadLineToken(): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(LINE_TOKEN_STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

const ALLOWED_QUERY_TABS = new Set(['events', 'shop', 'stations', 'track']);

export function resolveInitialQueryTab(search?: string): 'events' | 'shop' | 'stations' | 'track' | null {
  try {
    const rawSearch = search !== undefined ? search : typeof window !== 'undefined' ? window.location.search : '';
    if (!rawSearch) return null;
    const params = new URLSearchParams(rawSearch.startsWith('?') ? rawSearch : `?${rawSearch}`);
    const directTab = params.get('tab')?.trim().toLowerCase();
    if (directTab && ALLOWED_QUERY_TABS.has(directTab)) {
      return directTab as 'events' | 'shop' | 'stations' | 'track';
    }
    const liffState = params.get('liff.state');
    if (liffState) {
      const qIdx = liffState.indexOf('?');
      const stateQuery = qIdx >= 0 ? liffState.slice(qIdx + 1) : liffState;
      const stateTab = new URLSearchParams(stateQuery).get('tab')?.trim().toLowerCase();
      if (stateTab && ALLOWED_QUERY_TABS.has(stateTab)) {
        return stateTab as 'events' | 'shop' | 'stations' | 'track';
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function isDemoUnlocked(): boolean {
  try {
    if (resolveInitialQueryTab() !== null) return true;
    return typeof localStorage !== 'undefined' && localStorage.getItem(DEMO_UNLOCK_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function unlockDemoMode(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DEMO_UNLOCK_STORAGE_KEY, '1');
    }
  } catch {
    // ignore storage errors
  }
}

export function resolveInitialCustomerSession(): { customerUser: string; hasLineToken: boolean } {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const queryToken = params.get('lineToken')?.trim();
  const queryUser = params.get('lineUserId')?.trim();

  if (queryToken && typeof localStorage !== 'undefined') {
    localStorage.setItem(LINE_TOKEN_STORAGE_KEY, queryToken);
  }
  const activeToken = queryToken || loadLineToken();

  if (queryUser && typeof localStorage !== 'undefined') {
    localStorage.setItem(CUSTOMER_USER_STORAGE_KEY, queryUser);
    return { customerUser: queryUser, hasLineToken: Boolean(activeToken) };
  }
  const storedUser = typeof localStorage !== 'undefined' ? localStorage.getItem(CUSTOMER_USER_STORAGE_KEY) : null;
  return {
    customerUser: storedUser || 'dev-customer',
    hasLineToken: Boolean(activeToken),
  };
}

export function shouldOpenStaffLoginInitially(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const mode = new URLSearchParams(window.location.search).get('mode');
  return path.includes('/admin') || path.includes('/login') || mode === 'staff' || window.location.hash === '#admin';
}

export function clearAllAuthSessions(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STAFF_SESSION_STORAGE_KEY);
      localStorage.removeItem(LINE_TOKEN_STORAGE_KEY);
      localStorage.removeItem(CUSTOMER_USER_STORAGE_KEY);
      localStorage.removeItem(DEMO_UNLOCK_STORAGE_KEY);
    }
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const url = new URL(window.location.href);
      for (const key of ['lineUserId', 'lineToken', 'mode', 'code', 'state', 'liff.state', 'liffClientId', 'liffRedirectUri']) {
        url.searchParams.delete(key);
      }
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  } catch {
    // ignore storage/history errors
  }
}

export function resolveActiveIdentity(input: {
  staffUser: { id: string; lineUserId: string; username?: string | null; name: string; role: UserRole } | null;
  customerUser: string;
  detectedLineName: string | null;
  detectedLineRole: UserRole;
  hasLineToken: boolean;
}): ActiveIdentity {
  if (input.staffUser) {
    const role = input.staffUser.role;
    const appTab: AppRoleTab = role === 'admin' || role === 'warehouse' ? 'admin' : role === 'rider' ? 'rider' : 'customer';
    return {
      displayName: input.staffUser.name,
      username: input.staffUser.username ?? null,
      lineUserId: input.staffUser.lineUserId,
      role,
      appTab,
      isAuthenticated: true,
    };
  }
  const role = input.detectedLineRole;
  const appTab: AppRoleTab = role === 'admin' || role === 'warehouse' ? 'admin' : role === 'rider' ? 'rider' : 'customer';
  const hasRealUser = Boolean(input.hasLineToken || (input.customerUser && input.customerUser !== 'dev-customer'));
  return {
    displayName: input.detectedLineName || input.customerUser || 'dev-customer',
    username: null,
    lineUserId: input.customerUser || 'dev-customer',
    role,
    appTab,
    isAuthenticated: hasRealUser || Boolean(input.detectedLineName),
  };
}
