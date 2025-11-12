from typing import Any, Dict, Optional

from solders.keypair import Keypair

from .client import SolanaX402Client, X402Config
from .service_discovery import ServiceDiscovery
from .tap import TAPClient, TAPConfig, AgentIdentity


class X402Client:
    def __init__(
        self,
        wallet: Keypair,
        config: Optional[X402Config] = None
    ):
        self.wallet = wallet
        self.config = config or X402Config()

        self.solana_client = SolanaX402Client(wallet, self.config)
        self.discovery = ServiceDiscovery(self.config.registry_api_url)

        self.tap_client: Optional[TAPClient] = None
        if self.config.enable_tap and self.config.tap_config:
            self.tap_client = TAPClient(
                self.config.tap_config,
                self.config.agent_identity
            )

    async def discover(self, options: Optional[Dict[str, Any]] = None):
        return await self.discovery.discover(options or {})

    async def get_service(self, service_id: str):
        return await self.discovery.get_service(service_id)

    async def get(self, url: str, params: Optional[Dict[str, Any]] = None) -> Any:
        return await self.solana_client.get(url, params)

    async def post(
        self,
        url: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Any:
        return await self.solana_client.post(url, data, params)

    async def register_agent(self, stake: Optional[float] = None) -> AgentIdentity:
        if not self.tap_client:
            raise ValueError("TAP must be enabled to register as an agent")

        wallet_address = str(self.wallet.pubkey())
        return await self.tap_client.register_agent(wallet_address, stake)

    async def discover_agents(
        self,
        filters: Optional[Dict[str, Any]] = None
    ) -> list[AgentIdentity]:
        if not self.tap_client:
            raise ValueError("TAP must be enabled to discover agents")

        return await self.tap_client.discover_agents(filters)

    def get_agent_identity(self) -> Optional[AgentIdentity]:
        if self.tap_client:
            return self.tap_client.agent_identity
        return None

    def get_tap_client(self) -> Optional[TAPClient]:
        return self.tap_client

    def get_connection(self):
        return self.solana_client.connection

    def get_wallet(self) -> Keypair:
        return self.wallet

    def get_wallet_address(self) -> str:
        return str(self.wallet.pubkey())

    def get_network(self) -> str:
        return self.config.network

    async def get_balance(self, asset: str = "SOL") -> float:
        return await self.solana_client.get_balance(asset)

    def get_metrics(self):
        return self.solana_client.metrics

    def get_payment_history(self, limit: Optional[int] = None):
        if limit:
            return self.solana_client.payment_history[-limit:]
        return self.solana_client.payment_history

    async def close(self):
        await self.solana_client.close()
        if self.tap_client:
            await self.tap_client.close()
