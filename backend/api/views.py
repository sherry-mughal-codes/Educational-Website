import os
import re
import string
import json
import uuid
import csv
import io
from decimal import Decimal
from functools import wraps
from django.conf import settings
from django.http import JsonResponse, Http404, FileResponse, HttpResponseRedirect
from django.db import connection, transaction
from django.db.models import Q, Count, Sum, Avg, Max, ProtectedError
from django.utils import timezone
from django.utils.text import slugify
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

from .models import (
    ClassLevel, Subject, ClassSubject, Chapter, Resource, StudentProfile, Order, Purchase,
    PracticeTopic, Question, QuestionOption, QuestionAcceptedAnswer, PracticeSession, PracticeAttempt
)
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
        force_delete = request.GET.get('force') == 'true'

        try:
            with transaction.atomic():
                resource_id_val = resource.id
                title = resource.title
                file_to_remove = None
                if resource.pdf_file and hasattr(resource.pdf_file, 'path'):
                    try:
                        if os.path.isfile(resource.pdf_file.path):
                            file_to_remove = resource.pdf_file.path
                    except Exception:
                        file_to_remove = None

                if force_delete:
                    # Clean up associated purchases and orders if explicitly requested by admin
                    resource.purchases.all().delete()
                    resource.orders.all().delete()

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

        except ProtectedError:
            orders_count = resource.orders.count()
            purchases_count = resource.purchases.count()
            return JsonResponse({
                "error": (
                    f"Cannot delete '{resource.title}' because {purchases_count} student purchase(s) and {orders_count} order(s) are linked to it. "
                    "Unpublish the resource to hide it from all students while preserving purchase records, or use Force Delete to remove it and its attached test orders."
                ),
                "is_protected": True,
                "orders_count": orders_count,
                "purchases_count": purchases_count,
            }, status=400)
        except Exception as exc:
            logger.exception(f"Error deleting resource {resource_id}: {exc}")
            return JsonResponse({"error": f"Failed to delete resource: {str(exc)}"}, status=500)

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


# ==============================================================================
# INTERACTIVE LEARNING & CHAPTER PRACTICE SYSTEM
# ==============================================================================

def normalize_answer_string(text: str, case_sensitive: bool = False) -> str:
    """
    Normalizes short answers and fill-in-the-blank inputs for robust evaluation.
    Trims outer whitespace, condenses inner spacing, removes common trailing/leading
    punctuation marks, and converts to lowercase unless case_sensitive is True.
    """
    if not text:
        return ""
    text = text.strip()
    if not case_sensitive:
        text = text.lower()
    text = re.sub(r'\s+', ' ', text)
    # Strip terminal and boundary punctuation (e.g. '.', ',', '!', '?', ';', ':', '"', "'")
    text = text.strip(string.punctuation + " ")
    return text


def get_question_correct_answer_display(question: Question) -> str:
    """
    Returns a clean, human-readable representation of the correct answer
    for post-submission feedback and explanations.
    """
    if question.question_type in ('mcq', 'true_false'):
        correct_opt = question.options.filter(is_correct=True).first()
        return correct_opt.option_text if correct_opt else "Correct option not configured"
    elif question.question_type in ('fill_blank', 'short_answer'):
        accepted = list(question.accepted_answers.values_list('accepted_text', flat=True))
        if accepted:
            return accepted[0]
        return "Correct answer not configured"
    return "Not configured"


