/**
 * Google Analytics 4 (GA4) Utility for Next.js App Router
 * 
 * Safe, PII-free analytics dispatcher.
 * Handles missing configuration gracefully without throwing errors or dispatching events.
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || '';
export const IS_GA_ENABLED = Boolean(GA_MEASUREMENT_ID && GA_MEASUREMENT_ID.startsWith('G-'));
export const IS_DEBUG_MODE = process.env.NEXT_PUBLIC_GA_DEBUG_MODE === 'true';

// Forbidden keys that must NEVER be passed to analytics (PII protection)
const FORBIDDEN_PII_KEYS = new Set([
  'email',
  'password',
  'token',
  'secret',
  'name',
  'student_name',
  'cnic',
  'phone',
  'phone_number',
  'card',
  'card_number',
  'cvv',
  'billing_address',
  'account_number',
]);

/**
 * Filter out sensitive PII keys from any analytics payload.
 */
function sanitizeParams(params: Record<string, unknown> = {}): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (FORBIDDEN_PII_KEYS.has(key.toLowerCase())) {
      console.warn(`[Analytics] PII protection: stripped forbidden key "${key}"`);
      continue;
    }
    // Also prevent nested objects from smuggling PII
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeParams(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// Forbidden query parameter patterns that must NEVER be exposed in analytics URLs
const FORBIDDEN_QUERY_PARAM_PATTERNS = [
  'token',
  'uid',
  'mpin',
  'pin',
  'pass',
  'key',
  'secret',
  'auth',
  'sig',
  'tid',
  'order_ref',
  'orderref',
  'pp_',
];

/**
 * Strips sensitive tokens, credentials, and transaction references
 * from page paths and location URLs before dispatching to Google Analytics.
 */
export function sanitizeUrl(rawUrl: string): string {
  if (!rawUrl) return '/';

  try {
    const isAbsolute = rawUrl.startsWith('http://') || rawUrl.startsWith('https://');
    const parsed = new URL(rawUrl, 'https://educational-website.local');

    // High sensitivity routes: strip all query parameters completely
    const pathnameLower = parsed.pathname.toLowerCase();
    if (
      pathnameLower.includes('password-reset') ||
      pathnameLower.includes('reset-password') ||
      pathnameLower.includes('verify-email') ||
      pathnameLower.includes('auth') ||
      pathnameLower.includes('checkout')
    ) {
      return isAbsolute ? `${parsed.origin}${parsed.pathname}` : parsed.pathname;
    }

    // For general routes, strip forbidden search parameters
    const toDelete: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      const lowerKey = key.toLowerCase();
      if (FORBIDDEN_QUERY_PARAM_PATTERNS.some((pattern) => lowerKey.includes(pattern))) {
        toDelete.push(key);
      }
    });

    toDelete.forEach((key) => parsed.searchParams.delete(key));

    const search = parsed.searchParams.toString();
    const cleanRelative = search ? `${parsed.pathname}?${search}` : parsed.pathname;

    return isAbsolute ? `${parsed.origin}${cleanRelative}` : cleanRelative;
  } catch {
    return rawUrl.split('?')[0] || '/';
  }
}

/**
 * Dispatch page_view event to Google Analytics 4.
 * Tracks initial page load and subsequent client-side App Router navigations.
 * Sanitizes both page_path and page_location to ensure zero PII leakage.
 */
export function trackPageView(url: string, title?: string): void {
  if (!IS_GA_ENABLED || typeof window === 'undefined') {
    return;
  }

  const windowWithGtag = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof windowWithGtag.gtag !== 'function') {
    return;
  }

  const cleanPath = sanitizeUrl(url);
  const cleanLocation = typeof window !== 'undefined'
    ? `${window.location.origin}${cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath}`
    : cleanPath;

  const payload: Record<string, unknown> = {
    page_path: cleanPath,
    page_location: cleanLocation,
    page_title: title || (typeof document !== 'undefined' ? document.title : ''),
  };

  if (IS_DEBUG_MODE) {
    payload.debug_mode = true;
  }

  windowWithGtag.gtag('event', 'page_view', payload);

  if (IS_DEBUG_MODE) {
    console.log('[Analytics GA4] page_view:', payload);
  }
}

/**
 * Dispatch custom analytics events (future phase readiness).
 * Ensures PII is stripped and debug_mode is attached when enabled.
 */
export function trackEvent(
  eventName: string,
  eventParams: Record<string, unknown> = {}
): void {
  if (!IS_GA_ENABLED || typeof window === 'undefined') {
    return;
  }

  const windowWithGtag = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof windowWithGtag.gtag !== 'function') {
    return;
  }

  const sanitized = sanitizeParams(eventParams);
  if (IS_DEBUG_MODE) {
    sanitized.debug_mode = true;
  }

  windowWithGtag.gtag('event', eventName, sanitized);

  if (IS_DEBUG_MODE) {
    console.log(`[Analytics GA4] event "${eventName}":`, sanitized);
  }
}

/**
 * Future Events Roadmap (For Phase 2 - 5 implementation reference):
 * 
 * - view_resource:
 *     Params: { resource_id, subject, grade, file_type }
 * 
 * - sign_up:
 *     Params: { method: 'email' } (NEVER pass user identity or credentials)
 * 
 * - login:
 *     Params: { method: 'email' }
 * 
 * - begin_checkout:
 *     Params: { value, currency: 'PKR', items: [{ item_id, item_name, price }] }
 * 
 * - purchase:
 *     Params: { transaction_id, value, currency: 'PKR', items: [...] }
 *     (Implemented only after verified server-side payment confirmation)
 */
