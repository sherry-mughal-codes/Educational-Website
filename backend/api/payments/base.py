from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Dict, Any, Optional

@dataclass
class PaymentVerificationResult:
    """
    Standardized result returned after independently verifying a payment callback/response.
    """
    is_valid: bool
    is_paid: bool
    order_reference: str
    gateway_reference: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: str = 'PKR'
    error_message: str = ''
    raw_data: Dict[str, Any] = field(default_factory=dict)


class BasePaymentGateway(ABC):
    """
    Abstract Base Class for Pakistani Payment Gateways.
    Encapsulates provider-specific parameter formatting, signature generation,
    and server-side response verification.
    """
    gateway_id: str = 'base'
    gateway_name: str = 'Base Gateway'

    @abstractmethod
    def initiate_payment(self, order, return_url: Optional[str] = None) -> Dict[str, Any]:
        """
        Generates checkout initiation payload (redirect URL or form fields with secure signature).
        """
        pass

    @abstractmethod
    def verify_payment(self, request_data: Dict[str, Any], order=None) -> PaymentVerificationResult:
        """
        Independently verifies callback payload authenticity, signature, order matching, and paid status.
        """
        pass

