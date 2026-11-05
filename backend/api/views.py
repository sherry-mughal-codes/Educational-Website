import os
import json
import uuid
from decimal import Decimal
from functools import wraps
from django.conf import settings
from django.http import JsonResponse, Http404, FileResponse, HttpResponseRedirect
from django.db import connection, transaction
from django.db.models import Q, Count
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.validators import validate_email
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.clickjacking import xframe_options_exempt
from django.core.exceptions import ValidationError
import logging

from .models import ClassLevel, Subject, ClassSubject, Chapter, Resource, StudentProfile, Order, Purchase
from .pdf_utils import validate_pdf_file, safe_replace_pdf
from .email_utils import (
    send_registration_confirmation,
    send_password_reset_email,
    send_purchase_confirmation,
    send_payment_failed_alert,
)
from .payments.registry import get_payment_gateway, list_available_gateways
from .payments.sandbox import SandboxPaymentGateway

logger = logging.getLogger(__name__)

# ==============================================================================
# Security & Permissions Decorator
# ==============================================================================
def admin_required(view_func):
    """
    Ensures the user is authenticated and possesses staff/superuser privileges.
    Returns 401 if unauthenticated, 403 if unauthorized.
    """
    @wraps(view_func)
    def wrapped(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({
                "error": "Authentication required. Please log in as an administrator.",
                "authenticated": False,
            }, status=401)
        if not (request.user.is_staff or request.user.is_superuser):
            return JsonResponse({
                "error": "Administrator privilege required for this operation.",
                "authenticated": True,
            }, status=403)
        return view_func(request, *args, **kwargs)
    return wrapped


# ==============================================================================
# Health Check & Root Endpoints
# ==============================================================================
def health_check(request):
    """
    Health check endpoint for Docker Compose and monitoring.
    Verifies live database connectivity.
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
    API root listing available endpoints for discovery.
    """
    return JsonResponse({
        "name": "FBISE Educational Platform API",
        "version": "1.0.0",
        "phase": 3,
        "status": "active",
        "endpoints": {
            "health": "/api/health/",
            "classes": "/api/classes/",
            "resources": "/api/resources/",
            "sitemap": "/api/sitemap-data/",
            "admin_auth": "/api/admin/auth/me/",
            "admin_resources": "/api/admin/resources/",
        }
    })


# ==============================================================================
# Public Curriculum & Resource Endpoints
# ==============================================================================
def class_list(request):
    """
    Returns all active class levels (e.g. Class 9 and Class 10)
    with their associated subjects.
    """
    classes = ClassLevel.objects.filter(is_active=True).prefetch_related('class_subjects__subject')
    data = []
    for cls in classes:
        subjects_data = []
        for cs in cls.class_subjects.filter(is_active=True).select_related('subject'):
            published_resources_count = cs.resources.filter(is_published=True).count()
            subjects_data.append({
                "id": cs.subject.id,
                "name": cs.subject.name,
                "slug": cs.subject.slug,
                "code": cs.subject.code,
                "icon_name": cs.subject.icon_name,
                "description": cs.subject.description,
                "total_chapters": cs.total_chapters,
                "resources_count": published_resources_count,
            })

        data.append({
            "id": cls.id,
            "name": cls.name,
            "grade_number": cls.grade_number,
            "slug": cls.slug,
            "description": cls.description,
            "subjects_count": len(subjects_data),
            "subjects": subjects_data,
        })

    return JsonResponse({"classes": data}, status=200)

def class_detail(request, class_slug):
    """
    Returns metadata for a single class level and all its subjects.
    """
    cls = get_object_or_404(ClassLevel, slug=class_slug, is_active=True)
    subjects = []
    for cs in cls.class_subjects.filter(is_active=True).select_related('subject'):
        published_count = cs.resources.filter(is_published=True).count()
        subjects.append({
            "name": cs.subject.name,
            "slug": cs.subject.slug,
            "code": cs.subject.code,
            "icon_name": cs.subject.icon_name,
            "description": cs.subject.description,
            "syllabus_overview": cs.syllabus_overview,
            "total_chapters": cs.total_chapters,
            "published_resources_count": published_count,
            "url": f"/{cls.slug}/{cs.subject.slug}/",
        })

    return JsonResponse({
        "name": cls.name,
        "grade_number": cls.grade_number,
        "slug": cls.slug,
        "description": cls.description,
        "subjects": subjects,
    }, status=200)

def subject_detail(request, class_slug, subject_slug):
    """
    Returns subject details and its published resources for a specific class.
    """
    class_level = get_object_or_404(ClassLevel, slug=class_slug, is_active=True)
    subject = get_object_or_404(Subject, slug=subject_slug)
    class_subject = get_object_or_404(ClassSubject, class_level=class_level, subject=subject, is_active=True)

    resources = class_subject.resources.filter(is_published=True)
    resources_data = [
        {
            "id": r.id,
            "title": r.title,
            "slug": r.slug,
            "resource_type": r.resource_type,
            "resource_type_display": r.get_resource_type_display(),
            "description": r.description,
            "file_format": r.file_format,
            "page_count": r.page_count,
            "has_pdf": bool(r.pdf_file),
            "author_attribution": r.author_attribution,
            "url": f"/{class_level.slug}/{subject.slug}/{r.slug}/",
            "updated_at": r.updated_at.isoformat(),
        }
        for r in resources
    ]

    return JsonResponse({
        "class": {
            "name": class_level.name,
            "grade_number": class_level.grade_number,
            "slug": class_level.slug,
        },
        "subject": {
            "name": subject.name,
            "slug": subject.slug,
            "code": subject.code,
            "icon_name": subject.icon_name,
            "description": subject.description,
            "syllabus_overview": class_subject.syllabus_overview,
            "total_chapters": class_subject.total_chapters,
        },
        "resources_count": len(resources_data),
        "resources": resources_data,
    }, status=200)

def resource_detail(request, class_slug, subject_slug, resource_slug):
    """
    Returns full details for a specific published educational resource.
    """
    class_level = get_object_or_404(ClassLevel, slug=class_slug, is_active=True)
    subject = get_object_or_404(Subject, slug=subject_slug)
    class_subject = get_object_or_404(ClassSubject, class_level=class_level, subject=subject, is_active=True)
    resource = get_object_or_404(Resource, class_subject=class_subject, slug=resource_slug, is_published=True)

    # Find genuine related resources in the same class/subject
    related_resources = class_subject.resources.filter(is_published=True).exclude(id=resource.id)[:4]
    related_data = [
        {
            "title": rel.title,
            "slug": rel.slug,
            "resource_type_display": rel.get_resource_type_display(),
            "url": f"/{class_level.slug}/{subject.slug}/{rel.slug}/",
            "file_format": rel.file_format,
            "page_count": rel.page_count,
            "has_pdf": bool(rel.pdf_file),
        }
        for rel in related_resources
    ]

    has_pdf = bool(resource.pdf_file)
    pdf_stream_url = f"/api/resources/{class_level.slug}/{subject.slug}/{resource.slug}/pdf-stream/" if has_pdf else None
    download_url = f"/api/resources/{class_level.slug}/{subject.slug}/{resource.slug}/download/" if has_pdf else None

    user_has_purchased = False
    if request.user.is_authenticated:
        if request.user.is_staff or resource.is_free:
            user_has_purchased = True
        else:
            user_has_purchased = Purchase.objects.filter(student=request.user, resource=resource, is_active=True).exists()

    return JsonResponse({
        "id": resource.id,
        "title": resource.title,
        "slug": resource.slug,
        "resource_type": resource.resource_type,
        "resource_type_display": resource.get_resource_type_display(),
        "description": resource.description,
        "content_preview": resource.content_preview,
        "file_format": resource.file_format,
        "page_count": resource.page_count,
        "has_pdf": has_pdf,
        "pdf_stream_url": pdf_stream_url,
        "download_url": download_url,
        "file_size_bytes": resource.file_size_bytes,
        "price": str(resource.price),
        "currency": resource.currency,
        "is_free": resource.is_free,
        "user_has_purchased": user_has_purchased,
        "author_attribution": resource.author_attribution,
        "meta_title": resource.get_meta_title(),
        "meta_description": resource.get_meta_description(),
        "class": {
            "name": class_level.name,
            "grade_number": class_level.grade_number,
            "slug": class_level.slug,
        },
        "subject": {
            "name": subject.name,
            "slug": subject.slug,
            "code": subject.code,
            "icon_name": subject.icon_name,
            "total_chapters": class_subject.total_chapters,
        },
        "chapter": {
            "id": resource.chapter.id,
            "number": resource.chapter.chapter_number,
            "title": resource.chapter.title,
        } if resource.chapter else None,
        "related_resources": related_data,
        "created_at": resource.created_at.isoformat(),
        "updated_at": resource.updated_at.isoformat(),
    }, status=200)

def resource_search(request):
    """
    Public search endpoint for educational resources.
    Supports ?q=<query>&class=<class_slug>&subject=<subject_slug>&type=<resource_type>
    """
    query = request.GET.get('q', '').strip()
    class_filter = request.GET.get('class', '').strip()
    subject_filter = request.GET.get('subject', '').strip()
    type_filter = request.GET.get('type', '').strip()

    qs = Resource.objects.filter(is_published=True, class_subject__is_active=True).select_related(
        'class_subject__class_level', 'class_subject__subject'
    )

    if query:
        qs = qs.filter(
            Q(title__icontains=query) |
            Q(description__icontains=query) |
            Q(content_preview__icontains=query) |
            Q(class_subject__subject__name__icontains=query) |
            Q(class_subject__class_level__name__icontains=query)
        )

    if class_filter:
        qs = qs.filter(class_subject__class_level__slug=class_filter)

    if subject_filter:
        qs = qs.filter(class_subject__subject__slug=subject_filter)

    if type_filter:
        qs = qs.filter(resource_type=type_filter)

    results = []
    for r in qs[:50]:
        cls = r.class_subject.class_level
        subj = r.class_subject.subject
        results.append({
            "id": r.id,
            "title": r.title,
            "slug": r.slug,
            "resource_type": r.resource_type,
            "resource_type_display": r.get_resource_type_display(),
            "description": r.description,
            "file_format": r.file_format,
            "page_count": r.page_count,
            "has_pdf": bool(r.pdf_file),
            "class_name": cls.name,
            "class_slug": cls.slug,
            "subject_name": subj.name,
            "subject_slug": subj.slug,
            "url": f"/{cls.slug}/{subj.slug}/{r.slug}/",
            "updated_at": r.updated_at.isoformat(),
        })

    return JsonResponse({
        "query": query,
        "filters": {
            "class": class_filter,
            "subject": subject_filter,
            "type": type_filter,
        },
        "total_results": qs.count(),
        "results": results,
    }, status=200)

@xframe_options_exempt
def resource_pdf_stream(request, class_slug, subject_slug, resource_slug):
    """
    Securely streams the PDF file for online reading in the browser.
    Verifies that the resource is genuinely published.
    Does not expose server filesystem paths.
    """
    class_level = get_object_or_404(ClassLevel, slug=class_slug, is_active=True)
    subject = get_object_or_404(Subject, slug=subject_slug)
    class_subject = get_object_or_404(ClassSubject, class_level=class_level, subject=subject, is_active=True)
    resource = get_object_or_404(Resource, class_subject=class_subject, slug=resource_slug, is_published=True)

    if not resource.pdf_file:
        return JsonResponse({
            "error": "This educational resource is currently being digitized. Full online preview will be available shortly.",
            "resource": resource.title,
        }, status=404)

    try:
        file_path = resource.pdf_file.path
        if not os.path.exists(file_path):
            return JsonResponse({"error": "PDF file could not be located on storage server."}, status=404)

        response = FileResponse(open(file_path, 'rb'), content_type='application/pdf')
        filename = f"{resource.slug}.pdf"
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        response['X-Content-Type-Options'] = 'nosniff'
        return response
    except Exception as exc:
        logger.error(f"Error streaming PDF for {resource}: {exc}")
        return JsonResponse({"error": "Internal error streaming PDF document."}, status=500)

def resource_pdf_download(request, class_slug, subject_slug, resource_slug):
    """
    Secure endpoint for downloading complete paid PDF subject documents.
    Enforces backend authorization:
    - User must be authenticated.
    - User must possess an active verified Purchase record, or have staff privileges, or resource is free.
    - Serves file as an attachment without exposing filesystem paths.
    """
    if not request.user.is_authenticated:
        return JsonResponse({
            "error": "Authentication required. Please sign in to download this educational guide.",
            "requires_auth": True
        }, status=401)

    class_level = get_object_or_404(ClassLevel, slug=class_slug, is_active=True)
    subject = get_object_or_404(Subject, slug=subject_slug)
    class_subject = get_object_or_404(ClassSubject, class_level=class_level, subject=subject, is_active=True)
    resource = get_object_or_404(Resource, class_subject=class_subject, slug=resource_slug, is_published=True)

    if not resource.pdf_file:
        return JsonResponse({"error": "Resource document file is not available for download."}, status=404)

    is_staff = request.user.is_staff or request.user.is_superuser
    has_purchase = Purchase.objects.filter(student=request.user, resource=resource, is_active=True).exists()

    if not (is_staff or resource.is_free or has_purchase):
        return JsonResponse({
            "error": f"Valid subject purchase required to download this resource ({resource.price} {resource.currency}).",
            "requires_purchase": True,
            "resource_id": resource.id,
            "resource_title": resource.title,
            "price": str(resource.price),
            "currency": resource.currency,
        }, status=403)

    try:
        file_path = resource.pdf_file.path
        if not os.path.exists(file_path):
            return JsonResponse({"error": "Resource file not found on storage server."}, status=404)

        response = FileResponse(open(file_path, 'rb'), content_type='application/pdf')
        filename = f"{resource.slug}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Cache-Control'] = 'private, no-transform, no-store'
        return response
    except Exception as exc:
        logger.error(f"Error serving download for {resource}: {exc}")
        return JsonResponse({"error": "Internal server error preparing download."}, status=500)


def sitemap_data(request):
    """
    Returns all canonical URL paths of eligible published entities for Next.js XML sitemap generation.
    Unpublished resources are strictly excluded.
    """
    urls = [
        {"path": "/", "priority": "1.0", "changefreq": "daily"},
        {"path": "/about/", "priority": "0.7", "changefreq": "monthly"},
        {"path": "/contact/", "priority": "0.7", "changefreq": "monthly"},
        {"path": "/privacy-policy/", "priority": "0.5", "changefreq": "monthly"},
        {"path": "/terms/", "priority": "0.5", "changefreq": "monthly"},
        {"path": "/disclaimer/", "priority": "0.5", "changefreq": "monthly"},
        {"path": "/search/", "priority": "0.8", "changefreq": "weekly"},
    ]

    for cls in ClassLevel.objects.filter(is_active=True):
        urls.append({
            "path": f"/{cls.slug}/",
            "priority": "0.9",
            "changefreq": "weekly",
            "lastmod": cls.updated_at.strftime('%Y-%m-%d'),
        })

    for cs in ClassSubject.objects.filter(is_active=True).select_related('class_level', 'subject'):
        urls.append({
            "path": f"/{cs.class_level.slug}/{cs.subject.slug}/",
            "priority": "0.9",
            "changefreq": "weekly",
            "lastmod": cs.updated_at.strftime('%Y-%m-%d'),
        })

    for r in Resource.objects.filter(is_published=True).select_related('class_subject__class_level', 'class_subject__subject'):
        urls.append({
            "path": f"/{r.class_subject.class_level.slug}/{r.class_subject.subject.slug}/{r.slug}/",
            "priority": "0.8",
            "changefreq": "weekly",
            "lastmod": r.updated_at.strftime('%Y-%m-%d'),
        })

    return JsonResponse({"urls": urls}, status=200)


# ==============================================================================
# Student Authentication & Account Endpoints
# ==============================================================================
@csrf_exempt
def student_register(request):
    """
    Student registration endpoint.
    Creates a student account, hashes password, assigns non-staff permissions,
    creates StudentProfile, logs the student in, and sends confirmation email.
    """
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    password_confirm = data.get('password_confirm', '')

    if not full_name or not email or not password:
        return JsonResponse({"error": "Full name, email address, and password are required."}, status=400)

    try:
        validate_email(email)
    except ValidationError:
        return JsonResponse({"error": "Please enter a valid email address."}, status=400)

    if len(password) < 8:
        return JsonResponse({"error": "Password must be at least 8 characters in length."}, status=400)

    if password != password_confirm:
        return JsonResponse({"error": "Passwords do not match."}, status=400)

    if User.objects.filter(email__iexact=email).exists() or User.objects.filter(username__iexact=email).exists():
        return JsonResponse({"error": "An account with this email address is already registered. Please sign in."}, status=400)

    try:
        with transaction.atomic():
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=full_name,
                is_staff=False,
                is_superuser=False,
            )
            StudentProfile.objects.create(user=user, is_email_verified=False)
            login(request, user)
            send_registration_confirmation(user, request)

        return JsonResponse({
            "success": True,
            "message": "Account created successfully.",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.first_name,
                "is_staff": False,
            }
        }, status=201)
    except Exception as exc:
        logger.error(f"Student registration failure: {exc}")
        return JsonResponse({"error": "An error occurred while creating your account. Please try again."}, status=500)


