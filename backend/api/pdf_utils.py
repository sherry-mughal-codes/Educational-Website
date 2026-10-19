import os
import re
from django.conf import settings
from django.core.exceptions import ValidationError

PDF_MAGIC_BYTES = b'%PDF-'

def validate_pdf_file(uploaded_file):
    """
    Validates uploaded file as a genuine PDF:
    1. Checks file size against MAX_UPLOAD_SIZE_MB.
    2. Checks file extension.
    3. Reads header bytes to verify '%PDF-' magic bytes.
    """
    max_size_bytes = getattr(settings, 'MAX_UPLOAD_SIZE_MB', 50) * 1024 * 1024

    if uploaded_file.size > max_size_bytes:
        max_mb = getattr(settings, 'MAX_UPLOAD_SIZE_MB', 50)
        raise ValidationError(f"File size exceeds maximum permitted limit of {max_mb} MB.")

    if uploaded_file.size < 20:
        raise ValidationError("Uploaded file is too small to be a valid PDF document.")

    # Check extension
    filename = uploaded_file.name or ''
    ext = os.path.splitext(filename)[1].lower()
    if ext != '.pdf':
        raise ValidationError("Only files with .pdf extension are permitted.")

    # Verify magic bytes
    try:
        uploaded_file.seek(0)
        header = uploaded_file.read(5)
        uploaded_file.seek(0)
        if header != PDF_MAGIC_BYTES:
            raise ValidationError("File content is not a valid PDF (invalid magic header).")
    except Exception as exc:
        raise ValidationError(f"Error reading file header: {exc}")

    return True

def safe_replace_pdf(resource, new_pdf_file):
    """
    Safely replaces a resource's PDF:
    - Validates new file completely first.
    - If valid, stores new file and safely deletes previous file.
    - If validation fails, raises ValidationError and leaves previous file intact.
    """
    validate_pdf_file(new_pdf_file)

    old_file_path = None
    if resource.pdf_file and hasattr(resource.pdf_file, 'path'):
        try:
            if os.path.isfile(resource.pdf_file.path):
                old_file_path = resource.pdf_file.path
        except Exception:
            old_file_path = None

    # Attach new file
    resource.pdf_file = new_pdf_file
    resource.file_size_bytes = new_pdf_file.size
    resource.file_format = 'PDF'
    resource.save()

    # If new file successfully saved and an old distinct file exists, clean up old file
    if old_file_path:
        try:
            if os.path.isfile(old_file_path) and resource.pdf_file.path != old_file_path:
                os.remove(old_file_path)
        except Exception as exc:
            # Non-fatal file cleanup warning
            pass

    return resource
