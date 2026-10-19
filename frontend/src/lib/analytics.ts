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

/**
 * Dispatch page_view event to Google Analytics 4.
 * Tracks initial page load and subsequent client-side App Router navigations.
 */
export function trackPageView(url: string, title?: string): void {
  if (!IS_GA_ENABLED || typeof window === 'undefined') {
    return;
  }

  const windowWithGtag = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof windowWithGtag.gtag !== 'function') {
    return;
  }

  const payload: Record<string, unknown> = {
    page_path: url,
    page_location: window.location.href,
    page_title: title || document.title,
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
