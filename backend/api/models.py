from django.db import models
from django.utils.text import slugify

class ClassLevel(models.Model):
    """
    Academic class level (e.g. Class 9 - SSC Part I, Class 10 - SSC Part II).
    """
    name = models.CharField(max_length=100, help_text="e.g. Class 9 (SSC Part I)")
    grade_number = models.PositiveSmallIntegerField(unique=True, help_text="9 or 10")
    slug = models.SlugField(max_length=50, unique=True, help_text="e.g. class-9")
    description = models.TextField(blank=True, help_text="Curriculum and board overview")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['grade_number']
        verbose_name = "Class Level"
        verbose_name_plural = "Class Levels"

    def __str__(self):
        return self.name


class Subject(models.Model):
    """
    Educational subjects in the FBISE curriculum (e.g. Mathematics, Physics, Chemistry).
    """
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    code = models.CharField(max_length=20, blank=True, help_text="FBISE subject code if applicable")
    description = models.TextField(blank=True)
    icon_name = models.CharField(max_length=50, blank=True, default='book', help_text="Icon identifier for frontend")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = "Subject"
        verbose_name_plural = "Subjects"

    def __str__(self):
        return self.name


class ClassSubject(models.Model):
    """
    Associates a subject with a class level, defining syllabus specifics for that grade.
    """
    class_level = models.ForeignKey(ClassLevel, on_delete=models.CASCADE, related_name='class_subjects')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='class_subjects')
    syllabus_overview = models.TextField(blank=True, help_text="FBISE SLO syllabus breakdown and exam pattern")
    total_chapters = models.PositiveSmallIntegerField(default=0, help_text="Total curriculum chapters")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('class_level', 'subject')
        ordering = ['class_level__grade_number', 'subject__name']
        verbose_name = "Class Subject"
        verbose_name_plural = "Class Subjects"

    def __str__(self):
        return f"{self.class_level.name} - {self.subject.name}"


class Resource(models.Model):
    """
    Published educational resources (Complete Notes, Model Papers, Chapter Guides).
    The backend and database serve as the single source of truth for educational metadata.
    """
    RESOURCE_TYPES = [
        ('complete_notes', 'Complete Subject Notes'),
        ('model_paper', 'Model Paper & Solved Exercises'),
        ('chapter_notes', 'Chapter Guide & Key Concepts'),
    ]

    class_subject = models.ForeignKey(ClassSubject, on_delete=models.CASCADE, related_name='resources')
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255)
    resource_type = models.CharField(max_length=30, choices=RESOURCE_TYPES, default='complete_notes')
    description = models.TextField(help_text="Concise summary for student overview and meta description")
    content_preview = models.TextField(
        blank=True,
        help_text="Key learning outcomes, chapter index, and syllabus highlights"
    )
    file_format = models.CharField(max_length=10, default='PDF')
    page_count = models.PositiveIntegerField(default=0, help_text="Total pages in the complete subject resource")
    is_published = models.BooleanField(default=True, db_index=True)
    author_attribution = models.CharField(
        max_length=200,
        default="FBISE Academic Panel & Subject Specialists",
        help_text="Curriculum and review panel attribution"
    )
    meta_title = models.CharField(max_length=200, blank=True, help_text="Custom SEO title if different from title")
    meta_description = models.CharField(max_length=300, blank=True, help_text="Custom SEO description")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('class_subject', 'slug')
        ordering = ['-created_at']
        verbose_name = "Resource"
        verbose_name_plural = "Resources"

    def __str__(self):
        return f"{self.class_subject} - {self.title}"

    def get_meta_title(self):
        return self.meta_title or f"{self.title} | {self.class_subject.class_level.name} FBISE"

    def get_meta_description(self):
        return self.meta_description or self.description
