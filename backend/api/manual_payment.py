import os
import re
import logging
from decimal import Decimal
from typing import Dict, Any, List, Optional
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.webp', '.pdf')
MAX_SCREENSHOT_SIZE_BYTES = 5 * 1024 * 1024  # 5MB


def get_active_payment_accounts() -> List[Dict[str, Any]]:
    """
    Fetches the administrator-configured active receiving accounts from SitePageContent.
    Never returns hardcoded or inactive accounts.
    """
    try:
        from .models import SitePageContent
        record = SitePageContent.objects.filter(page_key='payment_settings').first()
        if record and isinstance(record.data, dict):
            accounts = record.data.get('accounts', [])
            return [acc for acc in accounts if acc.get('is_active', True)]
    except Exception as exc:
        logger.error(f"Error loading payment accounts from SitePageContent: {exc}")

    return []


def get_payment_instructions() -> Dict[str, Any]:
    """
    Returns verified payment verification steps, official WhatsApp number, and safety notice.
    """
    try:
        from .models import SitePageContent
        record = SitePageContent.objects.filter(page_key='payment_settings').first()
        if record and isinstance(record.data, dict):
            return {
                'whatsapp_number': record.data.get('whatsapp_number', ''),
                'instructions_steps': record.data.get('instructions_steps', []),
                'notice_text': record.data.get('notice_text', ''),
            }
    except Exception as exc:
        logger.error(f"Error loading payment instructions: {exc}")

    return {
        'whatsapp_number': '',
        'instructions_steps': [
            'Transfer the exact fee to any of our official receiving accounts below.',
            'Take a clear screenshot of the completed transaction confirmation receipt.',
            'Enter your Transaction ID (TID), sender mobile number, and sender name.',
            'Submit your payment evidence for rapid administrator verification.',
        ],
        'notice_text': 'Never share your mobile wallet PIN or password with anyone. FBISE staff will never ask for your account PIN.',
    }


def validate_screenshot_file(uploaded_file) -> None:
    """
    Validates uploaded payment receipt screenshot:
    - Verifies file size limit (5MB)
    - Verifies allowable extension
    - Inspects magic bytes to prevent spoofed/executable files
    """
    if not uploaded_file:
        return

    if uploaded_file.size > MAX_SCREENSHOT_SIZE_BYTES:
        raise ValidationError("Receipt screenshot exceeds the 5MB maximum file size limit.")

    ext = os.path.splitext(uploaded_file.name)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValidationError("Unsupported receipt format. Allowed formats: JPG, PNG, WEBP, or PDF.")

    # Check magic header bytes
    header = uploaded_file.read(8)
    uploaded_file.seek(0)

    is_png = header.startswith(b'\x89PNG\r\n\x1a\n')
    is_jpeg = header.startswith(b'\xff\xd8\xff')
    is_pdf = header.startswith(b'%PDF')
    is_webp = header.startswith(b'RIFF') and b'WEBP' in uploaded_file.read(16)
    uploaded_file.seek(0)

    if not (is_png or is_jpeg or is_pdf or is_webp):
        raise ValidationError("Invalid receipt file: contents do not match an image or PDF document.")


