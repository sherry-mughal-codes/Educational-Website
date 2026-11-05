import logging
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)

def send_registration_confirmation(user, request=None):
    """
    Sends welcome / registration confirmation email.
    Safely catches SMTP connection errors so student registration succeeds.
    """
    subject = "Welcome to FBISE Study Notes Platform"
    recipient_email = user.email or user.username
    if not recipient_email or '@' not in recipient_email:
        return False

    message = (
        f"Assalam-o-Alaikum {user.first_name or user.username},\n\n"
        "Your student account has been created on the FBISE Educational Platform.\n\n"
        "You can now browse FBISE Class 9 and Class 10 curriculum notes, "
        "read revision materials online, and purchase complete subject PDF guides.\n\n"
        "Best regards,\n"
        "FBISE Academic Panel & Support Team"
    )

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        logger.info(f"Welcome email sent successfully to {recipient_email}")
        return True
    except Exception as exc:
        logger.warning(f"Could not deliver registration email to {recipient_email}: {exc}")
        return False


def send_password_reset_email(user, reset_url):
    """
    Sends password reset link with time-limited secure token.
    Never sends raw passwords.
    """
    subject = "FBISE Account Password Reset Request"
    recipient_email = user.email or user.username
    if not recipient_email or '@' not in recipient_email:
        return False

    message = (
        f"Assalam-o-Alaikum {user.first_name or user.username},\n\n"
        "We received a request to reset your password for your FBISE Educational Platform account.\n\n"
        f"Click the link below to set a new password:\n{reset_url}\n\n"
        "This link is valid for 72 hours. If you did not request this reset, you can safely ignore this email.\n\n"
        "Best regards,\n"
        "FBISE Academic Support Team"
    )

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        logger.info(f"Password reset email sent to {recipient_email}")
        return True
    except Exception as exc:
        logger.warning(f"Could not deliver password reset email to {recipient_email}: {exc}")
        return False


def send_purchase_confirmation(order):
    """
    Sends purchase confirmation email upon verified successful payment.
    Provides order reference, purchased resource name, amount, and access link.
    """
    user = order.student
    recipient_email = user.email or user.username
    if not recipient_email or '@' not in recipient_email:
        return False

    dashboard_url = f"{getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3001')}/student/dashboard/"
    subject = f"Order Confirmed: {order.resource.title} ({order.order_reference})"

    message = (
        f"Assalam-o-Alaikum {user.first_name or user.username},\n\n"
        f"Thank you for your purchase. Your payment of {order.amount} {order.currency} has been verified.\n\n"
        f"Order Reference: {order.order_reference}\n"
        f"Resource: {order.resource.title}\n"
        f"Payment Method: {order.payment_gateway.upper()}\n"
        f"Amount: {order.amount} {order.currency}\n\n"
        f"You can now access and download your complete PDF study packet from your Student Dashboard:\n"
        f"{dashboard_url}\n\n"
        "Happy studying and best of luck with your Federal Board examinations!\n\n"
        "Best regards,\n"
        "FBISE Academic Panel"
    )

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        logger.info(f"Purchase confirmation email sent for order {order.order_reference}")
        return True
    except Exception as exc:
        logger.warning(f"Could not deliver purchase email for order {order.order_reference}: {exc}")
        return False


def send_payment_failed_alert(order, error_msg=""):
    """
    Sends notification when a payment transaction fails or is cancelled.
    """
    user = order.student
    recipient_email = user.email or user.username
    if not recipient_email or '@' not in recipient_email:
        return False

    checkout_url = f"{getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3001')}/checkout/{order.resource.slug}/"
    subject = f"Payment Update: Order {order.order_reference}"

    message = (
        f"Assalam-o-Alaikum {user.first_name or user.username},\n\n"
        f"Your payment transaction for {order.resource.title} could not be completed.\n\n"
        f"Order Reference: {order.order_reference}\n"
        f"Reason: {error_msg or 'Transaction was not completed or was cancelled.'}\n\n"
        f"You can retry checkout at any time:\n{checkout_url}\n\n"
        "Best regards,\n"
        "FBISE Support Team"
    )

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=True,
        )
        return True
    except Exception:
        return False

