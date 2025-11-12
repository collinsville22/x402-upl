from .client import SolanaX402Client, X402Config, PaymentMetrics, PaymentRecord, CASH_MINT, CASH_DECIMALS
from .x402_client import X402Client
from .service_discovery import ServiceDiscovery, DiscoveryConfig
from .tap import (
    RFC9421Signature,
    SignatureAlgorithm,
    SignatureParams,
    SignatureComponents,
    SignatureResult,
    TAPClient,
    TAPConfig,
    AgentIdentity,
)
from .exceptions import (
    X402Error,
    PaymentRequiredError,
    PaymentFailedError,
    InsufficientBalanceError,
    NetworkError,
)

__version__ = "2.0.0"

__all__ = [
    "X402Client",
    "SolanaX402Client",
    "X402Config",
    "PaymentMetrics",
    "PaymentRecord",
    "CASH_MINT",
    "CASH_DECIMALS",
    "ServiceDiscovery",
    "DiscoveryConfig",
    "RFC9421Signature",
    "SignatureAlgorithm",
    "SignatureParams",
    "SignatureComponents",
    "SignatureResult",
    "TAPClient",
    "TAPConfig",
    "AgentIdentity",
    "X402Error",
    "PaymentRequiredError",
    "PaymentFailedError",
    "InsufficientBalanceError",
    "NetworkError",
]
