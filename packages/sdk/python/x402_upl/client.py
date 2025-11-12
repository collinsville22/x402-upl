import asyncio
import base64
import json
import time
from typing import Any, Dict, Optional
from dataclasses import dataclass

import httpx
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.system_program import TransferParams, transfer
from solders.transaction import Transaction
from solders.message import Message
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed
from spl.token.async_client import AsyncToken
from spl.token.constants import TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID

from .exceptions import (
    PaymentRequiredError,
    PaymentFailedError,
    InsufficientBalanceError,
    NetworkError,
)

CASH_MINT = Pubkey.from_string("CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH")
CASH_DECIMALS = 6


@dataclass
class X402Config:
    network: str = "devnet"
    rpc_url: Optional[str] = None
    facilitator_url: str = "https://facilitator.payai.network"
    registry_api_url: Optional[str] = None
    timeout: int = 30
    spending_limit_per_hour: float = float('inf')
    enable_tap: bool = False
    tap_config: Optional[Any] = None
    agent_identity: Optional[Any] = None
    preferred_tokens: Optional[list[str]] = None


@dataclass
class PaymentMetrics:
    total_spent: float = 0.0
    total_earned: float = 0.0
    net_profit: float = 0.0
    transaction_count: int = 0
    average_cost_per_inference: float = 0.0


@dataclass
class PaymentRecord:
    signature: str
    timestamp: int
    amount: float
    asset: str
    type: str
    from_address: str
    to_address: str


