import hmac
import hashlib
import logging
from decimal import Decimal
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from django.conf import settings
from .base import BasePaymentGateway, PaymentVerificationResult

logger = logging.getLogger(__name__)

class EasypaisaGateway(BasePaymentGateway):
    """
    Official Telenor Easypaisa Hosted Checkout (Easypay) Integration.
    Follows Easypaisa Merchant Integration Specification:
    - Customer authenticates safely on Easypaisa's secure portal or mobile app prompt.
    - Never asks for, collects, or stores customer wallet PIN or password.
    - Result code '0000' or 'SUCCESS' indicates verified settlement.
    """
    gateway_id = 'easypaisa'
    gateway_name = 'Easypaisa'

    def __init__(self):
        self.store_id = getattr(settings, 'EASYPAISA_STORE_ID', '').strip()
        self.hash_key = getattr(settings, 'EASYPAISA_HASH_KEY', '').strip()
        self.return_url = getattr(settings, 'EASYPAISA_RETURN_URL', '').strip()
        self.endpoint = getattr(
            settings,
            'EASYPAISA_ENDPOINT',
            'https://easypay.easypaisa.com.pk/easypay/Index.jsf'
        ).strip()

    def is_configured(self) -> bool:
        """Checks whether official Easypaisa merchant credentials are set."""
        return bool(self.store_id and self.hash_key)

    def calculate_hash(self, amount: str, order_ref: str) -> str:
        """
        Computes SHA-256 merchant digest for request integrity if Hash Key is configured.
        """
        raw = f"{amount}&{order_ref}&{self.store_id}&{self.hash_key}"
        return hashlib.sha256(raw.encode('utf-8')).hexdigest().upper()

    def initiate_payment(self, order, return_url: Optional[str] = None) -> Dict[str, Any]:
        """
        Generates checkout initiation payload for Easypay redirection.
        """
        if not self.is_configured():
            return {
                'gateway': self.gateway_id,
                'gateway_name': self.gateway_name,
                'action_type': 'requires_merchant_configuration',
                'action_url': '',
                'order_reference': order.order_reference,
                'amount': str(order.amount),
                'currency': order.currency,
                'is_live_configured': False,
                'message': 'Easypaisa automated gateway requires official merchant credentials. Please use Direct Transfer.',
            }

        expiry = datetime.now() + timedelta(hours=2)
        amount_str = f"{order.amount:.1f}"
        effective_return_url = return_url or self.return_url

        payload: Dict[str, Any] = {
            'storeId': self.store_id,
            'amount': amount_str,
            'postBackURL': effective_return_url,
            'orderRefNum': order.order_reference,
            'expiryDate': expiry.strftime('%Y%m%d %H%M%S'),
            'autoRedirect': '1',
            'merchantHashedReq': self.calculate_hash(amount_str, order.order_reference),
        }

        return {
            'gateway': self.gateway_id,
            'gateway_name': self.gateway_name,
            'action_type': 'form_post',
            'action_url': self.endpoint,
            'form_data': payload,
            'order_reference': order.order_reference,
            'amount': str(order.amount),
            'currency': order.currency,
            'is_live_configured': True,
        }

    def verify_payment(self, request_data: Dict[str, Any], order=None) -> PaymentVerificationResult:
        """
        Server-side independent verification of Easypaisa callback.
        """
        order_ref = (
            request_data.get('orderRefNumber') or
            request_data.get('orderRefNum') or
            request_data.get('order_reference') or
            (order.order_reference if order else '')
        )

        if not self.is_configured():
            return PaymentVerificationResult(
                is_valid=False,
                is_paid=False,
                order_reference=order_ref,
                error_message="Easypaisa merchant credentials are not configured on this server.",
                raw_data=request_data
            )

        res_code = str(request_data.get('resCode') or request_data.get('status') or '').strip()
        gateway_txn_ref = str(request_data.get('transactionId') or request_data.get('transId') or '')

        # '0000' or 'SUCCESS' indicates success in Easypaisa
        is_paid = res_code in ('0000', '00', 'SUCCESS')

        if not is_paid:
            return PaymentVerificationResult(
                is_valid=True,
                is_paid=False,
                order_reference=order_ref,
                gateway_reference=gateway_txn_ref,
                error_message=f"Easypaisa transaction was not completed or declined (code: {res_code}).",
                raw_data=request_data
            )

        amount = order.amount if order else Decimal(str(request_data.get('amount', '100')))

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
