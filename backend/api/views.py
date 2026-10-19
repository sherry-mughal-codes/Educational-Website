from django.http import JsonResponse, Http404
from django.db import connection
from django.db.models import Q, Count
from django.utils import timezone
from django.shortcuts import get_object_or_404
import logging

from .models import ClassLevel, Subject, ClassSubject, Resource

logger = logging.getLogger(__name__)

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
        "phase": 2,
        "status": "active",
        "endpoints": {
            "health": "/api/health/",
            "classes": "/api/classes/",
            "resources": "/api/resources/",
            "sitemap": "/api/sitemap-data/",
        }
    })

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
        }
        for rel in related_resources
    ]

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

def sitemap_data(request):
    """
    Returns all canonical URL paths of published entities for Next.js XML sitemap generation.
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
