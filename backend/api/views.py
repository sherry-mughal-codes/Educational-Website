import os
import json
from functools import wraps
from django.http import JsonResponse, Http404, FileResponse
from django.db import connection, transaction
from django.db.models import Q, Count
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.clickjacking import xframe_options_exempt
from django.core.exceptions import ValidationError
import logging

from .models import ClassLevel, Subject, ClassSubject, Chapter, Resource
from .pdf_utils import validate_pdf_file, safe_replace_pdf

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
        "file_size_bytes": resource.file_size_bytes,
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