def subject_practice_topics(request, class_slug, subject_slug):
    """
    Public curriculum practice directory.
    Returns chapters and published interactive topics for a subject and class,
    including topic question counts and student progress indicators.
    """
    class_level = get_object_or_404(ClassLevel, slug=class_slug, is_active=True)
    subject = get_object_or_404(Subject, slug=subject_slug)
    class_subject = get_object_or_404(ClassSubject, class_level=class_level, subject=subject, is_active=True)

    guest_id = request.GET.get('guest_identifier', '').strip()

    chapters_qs = class_subject.chapters.all().prefetch_related(
        'practice_topics',
        'practice_topics__questions',
    ).order_by('chapter_number')

    chapters_data = []
    total_topics_count = 0

    for ch in chapters_qs:
        topics_qs = ch.practice_topics.filter(is_published=True).order_by('order', 'id')
        topics_list = []

        for topic in topics_qs:
            q_count = topic.questions.filter(is_published=True).count()
            total_topics_count += 1

            # Fetch existing practice status for this student/guest
            status = {
                "attempted": False,
                "is_completed": False,
                "accuracy_percentage": 0.0,
                "score": 0,
                "correct_answers": 0,
                "total_questions": q_count,
            }

            session_filter = Q(topic=topic)
            if request.user.is_authenticated:
                session_filter &= Q(student=request.user)
            elif guest_id:
                session_filter &= Q(guest_identifier=guest_id)
            else:
                session_filter = None

            if session_filter:
                latest_session = PracticeSession.objects.filter(session_filter).order_by('-is_completed', '-completed_at', '-started_at').first()
                if latest_session:
                    status = {
                        "attempted": True,
                        "is_completed": latest_session.is_completed,
                        "accuracy_percentage": float(latest_session.accuracy_percentage),
                        "score": latest_session.score,
                        "correct_answers": latest_session.correct_answers,
                        "total_questions": latest_session.total_questions or q_count,
                    }

            topics_list.append({
                "id": topic.id,
                "title": topic.title,
                "slug": topic.slug,
                "description": topic.description,
                "difficulty": topic.difficulty,
                "order": topic.order,
                "question_count": q_count,
                "status": status,
            })

        chapters_data.append({
            "id": ch.id,
            "chapter_number": ch.chapter_number,
            "title": ch.title,
            "slug": ch.slug,
            "overview": ch.overview,
            "topics": topics_list,
        })

    return JsonResponse({
        "class_level": {
            "name": class_level.name,
            "slug": class_level.slug,
            "grade_number": class_level.grade_number,
        },
        "subject": {
            "name": subject.name,
            "slug": subject.slug,
            "code": subject.code,
            "icon_name": subject.icon_name,
        },
        "chapters": chapters_data,
        "total_topics": total_topics_count,
    }, status=200)


def practice_topic_detail(request, topic_slug):
    """
    Returns public metadata for an interactive practice topic.
    """
    topic = get_object_or_404(
        PracticeTopic.objects.select_related('chapter__class_subject__class_level', 'chapter__class_subject__subject'),
        slug=topic_slug,
        is_published=True
    )

    q_count = topic.questions.filter(is_published=True).count()

    return JsonResponse({
        "id": topic.id,
        "title": topic.title,
        "slug": topic.slug,
        "description": topic.description,
        "difficulty": topic.difficulty,
        "order": topic.order,
        "question_count": q_count,
        "chapter": {
            "id": topic.chapter.id,
            "chapter_number": topic.chapter.chapter_number,
            "title": topic.chapter.title,
            "slug": topic.chapter.slug,
        },
        "subject": {
            "name": topic.chapter.class_subject.subject.name,
            "slug": topic.chapter.class_subject.subject.slug,
            "icon_name": topic.chapter.class_subject.subject.icon_name,
        },
        "class_level": {
            "name": topic.chapter.class_subject.class_level.name,
            "slug": topic.chapter.class_subject.class_level.slug,
            "grade_number": topic.chapter.class_subject.class_level.grade_number,
        }
    }, status=200)


