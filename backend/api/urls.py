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
    path('resources/<slug:class_slug>/<slug:subject_slug>/<slug:resource_slug>/download/', views.resource_pdf_download, name='resource_pdf_download'),
    path('sitemap-data/', views.sitemap_data, name='sitemap_data'),

    # Student Authentication & Profile Endpoints
    path('auth/register/', views.student_register, name='student_register'),
    path('auth/login/', views.student_login, name='student_login'),
    path('auth/logout/', views.student_logout, name='student_logout'),
    path('auth/me/', views.student_me, name='student_me'),
    path('auth/password-reset/', views.student_password_reset_request, name='student_password_reset'),
    path('auth/password-reset-confirm/', views.student_password_reset_confirm, name='student_password_reset_confirm'),
    # Aliases
    path('student/register/', views.student_register, name='student_register_alias'),
    path('student/login/', views.student_login, name='student_login_alias'),
    path('student/logout/', views.student_logout, name='student_logout_alias'),
    path('student/me/', views.student_me, name='student_me_alias'),

    # Student Dashboard
    path('student/dashboard/', views.student_dashboard, name='student_dashboard'),

    # Orders, Payment Gateways & Checkout
    path('orders/create/', views.order_create, name='order_create'),
    path('orders/<str:order_reference>/status/', views.order_status, name='order_status'),
    path('gateways/', views.payment_gateways_list, name='payment_gateways_list'),
    path('payments/gateways/', views.payment_gateways_list, name='payment_gateways_list_alias'),
    path('payments/callback/<str:gateway_name>/', views.payment_callback, name='payment_callback'),
    path('payments/sandbox-pay/', views.sandbox_simulate_payment, name='sandbox_simulate_payment'),

    # Admin Authentication
    path('admin/auth/login/', views.admin_login, name='admin_login'),
    path('admin/auth/logout/', views.admin_logout, name='admin_logout'),
    path('admin/auth/me/', views.admin_me, name='admin_me'),

    # Admin Content & Resource Management
    path('admin/resources/', views.admin_resources_list, name='admin_resources_list'),
    path('admin/resources/<int:resource_id>/', views.admin_resource_detail, name='admin_resource_detail'),
    path('admin/resources/<int:resource_id>/upload-pdf/', views.admin_resource_upload_pdf, name='admin_resource_upload_pdf'),
    path('admin/resources/<int:resource_id>/toggle-publish/', views.admin_resource_toggle_publish, name='admin_resource_toggle_publish'),

    # Admin Orders & Sales Management
    path('admin/orders/', views.admin_orders_list, name='admin_orders_list'),
    path('admin/orders/<int:order_id>/', views.admin_order_detail, name='admin_order_detail'),
    path('admin/orders/<int:order_id>/refund/', views.admin_order_refund, name='admin_order_refund'),

    # Admin Educational Structure Management
    path('admin/structure/', views.admin_structure_overview, name='admin_structure_overview'),
    path('admin/structure/subjects/', views.admin_create_subject, name='admin_create_subject'),
    path('admin/structure/chapters/', views.admin_create_chapter, name='admin_create_chapter'),

    # Interactive Learning & Chapter Practice Endpoints
    path('classes/<slug:class_slug>/<slug:subject_slug>/practice/', views.subject_practice_topics, name='subject_practice_topics'),
    path('practice/topics/<slug:topic_slug>/', views.practice_topic_detail, name='practice_topic_detail'),
    path('practice/topics/<slug:topic_slug>/start/', views.practice_session_start, name='practice_session_start'),
    path('practice/questions/<int:question_id>/submit/', views.practice_question_submit, name='practice_question_submit'),
    path('practice/sessions/<str:session_uuid>/finish/', views.practice_session_finish, name='practice_session_finish'),
    path('student/practice-progress/', views.student_practice_progress, name='student_practice_progress'),

    # Admin Practice Management Endpoints
    path('admin/practice/overview/', views.admin_practice_overview, name='admin_practice_overview'),
    path('admin/practice/topics/', views.admin_practice_topics, name='admin_practice_topics'),
    path('admin/practice/topics/<int:topic_id>/', views.admin_practice_topic_detail, name='admin_practice_topic_detail'),
    path('admin/practice/questions/', views.admin_practice_questions, name='admin_practice_questions'),
    path('admin/practice/questions/<int:question_id>/', views.admin_practice_question_detail, name='admin_practice_question_detail'),
    path('admin/practice/questions/bulk-import/', views.admin_practice_questions_bulk_import, name='admin_practice_questions_bulk_import'),

    # Editable Static/Site Pages (About, Contact)
    path('pages/<str:page_key>/', views.get_page_content, name='get_page_content'),
    path('admin/pages/', views.admin_get_all_pages, name='admin_get_all_pages'),
    path('admin/pages/<str:page_key>/', views.admin_update_page_content, name='admin_update_page_content'),
]
