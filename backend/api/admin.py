from django.contrib import admin
from .models import ClassLevel, Subject, ClassSubject, Chapter, Resource

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
    list_display = ('title', 'class_subject', 'resource_type', 'file_format', 'page_count', 'is_published', 'pdf_file', 'updated_at')
    list_filter = ('is_published', 'resource_type', 'class_subject__class_level', 'class_subject__subject')
    search_fields = ('title', 'description', 'class_subject__subject__name')
    prepopulated_fields = {'slug': ('title',)}
