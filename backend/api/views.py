from django.http import JsonResponse
from django.db import connection
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

def health_check(request):
    """
    Health check endpoint for Docker Compose, frontend verification,
    and monitoring. Verifies database connectivity.
    """
    db_status = "unknown"
    db_error = None
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            row = cursor.fetchone()
            if row and row[0] == 1:
                db_status = "connected"
            else:
                db_status = "unexpected_response"
    except Exception as exc:
        logger.error(f"Database health check failed: {exc}")
        db_status = "disconnected"
        db_error = str(exc)
        
    response_data = {
        "status": "healthy" if db_status == "connected" else "degraded",
        "service": "fbise-backend",
        "database": db_status,
        "timestamp": timezone.now().isoformat(),
    }
    
    if db_error:
        response_data["error"] = db_error
        return JsonResponse(response_data, status=503)
        
    return JsonResponse(response_data, status=200)

def api_root(request):
    """
    API root endpoint providing basic information and links to available endpoints.
    """
    return JsonResponse({
        "name": "FBISE Educational Platform API",
        "version": "1.0.0",
        "phase": 1,
        "status": "active",
        "endpoints": {
            "health": "/api/health/",
            "admin": "/admin/",
        }
    })
