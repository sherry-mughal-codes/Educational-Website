from django.contrib import admin
from .models import ClassLevel, Subject, ClassSubject, Chapter, Resource, StudentProfile, Order, Purchase

@admin.register(ClassLevel)
class ClassLevelAdmin(admin.ModelAdmin):
    list_display = ('name', 'grade_number', 'slug', 'is_active', 'created_at')
    prepopulated_fields = {'slug': ('name',)}
    list_filter = ('is_active',)

@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'code', 'icon_name', 'created_at')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name', 'code')

@admin.register(ClassSubject)
class ClassSubjectAdmin(admin.ModelAdmin):
    list_display = ('class_level', 'subject', 'total_chapters', 'is_active')
    list_filter = ('class_level', 'is_active')
    search_fields = ('subject__name', 'class_level__name')

@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = ('class_subject', 'chapter_number', 'title', 'slug')
    list_filter = ('class_subject__class_level', 'class_subject__subject')
    search_fields = ('title', 'class_subject__subject__name')
    prepopulated_fields = {'slug': ('title',)}

@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ('title', 'class_subject', 'price', 'currency', 'is_free', 'resource_type', 'file_format', 'page_count', 'is_published', 'pdf_file', 'updated_at')
    list_filter = ('is_published', 'is_free', 'resource_type', 'class_subject__class_level', 'class_subject__subject')
    search_fields = ('title', 'description', 'class_subject__subject__name')
    prepopulated_fields = {'slug': ('title',)}

@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_email_verified', 'created_at')
    list_filter = ('is_email_verified',)
    search_fields = ('user__username', 'user__email', 'user__first_name')

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_reference', 'student', 'resource', 'amount', 'currency', 'payment_gateway', 'status', 'created_at')
    list_filter = ('status', 'payment_gateway', 'currency')
    search_fields = ('order_reference', 'student__email', 'student__username', 'gateway_reference', 'resource__title')
    readonly_fields = ('order_reference', 'amount', 'currency', 'created_at', 'updated_at')

@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ('student', 'resource', 'order', 'is_active', 'access_granted_at', 'revoked_at')
    list_filter = ('is_active',)
    search_fields = ('student__email', 'student__username', 'resource__title', 'order__order_reference')

