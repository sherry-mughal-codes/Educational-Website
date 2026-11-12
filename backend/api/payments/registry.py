import logging
from typing import Dict, List, Any, Optional
from django.conf import settings
from .base import BasePaymentGateway
from .jazzcash import JazzCashGateway
from .easypaisa import EasypaisaGateway
from .direct_transfer import DirectTransferGateway
from .card import CardPaymentGateway
from .sandbox import SandboxPaymentGateway

logger = logging.getLogger(__name__)

GATEWAY_CLASSES = {
    'direct_transfer': DirectTransferGateway,
    'jazzcash': JazzCashGateway,
    'easypaisa': EasypaisaGateway,
    'card': CardPaymentGateway,
    'sandbox': SandboxPaymentGateway,
}

def get_payment_gateway(gateway_id: Optional[str] = None) -> BasePaymentGateway:
    """
    Returns an instantiated payment gateway adapter.
    """
    selected_id = (gateway_id or getattr(settings, 'PAYMENT_GATEWAY_DEFAULT', 'direct_transfer')).lower().strip()

    gateway_class = GATEWAY_CLASSES.get(selected_id)
    if not gateway_class:
        logger.warning(f"Unknown gateway '{selected_id}', falling back to DirectTransferGateway")
        gateway_class = DirectTransferGateway

    return gateway_class()


def list_available_gateways() -> List[Dict[str, Any]]:
    """
    Returns list of available authentic Pakistani payment options for the student checkout screen.
    """
    is_jc_configured = bool(getattr(settings, 'JAZZ_CASH_MERCHANT_ID', ''))
    is_ep_configured = bool(getattr(settings, 'EASYPAISA_STORE_ID', ''))

    gateways = [
        {
            'id': 'direct_transfer',
            'name': 'Direct Bank / Raast / Wallet Transfer (TID)',
            'description': 'Transfer funds via JazzCash, Easypaisa, Raast, or Bank to our platform account and submit your Transaction ID (TID).',
            'is_live': True,
            'badge': 'Instant TID Submission',
        },
        {
            'id': 'jazzcash',
            'name': 'JazzCash (Official Merchant Gateway)',
            'description': 'Automated payment via JazzCash hosted merchant checkout portal.' if is_jc_configured else 'Requires official JazzCash merchant account credentials.',
            'is_live': is_jc_configured,
            'badge': 'Automated Gateway' if is_jc_configured else 'Requires Merchant Setup',
        },
        {
            'id': 'easypaisa',
            'name': 'Easypaisa (Official Merchant Gateway)',
            'description': 'Automated payment via Easypaisa hosted merchant checkout portal.' if is_ep_configured else 'Requires official Easypaisa merchant account credentials.',
            'is_live': is_ep_configured,
            'badge': 'Automated Gateway' if is_ep_configured else 'Requires Merchant Setup',
        },
    ]

    if getattr(settings, 'PAYMENT_SANDBOX_ENABLED', False):
        gateways.append({
            'id': 'sandbox',
            'name': 'Instant Sandbox Simulation (Test Mode)',
            'description': 'Developer & testing mode: simulates verified payment instantly without live funds.',
            'is_live': False,
            'badge': 'Developer Test',
        })

    return gateways