@csrf_exempt
def student_login(request):
    """
    Student login endpoint. Validates credentials, protects against brute-force attacks,
    and initializes secure session.
    """
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return JsonResponse({"error": "Email and password are required."}, status=400)

    fail_key = f"login_fails_{email}"
    recent_fails = request.session.get(fail_key, 0)
    if recent_fails >= 5:
        return JsonResponse({
            "error": "Too many failed attempts. Please wait a few minutes before trying again or use password recovery."
        }, status=429)

    user = None
    candidate_user = User.objects.filter(email__iexact=email).first()
    if candidate_user:
        user = authenticate(request, username=candidate_user.username, password=password)
    if not user:
        user = authenticate(request, username=email, password=password)

    if user is None:
        request.session[fail_key] = recent_fails + 1
        return JsonResponse({"error": "Invalid email address or password."}, status=401)

    if not user.is_active:
        return JsonResponse({"error": "This account is inactive. Please contact support."}, status=403)

    request.session.pop(fail_key, None)
    login(request, user)

    purchases_count = user.purchases.filter(is_active=True).count()

    return JsonResponse({
        "success": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.first_name or user.username,
            "is_staff": user.is_staff,
            "purchases_count": purchases_count,
        }
    }, status=200)


@csrf_exempt
def student_logout(request):
    """Signs out student from active session."""
    logout(request)
    return JsonResponse({"success": True, "message": "Signed out successfully."}, status=200)


