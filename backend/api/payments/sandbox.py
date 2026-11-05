import uuid
import logging
from decimal import Decimal
from typing import Dict, Any, Optional
from django.conf import settings
from .base import BasePaymentGateway, PaymentVerificationResult

logger = logging.getLogger(__name__)

class SandboxPaymentGateway(BasePaymentGateway):
    """
    Controlled Sandbox Payment Gateway for Developer & Verification Testing.
    Enables testing the complete end-to-end purchasing lifecycle:
    - Order creation
    - Gateway initiation
    - Server-side independent verification
    - Idempotent purchase granting
    - Instant access to secure paid PDF downloads
    Without requiring live Pakistani merchant bank accounts or real funds.
    """
    gateway_id = 'sandbox'
    gateway_name = 'Sandbox (Test Simulation)'

    def initiate_payment(self, order, return_url: Optional[str] = None) -> Dict[str, Any]:
        simulated_txn_ref = f"SANDBOX-TXN-{uuid.uuid4().hex[:12].upper()}"
        effective_return_url = return_url or f"{getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3001')}/checkout/result/"

        form_data = {
            'order_reference': order.order_reference,
            'amount': str(order.amount),
            'currency': order.currency,
            'gateway_txn_ref': simulated_txn_ref,
            'status': 'SUCCESS',
            'return_url': effective_return_url,
        }

        return {
            'gateway': self.gateway_id,
            'gateway_name': self.gateway_name,
            'action_type': 'sandbox_simulation',
            'action_url': f"{effective_return_url}?order_ref={order.order_reference}&sandbox=1",
            'form_data': form_data,
            'order_reference': order.order_reference,
            'amount': str(order.amount),
            'currency': order.currency,
            'is_live_configured': True,
        }

    def verify_payment(self, request_data: Dict[str, Any], order=None) -> PaymentVerificationResult:
        order_ref = request_data.get('order_reference') or (order.order_reference if order else '')
        simulated_status = request_data.get('status', 'SUCCESS')
        gateway_txn_ref = request_data.get('gateway_txn_ref') or f"SANDBOX-{uuid.uuid4().hex[:8].upper()}"

        if simulated_status != 'SUCCESS':
            return PaymentVerificationResult(
                is_valid=True,
                is_paid=False,
                order_reference=order_ref,
                gateway_reference=gateway_txn_ref,
                error_message="Sandbox simulation failed as requested by test parameter.",
                raw_data=request_data
            )

        amount = order.amount if order else Decimal(str(request_data.get('amount', '100.00')))

        return PaymentVerificationResult(
            is_valid=True,
            is_paid=True,
            order_reference=order_ref,
            gateway_reference=gateway_txn_ref,
            amount=amount,
            currency='PKR',
            error_message='',
            raw_data=request_data
        )