class SolanaX402Client:
    def __init__(self, wallet: Keypair, config: Optional[X402Config] = None):
        self.wallet = wallet
        self.config = config or X402Config()
        self.metrics = PaymentMetrics()
        self.payment_history: list[PaymentRecord] = []
        self.hourly_spending: Dict[int, float] = {}

        if self.config.rpc_url:
            rpc_url = self.config.rpc_url
        elif self.config.network == "mainnet-beta":
            rpc_url = "https://api.mainnet-beta.solana.com"
        elif self.config.network == "devnet":
            rpc_url = "https://api.devnet.solana.com"
        else:
            rpc_url = "https://api.testnet.solana.com"

        self.connection = AsyncClient(rpc_url, commitment=Confirmed)
        self.http_client = httpx.AsyncClient(timeout=self.config.timeout)

    async def get(self, url: str, params: Optional[Dict[str, Any]] = None) -> Any:
        return await self._request("GET", url, params=params)

    async def post(
        self,
        url: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Any:
        return await self._request("POST", url, data=data, params=params)

    async def _request(
        self,
        method: str,
        url: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Any:
        try:
            response = await self.http_client.request(
                method=method,
                url=url,
                json=data if method == "POST" else None,
                params=params,
            )

            if response.status_code == 402:
                requirements = response.json()
                payment_header = await self._create_payment(requirements)

                paid_response = await self.http_client.request(
                    method=method,
                    url=url,
                    json=data if method == "POST" else None,
                    params=params,
                    headers={"X-Payment": payment_header},
                )

                paid_response.raise_for_status()
                return paid_response.json()

            response.raise_for_status()
            return response.json()

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 402:
                raise PaymentRequiredError(e.response.json())
            raise NetworkError(f"HTTP error: {e}")
        except httpx.RequestError as e:
            raise NetworkError(f"Network error: {e}")

    async def _create_payment(self, requirements: Dict[str, Any]) -> str:
        recipient = Pubkey.from_string(requirements["payTo"])
        amount = float(requirements["amount"])
        asset = requirements.get("asset", "SOL")

        self._track_payment(amount, "sent", requirements["payTo"])

        if asset == "SOL" or requirements.get("scheme") == "solana":
            signature = await self._send_sol_payment(recipient, amount)
        else:
            if asset == "CASH":
                mint = CASH_MINT
            else:
                mint = Pubkey.from_string(requirements["asset"])
            signature = await self._send_token_payment(recipient, amount, mint)

        payload = {
            "network": requirements.get("network", self.config.network),
            "asset": asset,
            "from": str(self.wallet.pubkey()),
            "to": requirements["payTo"],
            "amount": requirements["amount"],
            "signature": signature,
            "timestamp": int(time.time() * 1000),
            "nonce": requirements.get("nonce", self._generate_nonce()),
        }

        if "memo" in requirements:
            payload["memo"] = requirements["memo"]

        return base64.b64encode(json.dumps(payload).encode()).decode()

    async def _send_sol_payment(self, recipient: Pubkey, amount: float) -> str:
        lamports = int(amount * 1_000_000_000)

        balance_response = await self.connection.get_balance(self.wallet.pubkey())
        if balance_response.value < lamports:
            raise InsufficientBalanceError(
                f"Insufficient SOL balance. Required: {amount} SOL, "
                f"Available: {balance_response.value / 1_000_000_000} SOL"
            )

        transfer_ix = transfer(
            TransferParams(
                from_pubkey=self.wallet.pubkey(),
                to_pubkey=recipient,
                lamports=lamports,
            )
        )

        recent_blockhash = await self.connection.get_latest_blockhash()
        if not recent_blockhash.value:
            raise PaymentFailedError("Failed to get recent blockhash")

        message = Message.new_with_blockhash(
            [transfer_ix],
            self.wallet.pubkey(),
            recent_blockhash.value.blockhash,
        )

        transaction = Transaction([self.wallet], message, recent_blockhash.value.blockhash)

        response = await self.connection.send_transaction(transaction)

        if not response.value:
            raise PaymentFailedError("Failed to send SOL payment")

        signature = str(response.value)

        await self._confirm_transaction(signature)

        return signature

    async def _send_token_payment(
        self, recipient: Pubkey, amount: float, mint: Pubkey
    ) -> str:
        is_cash = mint == CASH_MINT
        program_id = TOKEN_2022_PROGRAM_ID if is_cash else TOKEN_PROGRAM_ID

        token = AsyncToken(
            self.connection,
            mint,
            program_id,
            self.wallet,
        )

        mint_info = await token.get_mint_info()
        decimals = mint_info.decimals if mint_info else CASH_DECIMALS

        from_account = await token.get_or_create_associated_account_info(
            self.wallet.pubkey()
        )

        token_amount = int(amount * (10**decimals))

        if from_account.amount < token_amount:
            raise InsufficientBalanceError(
                f"Insufficient token balance. Required: {amount}, "
                f"Available: {from_account.amount / (10**decimals)}"
            )

        to_account = await token.get_or_create_associated_account_info(recipient)

        signature = await token.transfer(
            from_account.address,
            to_account.address,
            self.wallet.pubkey(),
            token_amount,
        )

        await self._confirm_transaction(str(signature))

        return str(signature)

    async def _confirm_transaction(
        self, signature: str, timeout: float = 30.0
    ) -> bool:
        start_time = asyncio.get_event_loop().time()

        while asyncio.get_event_loop().time() - start_time < timeout:
            response = await self.connection.get_signature_statuses([signature])

            if response.value and len(response.value) > 0:
                status = response.value[0]
                if status and status.confirmation_status == Confirmed:
                    return True

            await asyncio.sleep(1.0)

        raise PaymentFailedError(f"Transaction confirmation timeout: {signature}")

    def _generate_nonce(self) -> str:
        import secrets

        return secrets.token_hex(16)

    async def get_balance(self, currency: str = "SOL") -> float:
        if currency == "SOL":
            response = await self.connection.get_balance(self.wallet.pubkey())
            return response.value / 1_000_000_000

        mint = CASH_MINT if currency == "CASH" else Pubkey.from_string(currency)
        is_cash = mint == CASH_MINT
        program_id = TOKEN_2022_PROGRAM_ID if is_cash else TOKEN_PROGRAM_ID

        token = AsyncToken(
            self.connection,
            mint,
            program_id,
            self.wallet,
        )

        try:
            mint_info = await token.get_mint_info()
            decimals = mint_info.decimals if mint_info else CASH_DECIMALS

            account_info = await token.get_or_create_associated_account_info(
                self.wallet.pubkey()
            )
            return account_info.amount / (10**decimals)
        except:
            return 0.0

    def get_wallet_address(self) -> str:
        return str(self.wallet.pubkey())

    def get_metrics(self) -> PaymentMetrics:
        return PaymentMetrics(
            total_spent=self.metrics.total_spent,
            total_earned=self.metrics.total_earned,
            net_profit=self.metrics.net_profit,
            transaction_count=self.metrics.transaction_count,
            average_cost_per_inference=self.metrics.average_cost_per_inference,
        )

    def get_payment_history(self, limit: Optional[int] = None) -> list[PaymentRecord]:
        history = list(reversed(self.payment_history))
        return history[:limit] if limit else history

    async def fetch_payment_history(self, limit: int = 100) -> list[PaymentRecord]:
        signatures = await self.connection.get_signatures_for_address(
            self.wallet.pubkey(), limit=limit
        )

        records = []
        for sig_info in signatures.value:
            tx = await self.connection.get_transaction(
                sig_info.signature, max_supported_transaction_version=0
            )

            if not tx or not tx.value or not tx.value.transaction.meta:
                continue

            meta = tx.value.transaction.meta
            pre_balance = meta.pre_balances[0] if meta.pre_balances else 0
            post_balance = meta.post_balances[0] if meta.post_balances else 0
            diff = (post_balance - pre_balance) / 1_000_000_000

            if diff != 0:
                records.append(PaymentRecord(
                    signature=str(sig_info.signature),
                    timestamp=sig_info.block_time * 1000 if sig_info.block_time else int(time.time() * 1000),
                    amount=abs(diff),
                    asset="SOL",
                    type="sent" if diff < 0 else "received",
                    from_address=str(self.wallet.pubkey()),
                    to_address="",
                ))

        return records

    def get_spent_this_hour(self) -> float:
        current_hour = int(time.time() // 3600)
        return self.hourly_spending.get(current_hour, 0.0)

    def get_remaining_hourly_budget(self) -> float:
        spent = self.get_spent_this_hour()
        return max(0.0, self.config.spending_limit_per_hour - spent)

    def _track_payment(self, amount: float, payment_type: str, counterparty: str) -> None:
        current_hour = int(time.time() // 3600)

        if payment_type == "sent":
            self.metrics.total_spent += amount
            self.hourly_spending[current_hour] = (
                self.hourly_spending.get(current_hour, 0.0) + amount
            )
        else:
            self.metrics.total_earned += amount

        self.metrics.net_profit = self.metrics.total_earned - self.metrics.total_spent
        self.metrics.transaction_count += 1
        self.metrics.average_cost_per_inference = (
            self.metrics.total_spent / self.metrics.transaction_count
            if self.metrics.transaction_count > 0
            else 0.0
        )

        self.payment_history.append(PaymentRecord(
            signature="",
            timestamp=int(time.time() * 1000),
            amount=amount,
            asset="SOL",
            type=payment_type,
            from_address=str(self.wallet.pubkey()) if payment_type == "sent" else counterparty,
            to_address=counterparty if payment_type == "sent" else str(self.wallet.pubkey()),
        ))

        self._cleanup_old_hourly_data()

    def _cleanup_old_hourly_data(self) -> None:
        current_hour = int(time.time() // 3600)
        cutoff_hour = current_hour - 24

        hours_to_remove = [hour for hour in self.hourly_spending if hour < cutoff_hour]
        for hour in hours_to_remove:
            del self.hourly_spending[hour]

    def record_earnings(self, amount: float, from_address: str) -> None:
        self._track_payment(amount, "received", from_address)

    async def close(self):
        await self.http_client.aclose()
        await self.connection.close()
