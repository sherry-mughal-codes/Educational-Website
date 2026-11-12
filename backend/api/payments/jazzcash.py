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
    Official JazzCash HTTP POST Hosted Merchant Integration.
    Follows JazzCash Merchant Integration specification:
    - HMAC-SHA256 sorted parameter secure hashing using Integrity Salt.
    - Customer authenticates on JazzCash's PCI-DSS compliant hosted portal.
    - Never collects, stores, or transmits customer MPIN/wallet password.
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
        """Checks whether official merchant credentials are provided."""
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
        Generates checkout parameters and secure signature for hosted portal redirection.
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
                'message': 'JazzCash automated gateway requires official merchant credentials. Please use Direct Transfer.',
            }

        now = datetime.now()
        expiry = now + timedelta(hours=2)

        # Amount in Paisas: PKR 100.00 -> 10000
        amount_paisas = int(order.amount * 100)
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

        payload['pp_SecureHash'] = self.calculate_hash(payload)

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
        Server-side independent cryptographic verification of JazzCash callback.
        Verifies HMAC-SHA256 hash, response code, and matching bill reference.
        """
        bill_ref = (
            request_data.get('pp_BillReference') or
            request_data.get('order_reference') or
            (order.order_reference if order else '')
        )

        if not self.is_configured():
            return PaymentVerificationResult(
                is_valid=False,
                is_paid=False,
                order_reference=bill_ref,
                error_message="JazzCash merchant credentials are not configured on this server.",
                raw_data=request_data
            )

        response_code = str(request_data.get('pp_ResponseCode', '')).strip()
        response_msg = request_data.get('pp_ResponseMessage', '')
        gateway_txn_ref = request_data.get('pp_RetreivalReferenceNo') or request_data.get('pp_TxnRefNo', '')
        received_hash = request_data.get('pp_SecureHash', '').strip()

        # 1. Signature Verification
        if not received_hash:
            return PaymentVerificationResult(
                is_valid=False,
                is_paid=False,
                order_reference=bill_ref,
                error_message="Missing JazzCash security signature in callback.",
                raw_data=request_data
            )

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

        # 2. Status code verification ('000' or '121' indicates success)
        is_paid = response_code in ('000', '121')

        # 3. Amount verification (convert from Paisas)
        paid_amount_paisas = request_data.get('pp_Amount')
        paid_amount = None
        if paid_amount_paisas:
            try:
                paid_amount = Decimal(paid_amount_paisas) / Decimal(100)
            except Exception:
                paid_amount = None

        if is_paid and order and paid_amount is not None:
            if paid_amount < order.amount:
                logger.error(f"[JazzCash] Underpaid order {bill_ref}: expected {order.amount}, got {paid_amount}")
                return PaymentVerificationResult(
                    is_valid=False,
                    is_paid=False,
                    order_reference=bill_ref,
                    gateway_reference=gateway_txn_ref,
                    amount=paid_amount,
                    currency='PKR',
                    error_message=f"Received amount ({paid_amount}) does not match order total ({order.amount}).",
                    raw_data=request_data
                )

        return PaymentVerificationResult(
            is_valid=True,
            is_paid=is_paid,
            order_reference=bill_ref,
            gateway_reference=gateway_txn_ref,
            amount=paid_amount or (order.amount if order else None),
            currency='PKR',
            error_message=response_msg if not is_paid else '',
            raw_data=request_data
        )
