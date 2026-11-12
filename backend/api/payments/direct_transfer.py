import re
import logging
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, Optional
from django.conf import settings
from .base import BasePaymentGateway, PaymentVerificationResult

logger = logging.getLogger(__name__)

class DirectTransferGateway(BasePaymentGateway):
    """
    Direct Pakistani Mobile Account / Bank Transfer with Transaction ID (TID) Verification.
    Allows students to transfer PKR via JazzCash, Easypaisa, or Raast directly to the
    platform's official account and submit the bank SMS/app Transaction ID.
    
    SECURITY RULE:
    A Transaction ID (TID) submission alone is NEVER treated as proof of payment.
    Submitted orders are set to 'pending_verification' status and require explicit
    administrator verification before study notes access is unlocked.
    """
    gateway_id = 'direct_transfer'
    gateway_name = 'Direct Transfer / Transaction ID (TID)'

    def initiate_payment(self, order, return_url: Optional[str] = None) -> Dict[str, Any]:
        # Dynamically load admin configured receiving accounts and instructions
        try:
            from api.models import SitePageContent
            record = SitePageContent.objects.filter(page_key='payment_settings').first()
            custom_data = record.data if (record and isinstance(record.data, dict)) else {}
        except Exception:
            custom_data = {}

        accounts = custom_data.get('accounts', [])
        active_accounts = [acc for acc in accounts if acc.get('is_active', True)]
        whatsapp_num = custom_data.get('whatsapp_number', '0300-1234567')
        instructions_steps = custom_data.get('instructions_steps', [])
        notice_text = custom_data.get('notice_text', '')

        primary_acc = active_accounts[0] if active_accounts else {}

        return {
            'gateway': self.gateway_id,
            'gateway_name': self.gateway_name,
            'action_type': 'direct_transfer',
            'action_url': f"/api/payments/callback/{self.gateway_id}/",
            'order_reference': order.order_reference,
            'amount': str(order.amount),
            'currency': order.currency,
            'is_live_configured': True,
            'whatsapp_number': whatsapp_num,
            'instructions_steps': instructions_steps,
            'accounts': active_accounts,
            'instructions': {
                'bank_name': primary_acc.get('provider') or getattr(settings, 'DIRECT_TRANSFER_BANK_NAME', 'JazzCash / Easypaisa / Raast'),
                'account_title': primary_acc.get('account_title') or getattr(settings, 'DIRECT_TRANSFER_ACCOUNT_TITLE', 'FBISE Educational Notes Official'),
                'account_number': primary_acc.get('account_number') or getattr(settings, 'DIRECT_TRANSFER_ACCOUNT_NUMBER', '0300-8889999'),
                'iban': primary_acc.get('iban') or getattr(settings, 'DIRECT_TRANSFER_IBAN', ''),
                'instructions_text': notice_text or getattr(settings, 'DIRECT_TRANSFER_INSTRUCTIONS', ''),
            }
        }

    def verify_payment(self, request_data: Dict[str, Any], order=None) -> PaymentVerificationResult:
        bill_ref = (
            request_data.get('order_reference') or
            (order.order_reference if order else '')
        )
        tid = str(request_data.get('transaction_id') or request_data.get('tid') or '').strip()
        sender_phone = str(request_data.get('sender_phone') or request_data.get('mobile_number') or '').strip()

        # Sender phone number is mandatory
        if not sender_phone or len(sender_phone.replace('-', '').replace(' ', '')) < 10:
            return PaymentVerificationResult(
                is_valid=False,
                is_paid=False,
                order_reference=bill_ref,
                error_message="Please enter the sender phone number from which payment was transferred.",
                raw_data=request_data
            )

        # TID is optional: use TID if provided, otherwise record sender reference
        gateway_ref = f"TID-{tid.upper()}" if tid else f"PHONE-{sender_phone.replace('-', '').replace(' ', '')}"

        # Direct Transfer requires administrator approval before marking as paid
        return PaymentVerificationResult(
            is_valid=True,
            is_paid=False,  # Explicitly False: queued for administrative approval
            order_reference=bill_ref,
            gateway_reference=gateway_ref,
            amount=order.amount if order else Decimal(str(request_data.get('amount', '100'))),
            currency='PKR',
            error_message='',
            raw_data=request_data
        )