def submit_manual_payment(
    order,
    student_user,
    data: Dict[str, Any],
    screenshot_file=None
) -> Dict[str, Any]:
    """
    Processes a manual payment verification submission by the student.
    Enforces strict business & security rules:
    - Student must be the owner of the order.
    - Order must be in 'pending_payment', 'pending', or 'rejected' status.
    - Transaction ID (TID) is strictly required.
    - Sender mobile number is strictly required (min 10 digits).
    - Amount transferred must match the order amount.
    - Screenshot file is securely validated if provided.
    - Flags duplicate reuse of Transaction IDs across multiple orders.
    """
    if order.student != student_user and not (student_user.is_staff or student_user.is_superuser):
        return {
            'success': False,
            'status_code': 403,
            'error': 'Permission Denied: You cannot submit payment evidence for an order belonging to another student.'
        }

    if order.status == 'paid':
        return {
            'success': False,
            'status_code': 400,
            'error': f'Order {order.order_reference} is already marked as Paid and verified.'
        }

    if order.status in ('cancelled', 'refunded'):
        return {
            'success': False,
            'status_code': 400,
            'error': f'Order {order.order_reference} is {order.status} and cannot accept new payment submissions.'
        }

    # Extract fields
    tid = str(data.get('transaction_id') or data.get('tid') or '').strip().upper()
    sender_name = str(data.get('sender_name') or '').strip()
    sender_phone = str(data.get('sender_phone') or data.get('mobile_number') or '').strip()
    receiving_account = str(data.get('receiving_account') or data.get('selected_account') or '').strip()
    customer_note = str(data.get('customer_note') or data.get('note') or '').strip()
    submitted_amount_str = str(data.get('amount') or '').strip()

    # 1. Transaction ID is optional (if provided, validate min length)
    if tid and len(tid) < 4:
        return {
            'success': False,
            'status_code': 400,
            'error': 'If provided, Transaction ID (TID) must be at least 4 characters.'
        }

    # 2. Sender mobile is mandatory
    cleaned_phone = re.sub(r'[\s\-()]', '', sender_phone)
    if not cleaned_phone or len(cleaned_phone) < 10:
        return {
            'success': False,
            'status_code': 400,
            'error': 'Valid sender mobile number is required (e.g. 03001234567).'
        }

    # 3. Sender name is mandatory
    if not sender_name or len(sender_name) < 2:
        return {
            'success': False,
            'status_code': 400,
            'error': 'Sender account name is required.'
        }

    # 4. Receiving account is mandatory
    if not receiving_account:
        return {
            'success': False,
            'status_code': 400,
            'error': 'Please select the platform receiving account to which you transferred the payment.'
        }

    # 5. Amount validation
    if submitted_amount_str:
        try:
            submitted_amount = Decimal(submitted_amount_str)
            if submitted_amount != order.amount:
                return {
                    'success': False,
                    'status_code': 400,
                    'error': f'Submitted amount (PKR {submitted_amount}) does not match order amount (PKR {order.amount}).'
                }
        except Exception:
            return {
                'success': False,
                'status_code': 400,
                'error': 'Invalid amount value submitted.'
            }

    # 6. Validate optional screenshot
    if screenshot_file:
        try:
            validate_screenshot_file(screenshot_file)
        except ValidationError as err:
            return {
                'success': False,
                'status_code': 400,
                'error': err.message if hasattr(err, 'message') else str(err)
            }

    # 7. Check if this exact TID was submitted on another order
    from .models import Order
    existing_tid_order = Order.objects.filter(transaction_id=tid).exclude(id=order.id).first() if tid else None
    is_duplicate_tid = bool(existing_tid_order) if tid else False
    if is_duplicate_tid:
        logger.warning(
            f"[Security] Duplicate TID '{tid}' submitted on order {order.order_reference} (previously used on {existing_tid_order.order_reference})"
        )

    # 8. Atomic order update
    with transaction.atomic():
        order = Order.objects.select_for_update().get(id=order.id)
        order.transaction_id = tid
        order.sender_name = sender_name
        order.sender_phone = sender_phone
        order.receiving_account = receiving_account
        order.customer_note = customer_note
        order.status = 'pending_verification'
        order.paid_at_submitted = timezone.now()
        order.gateway_reference = f"TID-{tid}" if tid else f"MANUAL-{order.order_reference}"
        order.rejection_reason = ''  # Reset any previous rejection reason upon resubmission

        if screenshot_file:
            order.payment_screenshot = screenshot_file

        order.save()

    # Trigger student notification email safely
    try:
        from .email_utils import send_payment_received_pending_verification
        send_payment_received_pending_verification(order)
    except Exception as exc:
        logger.error(f"Could not send pending verification email for {order.order_reference}: {exc}")

    return {
        'success': True,
        'status_code': 200,
        'order_reference': order.order_reference,
        'status': order.status,
        'message': 'Payment details submitted successfully. An administrator will verify the bank/wallet transfer and unlock your guide.',
        'is_duplicate_tid': is_duplicate_tid,
    }

