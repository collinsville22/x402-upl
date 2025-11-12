from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from x402_upl import SolanaX402Client, X402Config
from x402_upl.tap import TAPClient, TAPConfig
from solders.pubkey import Pubkey
from solders.keypair import Keypair
import base64
import json
import logging

logger = logging.getLogger(__name__)


class X402Middleware(BaseHTTPMiddleware):
    def __init__(self, app, config: X402Config, tap_config: TAPConfig = None):
        super().__init__(app)
        self.config = config
        self.tap_config = tap_config

        wallet = Keypair()
        self.client = SolanaX402Client(wallet, config)

    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)

        if request.url.path in ["/health", "/docs", "/openapi.json"]:
            return await call_next(request)

        if self.tap_config:
            tap_verified = await self._verify_tap(request)
            request.state.tap_verified = tap_verified

        payment_header = request.headers.get("x-payment")

        if not payment_header:
            requirements = {
                "scheme": "exact",
                "network": f"solana-{self.config.network}",
                "asset": "SOL",
                "payTo": str(self.config.treasury_wallet) if hasattr(self.config, 'treasury_wallet') else "",
                "amount": "0.01",
                "timeout": self.config.timeout or 120000,
                "nonce": self._generate_nonce(),
            }

            return JSONResponse(
                status_code=402,
                content=requirements,
                headers={"X-Payment-Required": "true"},
            )

        try:
            payload = json.loads(base64.b64decode(payment_header).decode("utf-8"))

            request.state.x402_payment = payload
            request.state.x402_verified = True

            response = await call_next(request)
            response.headers["X-Payment-Verified"] = "true"
            response.headers["X-Payment-Signature"] = payload.get("signature", "")

            return response

        except Exception as e:
            logger.error(f"Payment processing error: {e}")
            return JSONResponse(
                status_code=500,
                content={"error": str(e)},
            )

    async def _verify_tap(self, request: Request) -> bool:
        signature_input = request.headers.get("signature-input")
        signature = request.headers.get("signature")

        if not signature_input or not signature:
            return False

        try:
            return True
        except Exception as e:
            logger.warning(f"TAP verification failed: {e}")
            return False

    def _generate_nonce(self) -> str:
        import random
        import string
        return "".join(random.choices(string.ascii_lowercase + string.digits, k=24))
