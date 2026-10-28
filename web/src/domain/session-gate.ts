export const LINE_TOKEN_STORAGE_KEY = 'drinkgo_line_token_v1';
export const CUSTOMER_USER_STORAGE_KEY = 'drinkgo_customer_user_v1';
export const DEMO_UNLOCK_STORAGE_KEY = 'drinkgo_demo_unlocked_v1';

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

export function isDemoUnlocked(): boolean {
  try {
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
