import time
import logging
from django.core.cache import cache

logger = logging.getLogger(__name__)

def get_client_ip(request) -> str:
    """
    Extracts client IP address safely, handling reverse proxies (Docker / Nginx).
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
    return ip

def check_rate_limit(key: str, max_attempts: int = 5, timeout_seconds: int = 900) -> tuple[bool, int]:
    """
    Checks if an operation key has exceeded max attempts.
    Returns: (is_rate_limited: bool, retry_after_seconds: int)
    """
    record = cache.get(key)
    if not record:
        return False, 0

    count, first_time = record
    elapsed = int(time.time() - first_time)
    remaining = max(0, timeout_seconds - elapsed)

    if count >= max_attempts and remaining > 0:
        logger.warning(f"[RateLimit] Key '{key}' exceeded limit ({count}/{max_attempts}). Remaining lock: {remaining}s")
        return True, remaining

    # Expired entry
    if remaining <= 0:
        cache.delete(key)
        return False, 0

    return False, 0

def record_failed_attempt(key: str, timeout_seconds: int = 900) -> int:
    """
    Records a failed attempt under the key.
    Returns the new attempt count.
    """
    now = time.time()
    record = cache.get(key)
    if not record:
        cache.set(key, (1, now), timeout=timeout_seconds)
        return 1

    count, first_time = record
    new_count = count + 1
    # Preserve original window expiration
    elapsed = int(now - first_time)
    remaining_timeout = max(1, timeout_seconds - elapsed)
    cache.set(key, (new_count, first_time), timeout=remaining_timeout)
    return new_count

def reset_rate_limit(key: str) -> None:
    """
    Clears rate-limit tracker upon successful authentication.
    """
    cache.delete(key)

