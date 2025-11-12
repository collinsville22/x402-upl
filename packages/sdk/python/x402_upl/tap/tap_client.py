import time
from dataclasses import dataclass
from typing import Any, Dict, Optional
from urllib.parse import urlparse

import httpx
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from .rfc9421 import RFC9421Signature, SignatureParams, SignatureComponents


@dataclass
class TAPConfig:
    key_id: str
    private_key: Ed25519PrivateKey
    algorithm: str = "ed25519"
    registry_url: Optional[str] = None
    did: Optional[str] = None
    visa_tap_cert: Optional[str] = None


@dataclass
class AgentIdentity:
    did: str
    visa_tap_cert: str
    wallet_address: str
    reputation_score: Optional[int] = None


class TAPClient:
    def __init__(
        self,
        config: TAPConfig,
        agent_identity: Optional[AgentIdentity] = None,
        timeout: int = 30
    ):
        self.config = config
        self.agent_identity = agent_identity
        self.http_client = httpx.AsyncClient(timeout=timeout)

    async def sign_request(
        self,
        url: str,
        method: str = "POST"
    ) -> Dict[str, str]:
        parsed = urlparse(url)

        components = SignatureComponents(
            authority=parsed.netloc,
            path=parsed.path + (f"?{parsed.query}" if parsed.query else "")
        )

        now = int(time.time())
        params = SignatureParams(
            created=now,
            expires=now + 300,
            key_id=self.config.key_id,
            alg=self.config.algorithm,
            nonce=RFC9421Signature.generate_nonce(),
            tag="agent-payer-auth"
        )

        result = await RFC9421Signature.sign_ed25519(
            components,
            params,
            self.config.private_key
        )

        return {
            "Signature-Input": result.signature_input,
            "Signature": result.signature,
        }

    async def request(
        self,
        method: str,
        url: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Any:
        headers = await self.sign_request(url, method)

        if self.agent_identity:
            headers["X-Agent-DID"] = self.agent_identity.did
            headers["X-Agent-Cert"] = self.agent_identity.visa_tap_cert
            headers["X-Agent-Wallet"] = self.agent_identity.wallet_address

        response = await self.http_client.request(
            method=method,
            url=url,
            json=data,
            params=params,
            headers=headers
        )

        response.raise_for_status()
        return response.json()

    async def register_agent(
        self,
        wallet_address: str,
        stake: Optional[float] = None
    ) -> AgentIdentity:
        if not self.config.registry_url:
            raise ValueError("Registry URL required for agent registration")

        registration_data = {
            "did": self.config.did or f"did:x402:{self.config.key_id}",
            "walletAddress": wallet_address,
            "visaTapCert": self.config.visa_tap_cert or self.config.key_id,
            "publicKey": RFC9421Signature.public_key_to_base64(
                self.config.private_key.public_key()
            ),
            "algorithm": self.config.algorithm,
            "stake": stake or 0,
        }

        response = await self.request(
            "POST",
            f"{self.config.registry_url}/agents/register",
            data=registration_data
        )

        agent = response["agent"]
        self.agent_identity = AgentIdentity(
            did=agent["did"],
            visa_tap_cert=agent["visaTapCert"],
            wallet_address=agent["walletAddress"],
            reputation_score=agent.get("reputationScore")
        )

        return self.agent_identity

    async def discover_agents(
        self,
        filters: Optional[Dict[str, Any]] = None
    ) -> list[AgentIdentity]:
        if not self.config.registry_url:
            raise ValueError("Registry URL required for agent discovery")

        response = await self.request(
            "GET",
            f"{self.config.registry_url}/agents/discover",
            params=filters
        )

        return [
            AgentIdentity(
                did=agent["did"],
                visa_tap_cert=agent["visaTapCert"],
                wallet_address=agent["walletAddress"],
                reputation_score=agent.get("reputationScore")
            )
            for agent in response["agents"]
        ]

    async def close(self):
        await self.http_client.aclose()