@csrf_exempt
def practice_session_start(request, topic_slug):
    """
    Starts or resumes an interactive practice session for a topic.
    CRITICAL SECURITY RULE:
    Questions returned here NEVER expose 'is_correct' or 'explanation'
    for unattempted questions! Explanations and correct answers are
    strictly sent only after question answer submission.
    """
    if request.method != 'POST':
        return JsonResponse({"error": "POST method required"}, status=405)

    topic = get_object_or_404(
        PracticeTopic.objects.select_related('chapter__class_subject__class_level', 'chapter__class_subject__subject'),
        slug=topic_slug,
        is_published=True
    )

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    guest_id = data.get('guest_identifier', '').strip()
    force_new = data.get('force_new', False)
    retry_ids = data.get('retry_question_ids', [])

    # Check for active existing session
    session = None
    if not force_new and not retry_ids:
        if request.user.is_authenticated:
            session = PracticeSession.objects.filter(
                student=request.user,
                topic=topic,
                is_completed=False
            ).first()
        elif guest_id:
            session = PracticeSession.objects.filter(
                guest_identifier=guest_id,
                topic=topic,
                is_completed=False
            ).first()

    if not session:
        session = PracticeSession.objects.create(
            student=request.user if request.user.is_authenticated else None,
            guest_identifier=guest_id if not request.user.is_authenticated else '',
            topic=topic,
        )

    # Fetch questions
    q_filter = Q(topic=topic, is_published=True)
    if retry_ids and isinstance(retry_ids, list):
        q_filter &= Q(id__in=retry_ids)

    questions_qs = Question.objects.filter(q_filter).prefetch_related(
        'options',
        'accepted_answers',
    ).order_by('order', 'id')

    # Update session question count
    total_q = questions_qs.count()
    if session.total_questions != total_q:
        session.total_questions = total_q
        session.save(update_fields=['total_questions'])

    # Map existing attempts for this session
    existing_attempts = {
        att.question_id: att for att in session.attempts.all().select_related('selected_option')
    }

    sanitized_questions = []
    for q in questions_qs:
        attempt = existing_attempts.get(q.id)

        # Options for MCQ/TrueFalse (NO is_correct field sent to client!)
        options = []
        if q.question_type in ('mcq', 'true_false'):
            options = [
                {
                    "id": opt.id,
                    "option_text": opt.option_text,
                    "order": opt.order
                }
                for opt in q.options.all().order_by('order', 'id')
            ]

        item = {
            "id": q.id,
            "question_type": q.question_type,
            "prompt": q.prompt,
            "points": q.points,
            "difficulty": q.difficulty,
            "order": q.order,
            "options": options,
            "is_answered": attempt is not None,
        }

        # If question has already been answered, include its attempt feedback and explanation
        if attempt:
            item["attempt"] = {
                "selected_option_id": attempt.selected_option_id,
                "text_answer": attempt.text_answer,
                "is_correct": attempt.is_correct,
                "points_awarded": attempt.points_awarded,
                "explanation": q.explanation,
                "correct_answer_display": get_question_correct_answer_display(q),
            }
        else:
            item["attempt"] = None

        sanitized_questions.append(item)

    answered_count = len(existing_attempts)

    return JsonResponse({
        "session_id": session.id,
        "session_uuid": str(session.session_uuid),
        "is_completed": session.is_completed,
        "score": session.score,
        "correct_answers": session.correct_answers,
        "total_questions": session.total_questions,
        "answered_count": answered_count,
        "accuracy_percentage": float(session.accuracy_percentage),
        "topic": {
            "id": topic.id,
            "title": topic.title,
            "slug": topic.slug,
            "difficulty": topic.difficulty,
            "chapter_title": topic.chapter.title,
            "chapter_number": topic.chapter.chapter_number,
            "subject_name": topic.chapter.class_subject.subject.name,
            "subject_slug": topic.chapter.class_subject.subject.slug,
            "class_name": topic.chapter.class_subject.class_level.name,
            "class_slug": topic.chapter.class_subject.class_level.slug,
        },
        "questions": sanitized_questions,
    }, status=200)


@csrf_exempt
def practice_question_submit(request, question_id):
    """
    Submits an answer for an individual practice question in an active session.
    Validates correctness on the backend and returns immediate feedback,
    points awarded, and the comprehensive educational explanation.
    """
    if request.method != 'POST':
        return JsonResponse({"error": "POST method required"}, status=405)

    question = get_object_or_404(
        Question.objects.select_related('topic'),
        id=question_id,
        is_published=True
    )

    try:
        data = json.loads(request.body)
    except Exception:
        data = request.POST

    session_uuid = data.get('session_uuid')
    if not session_uuid:
        return JsonResponse({"error": "session_uuid is required"}, status=400)

    try:
        session = PracticeSession.objects.get(session_uuid=session_uuid)
    except PracticeSession.DoesNotExist:
        return JsonResponse({"error": "Practice session not found"}, status=404)

    # Validate that question belongs to the session topic
    if question.topic_id != session.topic_id:
        return JsonResponse({"error": "Question does not belong to this practice session topic"}, status=400)

    # Check if this question was already attempted in this session
    existing_attempt = PracticeAttempt.objects.filter(session=session, question=question).first()
    if existing_attempt:
        return JsonResponse({
            "success": True,
            "already_attempted": True,
            "is_correct": existing_attempt.is_correct,
            "points_awarded": existing_attempt.points_awarded,
            "explanation": question.explanation,
            "correct_answer_display": get_question_correct_answer_display(question),
            "session_summary": {
                "session_uuid": str(session.session_uuid),
                "correct_answers": session.correct_answers,
                "total_answered": session.attempts.count(),
                "total_questions": session.total_questions,
                "score": session.score,
                "accuracy_percentage": float(session.accuracy_percentage),
                "is_all_completed": session.attempts.count() >= session.total_questions,
            }
        }, status=200)

    # Evaluate the answer according to question type
    is_correct = False
    selected_option = None
    submitted_text = ''

    if question.question_type in ('mcq', 'true_false'):
        selected_option_id = data.get('selected_option_id')
        if not selected_option_id:
            return JsonResponse({"error": "selected_option_id is required for this question type"}, status=400)

        selected_option = question.options.filter(id=selected_option_id).first()
        if not selected_option:
            return JsonResponse({"error": "Selected option does not exist for this question"}, status=400)

        is_correct = bool(selected_option.is_correct)

    elif question.question_type in ('fill_blank', 'short_answer'):
        submitted_text = str(data.get('text_answer', '')).strip()
        if not submitted_text:
            return JsonResponse({"error": "text_answer is required for this question type"}, status=400)

        accepted_answers = list(question.accepted_answers.all())
        for acc in accepted_answers:
            norm_sub = normalize_answer_string(submitted_text, acc.is_case_sensitive)
            norm_acc = normalize_answer_string(acc.accepted_text, acc.is_case_sensitive)
            if norm_sub == norm_acc:
                is_correct = True
                break

    points_awarded = question.points if is_correct else 0

    with transaction.atomic():
        attempt = PracticeAttempt.objects.create(
            session=session,
            question=question,
            selected_option=selected_option,
            text_answer=submitted_text,
            is_correct=is_correct,
            points_awarded=points_awarded,
        )

        # Recalculate session statistics
        total_attempts = session.attempts.count()
        correct_count = session.attempts.filter(is_correct=True).count()
        total_score = session.attempts.aggregate(total=Sum('points_awarded'))['total'] or 0

        session.correct_answers = correct_count
        session.score = total_score
        if total_attempts > 0:
            session.accuracy_percentage = round(Decimal((correct_count / total_attempts) * 100), 2)
        session.save()

    correct_answer_display = get_question_correct_answer_display(question)
    is_all_completed = total_attempts >= session.total_questions

    return JsonResponse({
        "success": True,
        "is_correct": is_correct,
        "points_awarded": points_awarded,
        "explanation": question.explanation,
        "correct_answer_display": correct_answer_display,
        "session_summary": {
            "session_uuid": str(session.session_uuid),
            "correct_answers": session.correct_answers,
            "total_answered": total_attempts,
            "total_questions": session.total_questions,
            "score": session.score,
            "accuracy_percentage": float(session.accuracy_percentage),
            "is_all_completed": is_all_completed,
        }
    }, status=200)