def student_me(request):
    """Returns current student authentication state and profile summary."""
    if not request.user.is_authenticated:
        return JsonResponse({"authenticated": False, "user": None}, status=200)

    user = request.user
    purchases_count = user.purchases.filter(is_active=True).count()

    return JsonResponse({
        "authenticated": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.first_name or user.username,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
            "purchases_count": purchases_count,
            "date_joined": user.date_joined.isoformat(),
        }
    }, status=200)


@csrf_exempt
def student_password_reset_request(request):
    """
    Generates time-limited secure reset token and sends reset instructions.
    Generic response prevents user email enumeration.
    """
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    email = data.get('email', '').strip().lower()
    if email:
        user = User.objects.filter(email__iexact=email).first()
        if user and user.is_active:
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3001')
            reset_url = f"{frontend_url}/student/reset-password/?uid={uid}&token={token}"
            send_password_reset_email(user, reset_url)

    return JsonResponse({
        "success": True,
        "message": "If an account exists with this email address, password reset instructions have been dispatched."
    }, status=200)


@csrf_exempt
def student_password_reset_confirm(request):
    """
    Validates token and updates student password securely.
    """
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    uid_b64 = data.get('uid', '')
    token = data.get('token', '')
    new_password = data.get('new_password', '')
    new_password_confirm = data.get('new_password_confirm', '')

    if not uid_b64 or not token or not new_password:
        return JsonResponse({"error": "Reset token, identifier, and new password are required."}, status=400)

    if len(new_password) < 8:
        return JsonResponse({"error": "New password must be at least 8 characters in length."}, status=400)

    if new_password != new_password_confirm:
        return JsonResponse({"error": "Passwords do not match."}, status=400)

    try:
        uid = force_str(urlsafe_base64_decode(uid_b64))
        user = User.objects.get(pk=uid)
    except Exception:
        return JsonResponse({"error": "Invalid or expired reset link. Please request a new one."}, status=400)

    if not default_token_generator.check_token(user, token):
        return JsonResponse({"error": "Password reset token is invalid or has expired."}, status=400)

    user.set_password(new_password)
    user.save()

    return JsonResponse({
        "success": True,
        "message": "Your password has been successfully reset. You may now sign in with your new password."
    }, status=200)


