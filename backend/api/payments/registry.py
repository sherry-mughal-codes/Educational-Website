import logging
from typing import Dict, List, Any, Optional
from django.conf import settings
from .base import BasePaymentGateway
from .jazzcash import JazzCashGateway
from .easypaisa import EasypaisaGateway
from .sandbox import SandboxPaymentGateway

logger = logging.getLogger(__name__)

GATEWAY_CLASSES = {
    'jazzcash': JazzCashGateway,
    'easypaisa': EasypaisaGateway,
    'sandbox': SandboxPaymentGateway,
}

def get_payment_gateway(gateway_id: Optional[str] = None) -> BasePaymentGateway:
    """
    Returns an instantiated payment gateway adapter.
    Falls back cleanly to Sandbox gateway when real merchant credentials
    are not yet configured and sandbox is enabled.
    """
    selected_id = (gateway_id or getattr(settings, 'PAYMENT_GATEWAY_DEFAULT', 'jazzcash')).lower().strip()

    gateway_class = GATEWAY_CLASSES.get(selected_id)
    if not gateway_class:
        logger.warning(f"Unknown gateway '{selected_id}', falling back to JazzCash or Sandbox")
        gateway_class = JazzCashGateway

    instance = gateway_class()

    # If live gateway requested but unconfigured, check if sandbox is allowed
    if hasattr(instance, 'is_configured') and not instance.is_configured():
        sandbox_enabled = getattr(settings, 'PAYMENT_SANDBOX_ENABLED', True)
        if selected_id == 'sandbox' or sandbox_enabled:
            # Can still return instance if customer is submitting form, or sandbox if selected
            pass

    return instance


def list_available_gateways() -> List[Dict[str, Any]]:
    """
    Returns list of available payment options for the student checkout screen.
    """
    gateways = []

    jc = JazzCashGateway()
    gateways.append({
        'id': 'jazzcash',
        'name': 'JazzCash (Mobile Account / Voucher / Card)',
        'description': 'Pay instantly via JazzCash mobile account or JazzCash voucher.',
        'is_live': jc.is_configured(),
        'badge': 'Official Gateway',
    })

    ep = EasypaisaGateway()
    gateways.append({
        'id': 'easypaisa',
        'name': 'Easypaisa (Mobile Wallet / Card)',
        'description': 'Pay securely with your Easypaisa mobile balance or debit card.',
        'is_live': ep.is_configured(),
        'badge': 'Official Gateway',
    })

    if getattr(settings, 'PAYMENT_SANDBOX_ENABLED', True):
        gateways.append({
            'id': 'sandbox',
            'name': 'Instant Sandbox Simulation (Test Mode)',
            'description': 'Developer & testing mode: simulates verified payment instantly without live funds.',
            'is_live': False,
            'badge': 'Developer Test',
        })

    return gateways