@csrf_exempt
def practice_session_finish(request, session_uuid):
    """
    Finalizes a practice session and returns a comprehensive recap,
    including individual question reviews and an incorrect questions list for retry.
    """
    if request.method != 'POST':
        return JsonResponse({"error": "POST method required"}, status=405)

    try:
        session = PracticeSession.objects.select_related(
            'topic__chapter__class_subject__class_level',
            'topic__chapter__class_subject__subject'
        ).get(session_uuid=session_uuid)
    except PracticeSession.DoesNotExist:
        return JsonResponse({"error": "Practice session not found"}, status=404)

    total_attempts = session.attempts.count()
    correct_count = session.attempts.filter(is_correct=True).count()
    total_score = session.attempts.aggregate(total=Sum('points_awarded'))['total'] or 0

    session.is_completed = True
    session.completed_at = timezone.now()
    session.correct_answers = correct_count
    session.score = total_score
    if total_attempts > 0:
        session.accuracy_percentage = round(Decimal((correct_count / total_attempts) * 100), 2)
    session.save()

    # Build review of attempts
    attempts_review = []
    incorrect_question_ids = []

    for att in session.attempts.all().select_related('question', 'selected_option').order_by('question__order', 'id'):
        q = att.question
        if not att.is_correct:
            incorrect_question_ids.append(q.id)

        student_answer = ""
        if q.question_type in ('mcq', 'true_false'):
            student_answer = att.selected_option.option_text if att.selected_option else "No option selected"
        else:
            student_answer = att.text_answer

        attempts_review.append({
            "question_id": q.id,
            "prompt": q.prompt,
            "question_type": q.question_type,
            "is_correct": att.is_correct,
            "points_awarded": att.points_awarded,
            "student_answer": student_answer,
            "correct_answer": get_question_correct_answer_display(q),
            "explanation": q.explanation,
        })

    return JsonResponse({
        "success": True,
        "session_uuid": str(session.session_uuid),
        "is_completed": True,
        "completed_at": session.completed_at.isoformat(),
        "total_questions": session.total_questions,
        "total_answered": total_attempts,
        "correct_answers": session.correct_answers,
        "score": session.score,
        "accuracy_percentage": float(session.accuracy_percentage),
        "topic": {
            "id": session.topic.id,
            "title": session.topic.title,
            "slug": session.topic.slug,
            "chapter_title": session.topic.chapter.title,
            "chapter_number": session.topic.chapter.chapter_number,
            "subject_name": session.topic.chapter.class_subject.subject.name,
            "subject_slug": session.topic.chapter.class_subject.subject.slug,
            "class_name": session.topic.chapter.class_subject.class_level.name,
            "class_slug": session.topic.chapter.class_subject.class_level.slug,
        },
        "incorrect_question_ids": incorrect_question_ids,
        "attempts": attempts_review,
    }, status=200)


