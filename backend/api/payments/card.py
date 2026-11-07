import uuid
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, Optional
from .base import BasePaymentGateway, PaymentVerificationResult

class CardPaymentGateway(BasePaymentGateway):
    """
    Pakistani Debit / Credit Card (Visa / Mastercard / PayPak) Payment Gateway.
    Simulates real-time 3D Secure Verified by Visa / Mastercard ID Check authorization.
    """
    gateway_id = 'card'
    gateway_name = 'Debit / Credit Card (Visa / Mastercard)'

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
        }

    def verify_payment(self, request_data: Dict[str, Any], order=None) -> PaymentVerificationResult:
        bill_ref = (
            request_data.get('order_reference') or
            (order.order_reference if order else '')
        )
        card_number = str(request_data.get('card_number') or '').replace(' ', '').strip()

        if len(card_number) < 12:
            return PaymentVerificationResult(
                is_valid=False,
                is_paid=False,
                order_reference=bill_ref,
                error_message="Invalid debit or credit card number.",
                raw_data=request_data
            )

        now = datetime.now()
        gateway_ref = f"CARD-{uuid.uuid4().hex[:10].upper()}"

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

