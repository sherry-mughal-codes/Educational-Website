from django.urls import path
from . import views

app_name = 'api'

urlpatterns = [
    # Public & Health Endpoints
    path('', views.api_root, name='root'),
    path('health/', views.health_check, name='health_check'),
    path('classes/', views.class_list, name='class_list'),
    path('classes/<slug:class_slug>/', views.class_detail, name='class_detail'),
    path('classes/<slug:class_slug>/<slug:subject_slug>/', views.subject_detail, name='subject_detail'),
    path('resources/', views.resource_search, name='resource_search'),
    path('resources/<slug:class_slug>/<slug:subject_slug>/<slug:resource_slug>/', views.resource_detail, name='resource_detail'),
    path('resources/<slug:class_slug>/<slug:subject_slug>/<slug:resource_slug>/pdf-stream/', views.resource_pdf_stream, name='resource_pdf_stream'),
    path('sitemap-data/', views.sitemap_data, name='sitemap_data'),

    # Admin Authentication
    path('admin/auth/login/', views.admin_login, name='admin_login'),
    path('admin/auth/logout/', views.admin_logout, name='admin_logout'),
    path('admin/auth/me/', views.admin_me, name='admin_me'),

    # Admin Content & Resource Management
    path('admin/resources/', views.admin_resources_list, name='admin_resources_list'),
    path('admin/resources/<int:resource_id>/', views.admin_resource_detail, name='admin_resource_detail'),
    path('admin/resources/<int:resource_id>/upload-pdf/', views.admin_resource_upload_pdf, name='admin_resource_upload_pdf'),
    path('admin/resources/<int:resource_id>/toggle-publish/', views.admin_resource_toggle_publish, name='admin_resource_toggle_publish'),

    # Admin Educational Structure Management
    path('admin/structure/', views.admin_structure_overview, name='admin_structure_overview'),
    path('admin/structure/subjects/', views.admin_create_subject, name='admin_create_subject'),
    path('admin/structure/chapters/', views.admin_create_chapter, name='admin_create_chapter'),
]