def student_practice_progress(request):
    """
    Returns student learning progress, questions attempted, overall accuracy,
    and history of practice sessions.
    """
    guest_id = request.GET.get('guest_identifier', '').strip()

    if request.user.is_authenticated:
        sessions_qs = PracticeSession.objects.filter(student=request.user)
    elif guest_id:
        sessions_qs = PracticeSession.objects.filter(guest_identifier=guest_id)
    else:
        return JsonResponse({
            "total_sessions_completed": 0,
            "total_questions_attempted": 0,
            "total_correct": 0,
            "overall_accuracy": 0.0,
            "total_score": 0,
            "recent_sessions": [],
        }, status=200)

    completed_sessions = sessions_qs.filter(is_completed=True).select_related(
        'topic__chapter__class_subject__class_level',
        'topic__chapter__class_subject__subject'
    ).order_by('-completed_at')

    total_sessions_completed = completed_sessions.count()

    # Aggregate overall stats across all attempts
    all_attempts = PracticeAttempt.objects.filter(session__in=sessions_qs)
    total_questions_attempted = all_attempts.count()
    total_correct = all_attempts.filter(is_correct=True).count()
    total_score = all_attempts.aggregate(total=Sum('points_awarded'))['total'] or 0

    overall_accuracy = 0.0
    if total_questions_attempted > 0:
        overall_accuracy = round(float((total_correct / total_questions_attempted) * 100), 1)

    recent_sessions_data = []
    for s in completed_sessions[:10]:
        recent_sessions_data.append({
            "session_uuid": str(s.session_uuid),
            "topic_id": s.topic.id,
            "topic_title": s.topic.title,
            "topic_slug": s.topic.slug,
            "chapter_title": s.topic.chapter.title,
            "chapter_number": s.topic.chapter.chapter_number,
            "subject_name": s.topic.chapter.class_subject.subject.name,
            "class_name": s.topic.chapter.class_subject.class_level.name,
            "correct_answers": s.correct_answers,
            "total_questions": s.total_questions,
            "accuracy_percentage": float(s.accuracy_percentage),
            "score": s.score,
            "completed_at": s.completed_at.strftime('%Y-%m-%d %H:%M') if s.completed_at else '',
        })

    return JsonResponse({
        "total_sessions_completed": total_sessions_completed,
        "total_questions_attempted": total_questions_attempted,
        "total_correct": total_correct,
        "overall_accuracy": overall_accuracy,
        "total_score": total_score,
        "recent_sessions": recent_sessions_data,
    }, status=200)


# ==============================================================================
# ADMIN PRACTICE CONTENT MANAGEMENT ENDPOINTS
# ==============================================================================

@admin_required
def admin_practice_overview(request):
    """
    Overview of educational classes, subjects, and chapters with their
    interactive practice topics and question counts for administrative management.
    """
    classes = ClassLevel.objects.all().order_by('grade_number')
    result = []

    for cl in classes:
        subjects_data = []
        for cs in cl.class_subjects.filter(is_active=True).select_related('subject').order_by('subject__name'):
            chapters_data = []
            for ch in cs.chapters.all().order_by('chapter_number'):
                topics_data = []
                for tp in ch.practice_topics.all().order_by('order', 'id'):
                    q_count = tp.questions.count()
                    topics_data.append({
                        "id": tp.id,
                        "title": tp.title,
                        "slug": tp.slug,
                        "difficulty": tp.difficulty,
                        "order": tp.order,
                        "is_published": tp.is_published,
                        "question_count": q_count,
                    })
                chapters_data.append({
                    "id": ch.id,
                    "chapter_number": ch.chapter_number,
                    "title": ch.title,
                    "topics": topics_data,
                })
            subjects_data.append({
                "id": cs.subject.id,
                "name": cs.subject.name,
                "slug": cs.subject.slug,
                "chapters": chapters_data,
            })
        result.append({
            "id": cl.id,
            "name": cl.name,
            "grade_number": cl.grade_number,
            "slug": cl.slug,
            "subjects": subjects_data,
        })

    return JsonResponse({"classes": result}, status=200)