# ==============================================================================
# Student Dashboard
# ==============================================================================
def student_dashboard(request):
    """
    Returns student profile information, purchased resources, and complete order history.
    Strictly isolated: students can access only their own records.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required. Please sign in."}, status=401)

    user = request.user
    purchases = user.purchases.filter(is_active=True).select_related(
        'resource__class_subject__class_level',
        'resource__class_subject__subject',
        'order'
    )

    purchases_data = []
    for p in purchases:
        res = p.resource
        cls = res.class_subject.class_level
        subj = res.class_subject.subject
        purchases_data.append({
            "purchase_id": p.id,
            "resource_id": res.id,
            "title": res.title,
            "slug": res.slug,
            "class_name": cls.name,
            "class_slug": cls.slug,
            "subject_name": subj.name,
            "subject_slug": subj.slug,
            "file_format": res.file_format,
            "page_count": res.page_count,
            "file_size_bytes": res.file_size_bytes,
            "has_pdf": bool(res.pdf_file),
            "access_granted_at": p.access_granted_at.isoformat(),
            "download_url": f"/api/resources/{cls.slug}/{subj.slug}/{res.slug}/download/",
            "public_url": f"/{cls.slug}/{subj.slug}/{res.slug}/",
            "order_reference": p.order.order_reference,
            "amount_paid": str(p.order.amount),
            "currency": p.order.currency,
        })

    orders = user.orders.all().select_related('resource')[:40]
    orders_data = [
        {
            "id": o.id,
            "order_reference": o.order_reference,
            "resource_title": o.resource.title,
            "amount": str(o.amount),
            "currency": o.currency,
            "payment_gateway": o.payment_gateway,
            "status": o.status,
            "status_display": o.get_status_display(),
            "created_at": o.created_at.isoformat(),
            "paid_at": o.paid_at.isoformat() if o.paid_at else None,
        }
        for o in orders
    ]

    return JsonResponse({
        "student": {
            "id": user.id,
            "email": user.email,
            "full_name": user.first_name or user.username,
            "date_joined": user.date_joined.isoformat(),
        },
        "purchases": purchases_data,
        "orders": orders_data,
    }, status=200)


# ==============================================================================
# Orders, Checkout & Payment Gateways
# ==============================================================================
def payment_gateways_list(request):
    """Returns available payment gateway options for checkout."""
    return JsonResponse({"gateways": list_available_gateways()}, status=200)


@csrf_exempt
def order_create(request):
    """
    Creates an order for an authenticated student purchasing a paid resource.
    Locks price directly from backend database - never trusts price from browser.
    """
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required. Please sign in to purchase."}, status=401)

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    resource_id = data.get('resource_id')
    resource_slug = data.get('resource_slug')
    gateway_id = data.get('gateway_id', 'jazzcash').lower().strip()

    if resource_id:
        resource = get_object_or_404(Resource, id=resource_id, is_published=True)
    elif resource_slug:
        resource = get_object_or_404(Resource, slug=resource_slug, is_published=True)
    else:
        return JsonResponse({"error": "Resource identification is required."}, status=400)

    # Check if student already owns active access to this resource
    if Purchase.objects.filter(student=request.user, resource=resource, is_active=True).exists():
        cls = resource.class_subject.class_level
        subj = resource.class_subject.subject
        return JsonResponse({
            "already_owned": True,
            "message": "You have already purchased this study guide.",
            "download_url": f"/api/resources/{cls.slug}/{subj.slug}/{resource.slug}/download/",
            "dashboard_url": "/student/dashboard/",
        }, status=200)

    date_prefix = timezone.now().strftime('%Y%m%d')
    unique_ref = f"ORD-{date_prefix}-{uuid.uuid4().hex[:8].upper()}"

    locked_amount = resource.price
    currency = resource.currency

    order = Order.objects.create(
        order_reference=unique_ref,
        student=request.user,
        resource=resource,
        amount=locked_amount,
        currency=currency,
        payment_gateway=gateway_id,
        status='pending',
    )

    gateway = get_payment_gateway(gateway_id)
    return_url = data.get('return_url')
    init_data = gateway.initiate_payment(order, return_url=return_url)

    return JsonResponse({
        "success": True,
        "order_reference": order.order_reference,
        "amount": str(order.amount),
        "currency": order.currency,
        "resource": {
            "id": resource.id,
            "title": resource.title,
            "slug": resource.slug,
            "class_name": resource.class_subject.class_level.name,
            "subject_name": resource.class_subject.subject.name,
        },
        "payment": init_data,
    }, status=201)


def order_status(request, order_reference):
    """
    Returns current verified status for an order.
    Protected: Accessible only by the student who created the order or staff.
    """
    order = get_object_or_404(Order, order_reference=order_reference)

    if request.user.is_authenticated and not (request.user == order.student or request.user.is_staff):
        return JsonResponse({"error": "Unauthorized access to order."}, status=403)

    cls = order.resource.class_subject.class_level
    subj = order.resource.class_subject.subject

    return JsonResponse({
        "order_reference": order.order_reference,
        "status": order.status,
        "is_paid": order.status == 'paid',
        "amount": str(order.amount),
        "currency": order.currency,
        "payment_gateway": order.payment_gateway,
        "gateway_reference": order.gateway_reference,
        "created_at": order.created_at.isoformat(),
        "paid_at": order.paid_at.isoformat() if order.paid_at else None,
        "resource": {
            "id": order.resource.id,
            "title": order.resource.title,
            "slug": order.resource.slug,
            "download_url": f"/api/resources/{cls.slug}/{subj.slug}/{order.resource.slug}/download/" if order.status == 'paid' else None,
            "public_url": f"/{cls.slug}/{subj.slug}/{order.resource.slug}/",
        }
    }, status=200)


@csrf_exempt
def payment_callback(request, gateway_name):
    """
    Callback & return handler for payment gateways (JazzCash, Easypaisa, Sandbox).
    Idempotent: Duplicate notifications will not produce duplicate purchase records.
    """
    data = {}
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except Exception:
            data = request.POST.dict()
    elif request.method == 'GET':
        data = request.GET.dict()

    order_ref = (
        data.get('pp_BillReference') or
        data.get('order_reference') or
        data.get('order_ref') or
        data.get('orderRefNumber') or
        data.get('orderRefNum') or
        ''
    )

    if not order_ref:
        return JsonResponse({"error": "Missing order reference in callback payload."}, status=400)

    try:
        order = Order.objects.select_for_update().get(order_reference=order_ref)
    except Order.DoesNotExist:
        return JsonResponse({"error": f"Order {order_ref} not found."}, status=404)

    gateway = get_payment_gateway(gateway_name or order.payment_gateway)
    verification = gateway.verify_payment(data, order=order)

    with transaction.atomic():
        if verification.is_valid and verification.is_paid:
            if order.status != 'paid':
                order.status = 'paid'
                order.paid_at = timezone.now()
                order.gateway_reference = verification.gateway_reference or order.gateway_reference
                order.gateway_response_data = data
                order.save()

                purchase, created = Purchase.objects.get_or_create(
                    student=order.student,
                    resource=order.resource,
                    defaults={'order': order, 'is_active': True}
                )
                if not created and not purchase.is_active:
                    purchase.is_active = True
                    purchase.order = order
                    purchase.revoked_at = None
                    purchase.revocation_reason = ''
                    purchase.save()

                send_purchase_confirmation(order)

            if request.method == 'GET' or 'text/html' in request.META.get('HTTP_ACCEPT', ''):
                frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3001')
                return HttpResponseRedirect(f"{frontend_url}/checkout/result/?order_ref={order.order_reference}&status=success")

            return JsonResponse({"success": True, "status": "paid", "order_reference": order.order_reference})
        else:
            if order.status == 'pending':
                order.status = 'failed'
                order.gateway_response_data = data
                order.save()
                send_payment_failed_alert(order, verification.error_message)

            if request.method == 'GET' or 'text/html' in request.META.get('HTTP_ACCEPT', ''):
                frontend_url = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3001')
                return HttpResponseRedirect(f"{frontend_url}/checkout/result/?order_ref={order.order_reference}&status=failed")

            return JsonResponse({
                "success": False,
                "status": "failed",
                "error": verification.error_message,
                "order_reference": order.order_reference
            }, status=400)


@csrf_exempt
def sandbox_simulate_payment(request):
    """
    Developer & verification endpoint simulating instant payment confirmation.
    Valid only when PAYMENT_SANDBOX_ENABLED is true.
    """
    if not getattr(settings, 'PAYMENT_SANDBOX_ENABLED', True):
        return JsonResponse({"error": "Sandbox payment simulation is disabled."}, status=403)

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    order_ref = data.get('order_reference')
    if not order_ref:
        return JsonResponse({"error": "Order reference is required."}, status=400)

    try:
        order = Order.objects.get(order_reference=order_ref)
    except Order.DoesNotExist:
        return JsonResponse({"error": "Order not found."}, status=404)

    gateway = SandboxPaymentGateway()
    verification = gateway.verify_payment(data, order=order)

    if verification.is_valid and verification.is_paid:
        with transaction.atomic():
            if order.status != 'paid':
                order.status = 'paid'
                order.paid_at = timezone.now()
                order.gateway_reference = verification.gateway_reference
                order.gateway_response_data = {"mode": "sandbox", "simulated": True}
                order.save()

                purchase, created = Purchase.objects.get_or_create(
                    student=order.student,
                    resource=order.resource,
                    defaults={'order': order, 'is_active': True}
                )
                if not created and not purchase.is_active:
                    purchase.is_active = True
                    purchase.order = order
                    purchase.revoked_at = None
                    purchase.revocation_reason = ''
                    purchase.save()

                send_purchase_confirmation(order)

        return JsonResponse({
            "success": True,
            "status": "paid",
            "order_reference": order.order_reference,
            "message": "Payment verified and purchase access granted."
        }, status=200)

    return JsonResponse({"success": False, "error": verification.error_message}, status=400)


# ==============================================================================
# Admin Authentication Endpoints
# ==============================================================================
@csrf_exempt
def admin_login(request):
    """
    Admin authentication endpoint. Validates staff/superuser credentials.
    """
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return JsonResponse({"error": "Username and password are required."}, status=400)

    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({"error": "Invalid username or password."}, status=401)

    if not (user.is_staff or user.is_superuser):
        return JsonResponse({"error": "User does not have administrative access."}, status=403)

    login(request, user)

    return JsonResponse({
        "success": True,
        "user": {
            "username": user.username,
            "email": user.email,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
        }
    }, status=200)

@csrf_exempt
def admin_logout(request):
    """Logs out the active administrator session."""
    logout(request)
    return JsonResponse({"success": True, "message": "Logged out successfully."}, status=200)

def admin_me(request):
    """Returns current administrative authentication status."""
    if not request.user.is_authenticated:
        return JsonResponse({"authenticated": False, "user": None}, status=200)

    is_admin = request.user.is_staff or request.user.is_superuser
    return JsonResponse({
        "authenticated": is_admin,
        "user": {
            "username": request.user.username,
            "email": request.user.email,
            "is_staff": request.user.is_staff,
            "is_superuser": request.user.is_superuser,
        } if is_admin else None,
    }, status=200)


# ==============================================================================
# Admin Resource Management Endpoints
# ==============================================================================
@csrf_exempt
@admin_required
def admin_resources_list(request):
    """
    GET: List all resources (including drafts/unpublished) with filtering and search.
    POST: Create a new educational resource with optional PDF attachment.
    """
    if request.method == 'GET':
        query = request.GET.get('q', '').strip()
        class_filter = request.GET.get('class', '').strip()
        subject_filter = request.GET.get('subject', '').strip()
        status_filter = request.GET.get('status', '').strip()

        qs = Resource.objects.all().select_related(
            'class_subject__class_level', 'class_subject__subject', 'chapter'
        )

        if query:
            qs = qs.filter(
                Q(title__icontains=query) |
                Q(description__icontains=query) |
                Q(class_subject__subject__name__icontains=query) |
                Q(class_subject__class_level__name__icontains=query)
            )

        if class_filter:
            qs = qs.filter(class_subject__class_level__slug=class_filter)

        if subject_filter:
            qs = qs.filter(class_subject__subject__slug=subject_filter)

        if status_filter == 'published':
            qs = qs.filter(is_published=True)
        elif status_filter == 'draft':
            qs = qs.filter(is_published=False)

        items = []
        for r in qs:
            cls = r.class_subject.class_level
            subj = r.class_subject.subject
            items.append({
                "id": r.id,
                "title": r.title,
                "slug": r.slug,
                "class_name": cls.name,
                "class_slug": cls.slug,
                "subject_name": subj.name,
                "subject_slug": subj.slug,
                "chapter_title": r.chapter.title if r.chapter else None,
                "resource_type": r.resource_type,
                "resource_type_display": r.get_resource_type_display(),
                "file_format": r.file_format,
                "page_count": r.page_count,
                "file_size_bytes": r.file_size_bytes,
                "price": str(r.price),
                "currency": r.currency,
                "is_free": r.is_free,
                "has_pdf": bool(r.pdf_file),
                "is_published": r.is_published,
                "author_attribution": r.author_attribution,
                "public_url": f"/{cls.slug}/{subj.slug}/{r.slug}/",
                "updated_at": r.updated_at.isoformat(),
            })

        return JsonResponse({"total": len(items), "resources": items}, status=200)

    elif request.method == 'POST':
        # Create resource
        class_id = request.POST.get('class_level_id')
        subject_id = request.POST.get('subject_id')
        title = request.POST.get('title', '').strip()
        slug = request.POST.get('slug', '').strip()
        resource_type = request.POST.get('resource_type', 'complete_notes')
        description = request.POST.get('description', '').strip()
        content_preview = request.POST.get('content_preview', '').strip()
        page_count = int(request.POST.get('page_count', 0) or 0)
        is_published = request.POST.get('is_published', 'true').lower() in ('true', '1', 'yes')
        author_attribution = request.POST.get('author_attribution', 'FBISE Academic Panel & Subject Specialists').strip()
        chapter_id = request.POST.get('chapter_id')

        price_raw = request.POST.get('price', '100.00').strip()
        try:
            price = Decimal(price_raw) if price_raw else Decimal('100.00')
        except Exception:
            price = Decimal('100.00')
        is_free = request.POST.get('is_free', 'false').lower() in ('true', '1', 'yes')

        if not title:
            return JsonResponse({"error": "Title is required."}, status=400)
        if not slug:
            from django.utils.text import slugify
            slug = slugify(title)
        if not class_id or not subject_id:
            return JsonResponse({"error": "Class and Subject selections are required."}, status=400)

        class_subject = get_object_or_404(ClassSubject, class_level_id=class_id, subject_id=subject_id)

        # Check slug uniqueness within class_subject
        if Resource.objects.filter(class_subject=class_subject, slug=slug).exists():
            return JsonResponse({"error": f"A resource with slug '{slug}' already exists for this subject."}, status=400)

        chapter = None
        if chapter_id:
            chapter = Chapter.objects.filter(id=chapter_id, class_subject=class_subject).first()

        resource = Resource(
            class_subject=class_subject,
            chapter=chapter,
            title=title,
            slug=slug,
            resource_type=resource_type,
            description=description,
            content_preview=content_preview,
            page_count=page_count,
            price=price,
            is_free=is_free,
            is_published=is_published,
            author_attribution=author_attribution,
        )

        pdf_file = request.FILES.get('pdf_file')
        if pdf_file:
            try:
                validate_pdf_file(pdf_file)
                resource.pdf_file = pdf_file
                resource.file_size_bytes = pdf_file.size
                resource.file_format = 'PDF'
            except ValidationError as exc:
                return JsonResponse({"error": exc.message}, status=400)

        resource.save()

        return JsonResponse({
            "success": True,
            "id": resource.id,
            "title": resource.title,
            "slug": resource.slug,
            "is_published": resource.is_published,
            "has_pdf": bool(resource.pdf_file),
            "message": "Resource created successfully.",
        }, status=201)

    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
@admin_required
def admin_resource_detail(request, resource_id):
    """
    GET: Get full resource data for administrative editing.
    PUT / POST: Update resource metadata.
    DELETE: Delete resource with safe file cleanup.
    """
    resource = get_object_or_404(Resource, id=resource_id)

    if request.method == 'GET':
        cls = resource.class_subject.class_level
        subj = resource.class_subject.subject
        return JsonResponse({
            "id": resource.id,
            "title": resource.title,
            "slug": resource.slug,
            "class_level_id": cls.id,
            "class_name": cls.name,
            "class_slug": cls.slug,
            "subject_id": subj.id,
            "subject_name": subj.name,
            "subject_slug": subj.slug,
            "chapter_id": resource.chapter.id if resource.chapter else None,
            "resource_type": resource.resource_type,
            "description": resource.description,
            "content_preview": resource.content_preview,
            "page_count": resource.page_count,
            "is_published": resource.is_published,
            "author_attribution": resource.author_attribution,
            "meta_title": resource.meta_title,
            "meta_description": resource.meta_description,
            "has_pdf": bool(resource.pdf_file),
            "pdf_name": os.path.basename(resource.pdf_file.name) if resource.pdf_file else None,
            "file_size_bytes": resource.file_size_bytes,
            "price": str(resource.price),
            "currency": resource.currency,
            "is_free": resource.is_free,
            "public_url": f"/{cls.slug}/{subj.slug}/{resource.slug}/",
            "updated_at": resource.updated_at.isoformat(),
        }, status=200)

    elif request.method in ('PUT', 'POST'):
        try:
            data = json.loads(request.body)
        except Exception:
            data = request.POST

        title = data.get('title', resource.title).strip()
        slug = data.get('slug', resource.slug).strip()
        description = data.get('description', resource.description).strip()
        content_preview = data.get('content_preview', resource.content_preview).strip()
        resource_type = data.get('resource_type', resource.resource_type)
        page_count = data.get('page_count', resource.page_count)
        is_published = data.get('is_published', resource.is_published)
        if isinstance(is_published, str):
            is_published = is_published.lower() in ('true', '1', 'yes')
        author_attribution = data.get('author_attribution', resource.author_attribution).strip()
        meta_title = data.get('meta_title', resource.meta_title).strip()
        meta_description = data.get('meta_description', resource.meta_description).strip()

        price_val = data.get('price')
        if price_val is not None:
            try:
                resource.price = Decimal(str(price_val).strip())
            except Exception:
                pass

        is_free_val = data.get('is_free')
        if is_free_val is not None:
            if isinstance(is_free_val, str):
                resource.is_free = is_free_val.lower() in ('true', '1', 'yes')
            else:
                resource.is_free = bool(is_free_val)

        # Check slug collision
        if slug != resource.slug:
            if Resource.objects.filter(class_subject=resource.class_subject, slug=slug).exclude(id=resource.id).exists():
                return JsonResponse({"error": f"Slug '{slug}' is already in use for this subject."}, status=400)

        resource.title = title
        resource.slug = slug
        resource.description = description
        resource.content_preview = content_preview
        resource.resource_type = resource_type
        resource.page_count = int(page_count or 0)
        resource.is_published = is_published
        resource.author_attribution = author_attribution
        resource.meta_title = meta_title
        resource.meta_description = meta_description
        resource.save()

        return JsonResponse({
            "success": True,
            "id": resource.id,
            "title": resource.title,
            "slug": resource.slug,
            "is_published": resource.is_published,
            "message": "Resource updated successfully.",
        }, status=200)

    elif request.method == 'DELETE':
        # Safe deletion: remove record and clean up associated storage file
        resource_id_val = resource.id
        title = resource.title
        file_to_remove = None
        if resource.pdf_file and hasattr(resource.pdf_file, 'path'):
            try:
                if os.path.isfile(resource.pdf_file.path):
                    file_to_remove = resource.pdf_file.path
            except Exception:
                file_to_remove = None

        resource.delete()

        if file_to_remove:
            try:
                if os.path.isfile(file_to_remove):
                    os.remove(file_to_remove)
            except Exception as exc:
                logger.warning(f"Failed to remove deleted resource file: {exc}")

        return JsonResponse({
            "success": True,
            "deleted_id": resource_id_val,
            "message": f"Resource '{title}' deleted successfully.",
        }, status=200)

    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
@admin_required
def admin_resource_upload_pdf(request, resource_id):
    """
    Safely uploads or replaces the PDF file for a resource.
    Validates magic bytes and file size before altering the record.
    Preserves the existing PDF if the uploaded file is invalid.
    """
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    resource = get_object_or_404(Resource, id=resource_id)
    pdf_file = request.FILES.get('pdf_file')

    if not pdf_file:
        return JsonResponse({"error": "No PDF file provided in request."}, status=400)

    try:
        safe_replace_pdf(resource, pdf_file)
        return JsonResponse({
            "success": True,
            "id": resource.id,
            "has_pdf": True,
            "file_size_bytes": resource.file_size_bytes,
            "message": "PDF uploaded and attached successfully.",
        }, status=200)
    except ValidationError as exc:
        return JsonResponse({"error": exc.message}, status=400)
    except Exception as exc:
        logger.error(f"Upload error: {exc}")
        return JsonResponse({"error": f"Failed to process upload: {str(exc)}"}, status=500)

@csrf_exempt
@admin_required
def admin_resource_toggle_publish(request, resource_id):
    """Instant publish/unpublish toggle."""
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    resource = get_object_or_404(Resource, id=resource_id)
    resource.is_published = not resource.is_published
    resource.save()

    return JsonResponse({
        "success": True,
        "id": resource.id,
        "is_published": resource.is_published,
        "status_label": "Published" if resource.is_published else "Draft",
        "message": f"Resource is now {'published' if resource.is_published else 'unpublished'}.",
    }, status=200)


# ==============================================================================
# Admin Educational Structure Management Endpoints
# ==============================================================================
@csrf_exempt
@admin_required
def admin_structure_overview(request):
    """Returns class levels, subjects, and class-subject mappings for administrative assignment."""
    classes = ClassLevel.objects.all().prefetch_related('class_subjects__subject', 'class_subjects__chapters')
    subjects = Subject.objects.all()

    classes_data = []
    for cls in classes:
        cs_list = []
        for cs in cls.class_subjects.all():
            chapters = [
                {"id": ch.id, "number": ch.chapter_number, "title": ch.title, "slug": ch.slug}
                for ch in cs.chapters.all()
            ]
            cs_list.append({
                "id": cs.id,
                "subject_id": cs.subject.id,
                "subject_name": cs.subject.name,
                "subject_slug": cs.subject.slug,
                "total_chapters": cs.total_chapters,
                "syllabus_overview": cs.syllabus_overview,
                "is_active": cs.is_active,
                "chapters": chapters,
            })
        classes_data.append({
            "id": cls.id,
            "name": cls.name,
            "grade_number": cls.grade_number,
            "slug": cls.slug,
            "is_active": cls.is_active,
            "class_subjects": cs_list,
        })

    subjects_data = [
        {"id": s.id, "name": s.name, "slug": s.slug, "code": s.code, "icon_name": s.icon_name}
        for s in subjects
    ]

    return JsonResponse({
        "classes": classes_data,
        "subjects": subjects_data,
    }, status=200)

@csrf_exempt
@admin_required
def admin_create_subject(request):
    """Creates a new subject in the curriculum."""
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    name = data.get('name', '').strip()
    slug = data.get('slug', '').strip()
    code = data.get('code', '').strip()
    icon_name = data.get('icon_name', 'book').strip()
    description = data.get('description', '').strip()

    if not name:
        return JsonResponse({"error": "Subject name is required."}, status=400)
    if not slug:
        from django.utils.text import slugify
        slug = slugify(name)

    if Subject.objects.filter(slug=slug).exists():
        return JsonResponse({"error": f"Subject with slug '{slug}' already exists."}, status=400)

    subject = Subject.objects.create(
        name=name,
        slug=slug,
        code=code,
        icon_name=icon_name,
        description=description,
    )

    return JsonResponse({
        "success": True,
        "id": subject.id,
        "name": subject.name,
        "slug": subject.slug,
    }, status=201)

@csrf_exempt
@admin_required
def admin_create_chapter(request):
    """Creates a new chapter under a ClassSubject."""
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    class_subject_id = data.get('class_subject_id')
    chapter_number = data.get('chapter_number')
    title = data.get('title', '').strip()
    slug = data.get('slug', '').strip()
    overview = data.get('overview', '').strip()

    if not class_subject_id or not chapter_number or not title:
        return JsonResponse({"error": "Class subject, chapter number, and title are required."}, status=400)

    class_subject = get_object_or_404(ClassSubject, id=class_subject_id)
    if not slug:
        from django.utils.text import slugify
        slug = slugify(f"ch-{chapter_number}-{title}")

    if Chapter.objects.filter(class_subject=class_subject, chapter_number=chapter_number).exists():
        return JsonResponse({"error": f"Chapter {chapter_number} already exists for this subject."}, status=400)

    chapter = Chapter.objects.create(
        class_subject=class_subject,
        chapter_number=int(chapter_number),
        title=title,
        slug=slug,
        overview=overview,
    )

    return JsonResponse({
        "success": True,
        "id": chapter.id,
        "chapter_number": chapter.chapter_number,
        "title": chapter.title,
        "slug": chapter.slug,
    }, status=201)


# ==============================================================================
# Admin Orders & Sales Management Endpoints
# ==============================================================================
@csrf_exempt
@admin_required
def admin_orders_list(request):
    """
    Lists orders with filtering, search, and revenue summary metrics for staff.
    """
    qs = Order.objects.all().select_related(
        'student',
        'resource__class_subject__class_level',
        'resource__class_subject__subject'
    )

    query = request.GET.get('q', '').strip()
    status_filter = request.GET.get('status', '').strip()
    gateway_filter = request.GET.get('gateway', '').strip()

    if query:
        qs = qs.filter(
            Q(order_reference__icontains=query) |
            Q(student__email__icontains=query) |
            Q(student__first_name__icontains=query) |
            Q(resource__title__icontains=query) |
            Q(gateway_reference__icontains=query)
        )

    if status_filter:
        qs = qs.filter(status=status_filter)

    if gateway_filter:
        qs = qs.filter(payment_gateway=gateway_filter)

    total_orders = qs.count()
    paid_orders = qs.filter(status='paid')
    total_revenue = sum(o.amount for o in paid_orders)

    orders_data = [
        {
            "id": o.id,
            "order_reference": o.order_reference,
            "student_id": o.student.id,
            "student_email": o.student.email,
            "student_name": o.student.first_name or o.student.username,
            "resource_id": o.resource.id,
            "resource_title": o.resource.title,
            "class_name": o.resource.class_subject.class_level.name,
            "subject_name": o.resource.class_subject.subject.name,
            "amount": str(o.amount),
            "currency": o.currency,
            "payment_gateway": o.payment_gateway,
            "gateway_reference": o.gateway_reference,
            "status": o.status,
            "status_display": o.get_status_display(),
            "created_at": o.created_at.isoformat(),
            "paid_at": o.paid_at.isoformat() if o.paid_at else None,
        }
        for o in qs[:100]
    ]

    return JsonResponse({
        "total": total_orders,
        "total_orders": total_orders,
        "paid_orders_count": paid_orders.count(),
        "total_revenue_pkr": str(total_revenue),
        "orders": orders_data,
    }, status=200)


@csrf_exempt
@admin_required
def admin_order_detail(request, order_id):
    """
    Returns complete order metadata, transaction references, and associated purchase status.
    """
    order = get_object_or_404(
        Order.objects.select_related('student', 'resource__class_subject__class_level', 'resource__class_subject__subject'),
        id=order_id
    )
    purchase = getattr(order, 'purchase', None)

    return JsonResponse({
        "id": order.id,
        "order_reference": order.order_reference,
        "student": {
            "id": order.student.id,
            "email": order.student.email,
            "full_name": order.student.first_name or order.student.username,
        },
        "resource": {
            "id": order.resource.id,
            "title": order.resource.title,
            "slug": order.resource.slug,
            "class_name": order.resource.class_subject.class_level.name,
            "subject_name": order.resource.class_subject.subject.name,
            "price": str(order.resource.price),
        },
        "amount": str(order.amount),
        "currency": order.currency,
        "payment_gateway": order.payment_gateway,
        "gateway_reference": order.gateway_reference,
        "status": order.status,
        "status_display": order.get_status_display(),
        "gateway_response_data": order.gateway_response_data,
        "created_at": order.created_at.isoformat(),
        "paid_at": order.paid_at.isoformat() if order.paid_at else None,
        "purchase": {
            "id": purchase.id,
            "is_active": purchase.is_active,
            "access_granted_at": purchase.access_granted_at.isoformat(),
            "revoked_at": purchase.revoked_at.isoformat() if purchase.revoked_at else None,
            "revocation_reason": purchase.revocation_reason,
        } if purchase else None,
    }, status=200)


@csrf_exempt
@admin_required
def admin_order_refund(request, order_id):
    """
    Controlled administrative refund & access revocation.
    Marks order as refunded and deactivates the student's purchase download grant.
    """
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    order = get_object_or_404(Order, id=order_id)
    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    reason = data.get('reason', 'Administrative refund / access revocation').strip()

    with transaction.atomic():
        order.status = 'refunded'
        order.save()

        if hasattr(order, 'purchase'):
            order.purchase.is_active = False
            order.purchase.revoked_at = timezone.now()
            order.purchase.revocation_reason = reason
            order.purchase.save()

    return JsonResponse({
        "success": True,
        "order_id": order.id,
        "order_reference": order.order_reference,
        "status": "refunded",
        "message": f"Order {order.order_reference} marked as refunded and student access revoked."
    }, status=200)

