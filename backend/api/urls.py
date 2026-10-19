from django.urls import path
from . import views

app_name = 'api'

urlpatterns = [
    path('', views.api_root, name='root'),
    path('health/', views.health_check, name='health_check'),
    path('classes/', views.class_list, name='class_list'),
    path('classes/<slug:class_slug>/', views.class_detail, name='class_detail'),
    path('classes/<slug:class_slug>/<slug:subject_slug>/', views.subject_detail, name='subject_detail'),
    path('resources/', views.resource_search, name='resource_search'),
    path('resources/<slug:class_slug>/<slug:subject_slug>/<slug:resource_slug>/', views.resource_detail, name='resource_detail'),
    path('sitemap-data/', views.sitemap_data, name='sitemap_data'),
]