@csrf_exempt
@admin_required
def admin_practice_topics(request):
    """
    List or create interactive practice topics.
    GET: Filter by chapter_id
    POST: Create new topic
    """
    if request.method == 'GET':
        chapter_id = request.GET.get('chapter_id')
        qs = PracticeTopic.objects.all().select_related('chapter__class_subject__class_level', 'chapter__class_subject__subject')
        if chapter_id:
            qs = qs.filter(chapter_id=chapter_id)
        qs = qs.order_by('chapter', 'order', 'id')

        topics = []
        for tp in qs:
            topics.append({
                "id": tp.id,
                "title": tp.title,
                "slug": tp.slug,
                "description": tp.description,
                "difficulty": tp.difficulty,
                "order": tp.order,
                "is_published": tp.is_published,
                "question_count": tp.questions.count(),
                "chapter_id": tp.chapter_id,
                "chapter_title": tp.chapter.title,
                "chapter_number": tp.chapter.chapter_number,
                "subject_name": tp.chapter.class_subject.subject.name,
                "class_name": tp.chapter.class_subject.class_level.name,
            })
        return JsonResponse({"topics": topics}, status=200)

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
        except Exception:
            data = request.POST

        chapter_id = data.get('chapter_id')
        title = (data.get('title') or '').strip()
        slug = (data.get('slug') or '').strip()
        description = (data.get('description') or '').strip()
        difficulty = data.get('difficulty', 'intermediate')
        order = data.get('order', 1)
        is_published = data.get('is_published', True)

        if not chapter_id or not title:
            return JsonResponse({"error": "chapter_id and title are required"}, status=400)

        chapter = get_object_or_404(Chapter, id=chapter_id)

        if not slug:
            base_slug = slugify(title)
            slug = base_slug
            counter = 1
            while PracticeTopic.objects.filter(chapter=chapter, slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

        topic = PracticeTopic.objects.create(
            chapter=chapter,
            title=title,
            slug=slug,
            description=description,
            difficulty=difficulty,
            order=int(order or 1),
            is_published=bool(is_published),
        )

        return JsonResponse({
            "success": True,
            "id": topic.id,
            "title": topic.title,
            "slug": topic.slug,
            "message": "Practice topic created successfully."
        }, status=201)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
@admin_required
def admin_practice_topic_detail(request, topic_id):
    """
    Get, update, or delete a practice topic.
    """
    topic = get_object_or_404(PracticeTopic, id=topic_id)

    if request.method == 'GET':
        return JsonResponse({
            "id": topic.id,
            "title": topic.title,
            "slug": topic.slug,
            "description": topic.description,
            "difficulty": topic.difficulty,
            "order": topic.order,
            "is_published": topic.is_published,
            "question_count": topic.questions.count(),
            "chapter_id": topic.chapter_id,
        }, status=200)

    elif request.method in ('PUT', 'PATCH'):
        try:
            data = json.loads(request.body)
        except Exception:
            data = request.POST

        if 'title' in data:
            topic.title = data['title'].strip()
        if 'description' in data:
            topic.description = data['description'].strip()
        if 'difficulty' in data:
            topic.difficulty = data['difficulty']
        if 'order' in data:
            topic.order = int(data['order'])
        if 'is_published' in data:
            topic.is_published = bool(data['is_published'])
        if 'slug' in data and data['slug'].strip():
            topic.slug = slugify(data['slug'].strip())

        topic.save()
        return JsonResponse({"success": True, "message": "Practice topic updated successfully."}, status=200)

    elif request.method == 'DELETE':
        topic.delete()
        return JsonResponse({"success": True, "message": "Practice topic deleted."}, status=200)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
@admin_required
def admin_practice_questions(request):
    """
    List or create questions.
    GET: Filter by topic_id
    POST: Create question with options or accepted answers
    """
    if request.method == 'GET':
        topic_id = request.GET.get('topic_id')
        qs = Question.objects.all().select_related('topic').prefetch_related('options', 'accepted_answers')
        if topic_id:
            qs = qs.filter(topic_id=topic_id)
        qs = qs.order_by('order', 'id')

        questions = []
        for q in qs:
            options_data = [
                {
                    "id": opt.id,
                    "option_text": opt.option_text,
                    "is_correct": opt.is_correct,
                    "order": opt.order
                }
                for opt in q.options.all().order_by('order', 'id')
            ]
            accepted_answers_data = [
                {
                    "id": acc.id,
                    "accepted_text": acc.accepted_text,
                    "is_case_sensitive": acc.is_case_sensitive
                }
                for acc in q.accepted_answers.all()
            ]

            questions.append({
                "id": q.id,
                "topic_id": q.topic_id,
                "topic_title": q.topic.title,
                "question_type": q.question_type,
                "prompt": q.prompt,
                "explanation": q.explanation,
                "points": q.points,
                "difficulty": q.difficulty,
                "order": q.order,
                "is_published": q.is_published,
                "options": options_data,
                "accepted_answers": accepted_answers_data,
                "correct_answer_display": get_question_correct_answer_display(q),
            })
        return JsonResponse({"questions": questions}, status=200)

    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
        except Exception:
            data = request.POST

        topic_id = data.get('topic_id')
        question_type = data.get('question_type', 'mcq')
        prompt = (data.get('prompt') or '').strip()
        explanation = (data.get('explanation') or '').strip()
        points = int(data.get('points', 10) or 10)
        difficulty = data.get('difficulty', 'intermediate')
        order = int(data.get('order', 1) or 1)
        is_published = bool(data.get('is_published', True))

        if not topic_id or not prompt:
            return JsonResponse({"error": "topic_id and prompt are required"}, status=400)

        topic = get_object_or_404(PracticeTopic, id=topic_id)

        with transaction.atomic():
            question = Question.objects.create(
                topic=topic,
                question_type=question_type,
                prompt=prompt,
                explanation=explanation,
                points=points,
                difficulty=difficulty,
                order=order,
                is_published=is_published,
            )

            # Create options if MCQ / True-False
            if question_type in ('mcq', 'true_false'):
                options = data.get('options', [])
                for idx, opt_data in enumerate(options, 1):
                    opt_text = opt_data.get('option_text', '').strip()
                    if opt_text:
                        QuestionOption.objects.create(
                            question=question,
                            option_text=opt_text,
                            is_correct=bool(opt_data.get('is_correct', False)),
                            order=int(opt_data.get('order', idx)),
                        )

            # Create accepted answers if fill_blank or short_answer
            elif question_type in ('fill_blank', 'short_answer'):
                accepted_answers = data.get('accepted_answers', [])
                for acc_data in accepted_answers:
                    if isinstance(acc_data, str):
                        acc_text = acc_data.strip()
                        case_sens = False
                    else:
                        acc_text = acc_data.get('accepted_text', '').strip()
                        case_sens = bool(acc_data.get('is_case_sensitive', False))

                    if acc_text:
                        QuestionAcceptedAnswer.objects.create(
                            question=question,
                            accepted_text=acc_text,
                            is_case_sensitive=case_sens,
                        )

        return JsonResponse({
            "success": True,
            "id": question.id,
            "message": "Question created successfully."
        }, status=201)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
@admin_required
def admin_practice_question_detail(request, question_id):
    """
    Get, update, or delete an individual question and its options.
    """
    question = get_object_or_404(Question, id=question_id)

    if request.method == 'GET':
        options_data = [
            {"id": opt.id, "option_text": opt.option_text, "is_correct": opt.is_correct, "order": opt.order}
            for opt in question.options.all().order_by('order', 'id')
        ]
        accepted_data = [
            {"id": acc.id, "accepted_text": acc.accepted_text, "is_case_sensitive": acc.is_case_sensitive}
            for acc in question.accepted_answers.all()
        ]
        return JsonResponse({
            "id": question.id,
            "topic_id": question.topic_id,
            "question_type": question.question_type,
            "prompt": question.prompt,
            "explanation": question.explanation,
            "points": question.points,
            "difficulty": question.difficulty,
            "order": question.order,
            "is_published": question.is_published,
            "options": options_data,
            "accepted_answers": accepted_data,
            "correct_answer_display": get_question_correct_answer_display(question),
        }, status=200)

    elif request.method in ('PUT', 'PATCH'):
        try:
            data = json.loads(request.body)
        except Exception:
            data = request.POST

        with transaction.atomic():
            if 'prompt' in data:
                question.prompt = data['prompt'].strip()
            if 'explanation' in data:
                question.explanation = data['explanation'].strip()
            if 'question_type' in data:
                question.question_type = data['question_type']
            if 'points' in data:
                question.points = int(data['points'])
            if 'difficulty' in data:
                question.difficulty = data['difficulty']
            if 'order' in data:
                question.order = int(data['order'])
            if 'is_published' in data:
                question.is_published = bool(data['is_published'])
            question.save()

            # Update options if provided
            if 'options' in data and question.question_type in ('mcq', 'true_false'):
                question.options.all().delete()
                for idx, opt_data in enumerate(data['options'], 1):
                    opt_text = opt_data.get('option_text', '').strip()
                    if opt_text:
                        QuestionOption.objects.create(
                            question=question,
                            option_text=opt_text,
                            is_correct=bool(opt_data.get('is_correct', False)),
                            order=int(opt_data.get('order', idx)),
                        )

            # Update accepted answers if provided
            if 'accepted_answers' in data and question.question_type in ('fill_blank', 'short_answer'):
                question.accepted_answers.all().delete()
                for acc_data in data['accepted_answers']:
                    if isinstance(acc_data, str):
                        acc_text = acc_data.strip()
                        case_sens = False
                    else:
                        acc_text = acc_data.get('accepted_text', '').strip()
                        case_sens = bool(acc_data.get('is_case_sensitive', False))
                    if acc_text:
                        QuestionAcceptedAnswer.objects.create(
                            question=question,
                            accepted_text=acc_text,
                            is_case_sensitive=case_sens,
                        )

        return JsonResponse({"success": True, "message": "Question updated successfully."}, status=200)

    elif request.method == 'DELETE':
        question.delete()
        return JsonResponse({"success": True, "message": "Question deleted."}, status=200)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
@admin_required
def admin_practice_questions_bulk_import(request):
    """
    Bulk import questions from JSON or CSV.
    Supported fields in each question item:
    - topic_id (int) OR topic_slug (str)
    - question_type: 'mcq' | 'true_false' | 'fill_blank' | 'short_answer'
    - prompt: str
    - explanation: str
    - points: int (default 10)
    - difficulty: 'beginner' | 'intermediate' | 'advanced'
    - options: list of { option_text, is_correct } OR semicolon-separated string with * for correct option
    - accepted_answers: list of str or semicolon-separated string
    """
    if request.method != 'POST':
        return JsonResponse({"error": "POST method required"}, status=405)

    created_count = 0
    errors = []

    # Check for file upload (CSV) or JSON payload
    if request.FILES.get('file'):
        file = request.FILES['file']
        decoded_file = file.read().decode('utf-8-sig')
        io_string = io.StringIO(decoded_file)
        reader = csv.DictReader(io_string)
        items = list(reader)
    else:
        try:
            data = json.loads(request.body)
            items = data.get('questions', [])
        except Exception:
            return JsonResponse({"error": "Invalid JSON payload or missing questions array"}, status=400)

    with transaction.atomic():
        for idx, row in enumerate(items, 1):
            topic_id = row.get('topic_id')
            topic_slug = row.get('topic_slug')
            topic = None

            if topic_id:
                topic = PracticeTopic.objects.filter(id=topic_id).first()
            elif topic_slug:
                topic = PracticeTopic.objects.filter(slug=topic_slug).first()

            if not topic:
                errors.append(f"Row {idx}: Practice topic not found ({topic_id or topic_slug})")
                continue

            prompt = (row.get('prompt') or '').strip()
            if not prompt:
                errors.append(f"Row {idx}: Question prompt is empty")
                continue

            q_type = (row.get('question_type') or 'mcq').strip().lower()
            explanation = (row.get('explanation') or '').strip()
            points = int(row.get('points', 10) or 10)
            difficulty = row.get('difficulty', 'intermediate')

            question = Question.objects.create(
                topic=topic,
                question_type=q_type,
                prompt=prompt,
                explanation=explanation,
                points=points,
                difficulty=difficulty,
                order=topic.questions.count() + 1,
                is_published=True,
            )

            # Parse options
            options_raw = row.get('options')
            if q_type in ('mcq', 'true_false'):
                if isinstance(options_raw, list):
                    for opt_idx, opt in enumerate(options_raw, 1):
                        QuestionOption.objects.create(
                            question=question,
                            option_text=opt.get('option_text', '').strip(),
                            is_correct=bool(opt.get('is_correct', False)),
                            order=opt_idx
                        )
                elif isinstance(options_raw, str) and options_raw.strip():
                    # Parse semicolon-separated string: "*True;False" or "Scalar;*Vector;Tensor"
                    opts = [p.strip() for p in options_raw.split(';') if p.strip()]
                    for opt_idx, opt_str in enumerate(opts, 1):
                        is_corr = opt_str.startswith('*')
                        cleaned_text = opt_str.lstrip('*').strip()
                        QuestionOption.objects.create(
                            question=question,
                            option_text=cleaned_text,
                            is_correct=is_corr,
                            order=opt_idx
                        )

            elif q_type in ('fill_blank', 'short_answer'):
                answers_raw = row.get('accepted_answers')
                if isinstance(answers_raw, list):
                    for ans in answers_raw:
                        text = ans if isinstance(ans, str) else ans.get('accepted_text', '')
                        if text.strip():
                            QuestionAcceptedAnswer.objects.create(
                                question=question,
                                accepted_text=text.strip(),
                                is_case_sensitive=False
                            )
                elif isinstance(answers_raw, str) and answers_raw.strip():
                    for text in answers_raw.split(';'):
                        if text.strip():
                            QuestionAcceptedAnswer.objects.create(
                                question=question,
                                accepted_text=text.strip(),
                                is_case_sensitive=False
                            )

            created_count += 1

    return JsonResponse({
        "success": True,
        "created_count": created_count,
        "errors": errors,
        "message": f"Successfully imported {created_count} questions."
    }, status=201)


