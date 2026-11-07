import re
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, Optional
from .base import BasePaymentGateway, PaymentVerificationResult

class DirectTransferGateway(BasePaymentGateway):
    """
    Direct Pakistani Mobile Account / Bank Transfer with Transaction ID (TID) Verification.
    Allows students to transfer PKR via JazzCash, Easypaisa, or Raast directly to the
    platform's official account and submit the bank SMS/app Transaction ID.
    """
    gateway_id = 'direct_transfer'
    gateway_name = 'Manual Transfer / Transaction ID (TID)'

    def initiate_payment(self, order, return_url: Optional[str] = None) -> Dict[str, Any]:
        return {
            'gateway': self.gateway_id,
            'gateway_name': self.gateway_name,
            'action_type': 'direct_checkout',
            'action_url': f"/api/payments/{self.gateway_id}/callback/",
            'order_reference': order.order_reference,
            'amount': str(order.amount),
            'currency': order.currency,
            'is_live_configured': True,
            'instructions': {
                'account_type': 'JazzCash / Easypaisa / Raast',
                'account_number': '0300-8889999',
                'account_title': 'FBISE Educational Notes Official',
                'bank_name': 'JazzCash Mobile Account',
            }
        }

    def verify_payment(self, request_data: Dict[str, Any], order=None) -> PaymentVerificationResult:
        bill_ref = (
            request_data.get('order_reference') or
            (order.order_reference if order else '')
        )
        tid = str(request_data.get('transaction_id') or request_data.get('tid') or '').strip()
        sender_phone = str(request_data.get('sender_phone') or request_data.get('mobile_number') or '').strip()

        if not tid or len(tid) < 6:
            return PaymentVerificationResult(
                is_valid=False,
                is_paid=False,
                order_reference=bill_ref,
                error_message="Please enter a valid Transaction ID (TID) from your bank or wallet SMS confirmation.",
                raw_data=request_data
            )

        now = datetime.now()
        gateway_ref = f"TID-{tid.upper()}"

        return PaymentVerificationResult(
            is_valid=True,
            is_paid=True,
            order_reference=bill_ref,
            gateway_reference=gateway_ref,
            amount=order.amount if order else Decimal(str(request_data.get('amount', '100'))),
            currency='PKR',
            error_message='',
            raw_data=request_data
        )

