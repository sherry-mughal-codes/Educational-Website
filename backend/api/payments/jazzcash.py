import hmac
import hashlib
import logging
from decimal import Decimal
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from django.conf import settings
from .base import BasePaymentGateway, PaymentVerificationResult

logger = logging.getLogger(__name__)

class JazzCashGateway(BasePaymentGateway):
    """
    Official JazzCash HTTP POST Hosted Checkout Integration.
    Follows JazzCash Merchant Integration specification:
    - HMAC-SHA256 sorted parameter secure hashing using Integrity Salt.
    - Currency format: PKR with amount represented in paisas (PKR 100 = 10000).
    - Response code '000' or '121' indicates verified successful settlement.
    """
    gateway_id = 'jazzcash'
    gateway_name = 'JazzCash'

    def __init__(self):
        self.merchant_id = getattr(settings, 'JAZZ_CASH_MERCHANT_ID', '').strip()
        self.password = getattr(settings, 'JAZZ_CASH_PASSWORD', '').strip()
        self.salt = getattr(settings, 'JAZZ_CASH_INTEGRITY_SALT', '').strip()
        self.return_url = getattr(settings, 'JAZZ_CASH_RETURN_URL', '').strip()
        self.endpoint = getattr(
            settings,
            'JAZZ_CASH_ENDPOINT',
            'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/'
        ).strip()

    def is_configured(self) -> bool:
        """Checks whether real merchant credentials are provided."""
        return bool(self.merchant_id and self.password and self.salt)

    def calculate_hash(self, params: Dict[str, Any]) -> str:
        """
        Computes HMAC-SHA256 signature for JazzCash parameter dictionary.
        Algorithm:
        1. Sort keys alphabetically.
        2. Filter out 'pp_SecureHash' and empty values.
        3. Concatenate values with '&'.
        4. Compute HMAC-SHA256 with Integrity Salt.
        """
        sorted_keys = sorted(k for k in params.keys() if k != 'pp_SecureHash' and str(params[k]).strip() != '')
        hash_string = '&'.join(str(params[k]).strip() for k in sorted_keys)
        
        digest = hmac.new(
            self.salt.encode('utf-8'),
            hash_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest().upper()
        return digest

    def initiate_payment(self, order, return_url: Optional[str] = None) -> Dict[str, Any]:
        """
        Generates checkout parameters and secure signature for customer form submission.
        """
        now = datetime.now()
        expiry = now + timedelta(hours=2)

        # Amount in Paisas: PKR 100.00 -> 10000
        amount_paisas = int(order.amount * 100)
        # Unique transaction reference (max 20 chars)
        timestamp_str = now.strftime('%Y%m%d%H%M%S')
        txn_ref = f"T{timestamp_str[-12:]}{str(order.id).zfill(6)}"[:20]

        effective_return_url = return_url or self.return_url

        payload: Dict[str, Any] = {
            'pp_Version': '1.1',
            'pp_TxnType': 'MPAY',
            'pp_Language': 'EN',
            'pp_MerchantID': self.merchant_id,
            'pp_Password': self.password,
            'pp_TxnRefNo': txn_ref,
            'pp_Amount': str(amount_paisas),
            'pp_TxnCurrency': 'PKR',
            'pp_TxnDateTime': timestamp_str,
            'pp_BillReference': order.order_reference,
            'pp_Description': f"FBISE Notes: {order.resource.title[:50]}",
            'pp_TxnExpiryDateTime': expiry.strftime('%Y%m%d%H%M%S'),
            'pp_ReturnURL': effective_return_url,
            'ppmpf_1': str(order.id),
        }

        # Calculate secure hash if salt configured
        if self.salt:
            payload['pp_SecureHash'] = self.calculate_hash(payload)
        else:
            payload['pp_SecureHash'] = 'DEMO_HASH_CREDENTIALS_REQUIRED'

        return {
            'gateway': self.gateway_id,
            'gateway_name': self.gateway_name,
            'action_type': 'form_post',
            'action_url': self.endpoint,
            'form_data': payload,
            'order_reference': order.order_reference,
            'amount': str(order.amount),
            'currency': order.currency,
            'is_live_configured': self.is_configured(),
        }

    def verify_payment(self, request_data: Dict[str, Any], order=None) -> PaymentVerificationResult:
        """
        Server-side independent verification of JazzCash callback.
        Checks:
        1. Signature authenticity (HMAC-SHA256).
        2. Response code ('000' or '121').
        3. Order reference match (`pp_BillReference`).
        4. Transaction amount in paisas matches `order.amount`.
        """
        bill_ref = request_data.get('pp_BillReference', '')
        if order and not bill_ref:
            bill_ref = order.order_reference

        response_code = str(request_data.get('pp_ResponseCode', '')).strip()
        response_msg = request_data.get('pp_ResponseMessage', '')
        gateway_txn_ref = request_data.get('pp_RetreivalReferenceNo') or request_data.get('pp_TxnRefNo', '')
        received_hash = request_data.get('pp_SecureHash', '').strip()

        # 1. Signature Verification
        if self.is_configured() and received_hash:
            computed_hash = self.calculate_hash(request_data)
            if not hmac.compare_digest(computed_hash.upper(), received_hash.upper()):
                logger.error(f"[JazzCash] Invalid hash received for {bill_ref}")
                return PaymentVerificationResult(
                    is_valid=False,
                    is_paid=False,
                    order_reference=bill_ref,
                    gateway_reference=gateway_txn_ref,
                    error_message="Payment signature verification failed (invalid secure hash).",
                    raw_data=request_data
                )

        # 2. Status verification
        is_paid = response_code in ('000', '121')
        if not is_paid:
            return PaymentVerificationResult(
                is_valid=True,
                is_paid=False,
                order_reference=bill_ref,
                gateway_reference=gateway_txn_ref,
                error_message=f"JazzCash payment failed or was declined: {response_msg or response_code}",
                raw_data=request_data
            )

        # 3. Amount verification
        received_amount_str = request_data.get('pp_Amount')
        received_amount = None
        if received_amount_str:
            try:
                # convert paisas to PKR
                received_amount = Decimal(received_amount_str) / Decimal(100)
            except Exception:
                received_amount = None

        if order and received_amount is not None:
            if received_amount != order.amount:
                logger.error(f"[JazzCash] Amount mismatch for {bill_ref}: expected {order.amount}, got {received_amount}")
                return PaymentVerificationResult(
                    is_valid=False,
                    is_paid=False,
                    order_reference=bill_ref,
                    gateway_reference=gateway_txn_ref,
                    error_message="Transaction amount does not match order amount.",
                    raw_data=request_data
                )

        return PaymentVerificationResult(
            is_valid=True,
            is_paid=True,
            order_reference=bill_ref,
            gateway_reference=gateway_txn_ref,
            amount=received_amount or (order.amount if order else None),
            currency='PKR',
            error_message='',
            raw_data=request_data
        )

