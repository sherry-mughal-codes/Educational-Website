import os
import uuid
import re
from decimal import Decimal
from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify
from django.utils import timezone

def safe_filename(name: str) -> str:
    """Generate a clean, traversal-safe filename."""
    base = os.path.basename(name)
    name_only, ext = os.path.splitext(base)
    clean_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', name_only).strip('_')
    if not clean_name:
        clean_name = "document"
    return f"{clean_name}{ext.lower()}"

def resource_pdf_upload_path(instance, filename):
    """
    Generate safe, partitioned storage path for uploaded educational PDFs.
    Format: pdfs/<class_slug>/<subject_slug>/<uuid4>_<safe_filename>
    """
    class_slug = instance.class_subject.class_level.slug if instance.class_subject else 'unassigned'
    subject_slug = instance.class_subject.subject.slug if instance.class_subject else 'general'
    safe_name = safe_filename(filename)
    unique_prefix = uuid.uuid4().hex[:10]
    return os.path.join('pdfs', class_slug, subject_slug, f"{unique_prefix}_{safe_name}")


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


class Chapter(models.Model):
    """
    Optional chapter / topic unit association for educational resources.
    """
    class_subject = models.ForeignKey(ClassSubject, on_delete=models.CASCADE, related_name='chapters')
    chapter_number = models.PositiveSmallIntegerField(help_text="Unit or chapter number (e.g. 1, 2, 3)")
    title = models.CharField(max_length=200, help_text="e.g. Kinematics, Chemical Equilibrium")
    slug = models.SlugField(max_length=200)
    overview = models.TextField(blank=True, help_text="Chapter summary and learning objectives")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = (('class_subject', 'chapter_number'), ('class_subject', 'slug'))
        ordering = ['class_subject', 'chapter_number']
        verbose_name = "Chapter"
        verbose_name_plural = "Chapters"

    def __str__(self):
        return f"{self.class_subject} - Ch {self.chapter_number}: {self.title}"


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
    chapter = models.ForeignKey(
        Chapter,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resources',
        help_text="Optional chapter association for unit-specific notes"
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255)
    resource_type = models.CharField(max_length=30, choices=RESOURCE_TYPES, default='complete_notes')
    description = models.TextField(help_text="Concise summary for student overview and meta description")
    content_preview = models.TextField(
        blank=True,
        help_text="Key learning outcomes, chapter index, and syllabus highlights"
    )
    pdf_file = models.FileField(
        upload_to=resource_pdf_upload_path,
        null=True,
        blank=True,
        help_text="Uploaded PDF document"
    )
    file_format = models.CharField(max_length=10, default='PDF')
    page_count = models.PositiveIntegerField(default=0, help_text="Total pages in the complete subject resource")
    file_size_bytes = models.PositiveBigIntegerField(default=0, help_text="File size in bytes")
    price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal('100.00'),
        help_text="Configurable price in PKR for complete subject PDF download"
    )
    is_free = models.BooleanField(
        default=False,
        help_text="If true, download is accessible free of charge for registered students"
    )
    currency = models.CharField(max_length=10, default='PKR', help_text="Currency ISO code (default: PKR)")
    is_published = models.BooleanField(default=True, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)
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

    def save(self, *args, **kwargs):
        if self.is_published and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    def get_meta_title(self):
        return self.meta_title or f"{self.title} | {self.class_subject.class_level.name} FBISE"

    def get_meta_description(self):
        return self.meta_description or self.description


class StudentProfile(models.Model):
    """
    Supplemental student profile information linked one-to-one with Django User.
    Maintains email verification status and student account metadata.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    is_email_verified = models.BooleanField(default=False, db_index=True)
    verification_token = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Student Profile"
        verbose_name_plural = "Student Profiles"

    def __str__(self):
        return f"Student: {self.user.email or self.user.username}"


class Order(models.Model):
    """
    Represents an order placed by a student for a paid educational resource.
    Preserves exact price and currency agreed upon at the time of order creation.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending Payment'),
        ('paid', 'Paid'),
        ('failed', 'Payment Failed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]

    order_reference = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        help_text="Unique external/internal order code (e.g. ORD-20261105-XXXXX)"
    )
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    resource = models.ForeignKey(Resource, on_delete=models.PROTECT, related_name='orders')
    amount = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        help_text="Exact amount agreed at time of order creation (never mutates)"
    )
    currency = models.CharField(max_length=10, default='PKR')
    payment_gateway = models.CharField(
        max_length=50,
        default='jazzcash',
        help_text="Selected payment provider identifier (e.g. jazzcash, easypaisa, sandbox)"
    )
    gateway_reference = models.CharField(
        max_length=128,
        blank=True,
        null=True,
        db_index=True,
        help_text="External gateway transaction or retrieval reference"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True
    )
    gateway_response_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Auditable raw payment gateway response/callback metadata"
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Order"
        verbose_name_plural = "Orders"

    def __str__(self):
        return f"Order {self.order_reference} - {self.student.email} - {self.amount} {self.currency} ({self.status})"


class Purchase(models.Model):
    """
    Authorized access grant permitting a student to download a paid PDF resource.
    Created atomically only upon verified successful payment or manual grant.
    """
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='purchases')
    resource = models.ForeignKey(Resource, on_delete=models.PROTECT, related_name='purchases')
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='purchase')
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Active permission to download. Becomes False if refunded/revoked."
    )
    access_granted_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revocation_reason = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ('student', 'resource')
        ordering = ['-access_granted_at']
        verbose_name = "Purchase Grant"
        verbose_name_plural = "Purchase Grants"

    def __str__(self):
        return f"Purchase: {self.student.email} -> {self.resource.title} (Active: {self.is_active})"
