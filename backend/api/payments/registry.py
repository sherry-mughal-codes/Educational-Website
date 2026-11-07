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
    'jazzcash': JazzCashGateway,
    'easypaisa': EasypaisaGateway,
    'direct_transfer': DirectTransferGateway,
    'card': CardPaymentGateway,
    'sandbox': SandboxPaymentGateway,
}

def get_payment_gateway(gateway_id: Optional[str] = None) -> BasePaymentGateway:
    """
    Returns an instantiated payment gateway adapter.
    """
    selected_id = (gateway_id or getattr(settings, 'PAYMENT_GATEWAY_DEFAULT', 'jazzcash')).lower().strip()

    gateway_class = GATEWAY_CLASSES.get(selected_id)
    if not gateway_class:
        logger.warning(f"Unknown gateway '{selected_id}', falling back to JazzCash")
        gateway_class = JazzCashGateway

    return gateway_class()


def list_available_gateways() -> List[Dict[str, Any]]:
    """
    Returns list of available authentic Pakistani payment options for the student checkout screen.
    """
    gateways = [
        {
            'id': 'jazzcash',
            'name': 'JazzCash (Mobile Account / MPIN)',
            'description': 'Pay instantly with your JazzCash mobile account and 4-digit MPIN authorization.',
            'is_live': True,
            'badge': 'Instant Mobile Wallet',
        },
        {
            'id': 'easypaisa',
            'name': 'Easypaisa (Mobile Wallet / OTP)',
            'description': 'Direct debit from your Easypaisa mobile balance with push approval.',
            'is_live': True,
            'badge': 'Instant Mobile Wallet',
        },
        {
            'id': 'direct_transfer',
            'name': 'Direct Transfer / Transaction ID (TID)',
            'description': 'Send funds to platform account (JazzCash/Easypaisa/Raast) and enter your SMS Transaction ID.',
            'is_live': True,
            'badge': 'Manual Transfer (TID)',
        },
        {
            'id': 'card',
            'name': 'Debit / Credit Card (Visa / Mastercard)',
            'description': 'Secure online checkout using any Pakistani bank debit card or credit card.',
            'is_live': True,
            'badge': '3D Secure Card',
        },
    ]

    if getattr(settings, 'PAYMENT_SANDBOX_ENABLED', True):
        gateways.append({
            'id': 'sandbox',
            'name': 'Instant Sandbox Simulation (Test Mode)',
            'description': 'Developer & testing mode: simulates verified payment instantly without live funds.',
            'is_live': False,
            'badge': 'Developer Test',
        })

    return gateways

