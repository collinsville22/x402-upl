import httpx
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)


class RegistryClient:
    def __init__(self, registry_url: str):
        self.registry_url = registry_url
        self.service_id: Optional[str] = None
        self.client = httpx.AsyncClient(timeout=10.0)

    async def register_service(
        self,
        name: str,
        description: str,
        url: str,
        category: str,
        pricing: Dict[str, Any],
        wallet_address: str,
        network: str,
        accepted_tokens: List[str],
        capabilities: Optional[List[str]] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        registration_data = {
            "name": name,
            "description": description,
            "url": url,
            "category": category,
            "pricing": pricing,
            "walletAddress": wallet_address,
            "network": network,
            "acceptedTokens": accepted_tokens,
            "capabilities": capabilities or [],
            "tags": tags or [],
            "metadata": metadata or {},
        }

        response = await self.client.post(f"{self.registry_url}/services/register", json=registration_data)
        response.raise_for_status()

        result = response.json()
        self.service_id = result.get("serviceId")
        logger.info(f"Service registered with x402 registry: {self.service_id}")

        return result.get("service", {})

    async def update_service(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        if not self.service_id:
            raise ValueError("Service not registered")

        response = await self.client.put(f"{self.registry_url}/services/{self.service_id}", json=updates)
        response.raise_for_status()

        logger.info(f"Service updated in registry: {self.service_id}")
        return response.json().get("service", {})

    async def set_service_status(self, status: str) -> None:
        if not self.service_id:
            raise ValueError("Service not registered")

        await self.client.patch(f"{self.registry_url}/services/{self.service_id}/status", json={"status": status})
        logger.info(f"Service status updated: {self.service_id} -> {status}")

    async def report_metrics(self, metrics: Dict[str, Any]) -> None:
        if not self.service_id:
            raise ValueError("Service not registered")

        await self.client.post(f"{self.registry_url}/services/{self.service_id}/metrics", json=metrics)
        logger.debug(f"Metrics reported to registry: {self.service_id}")

    async def heartbeat(self) -> None:
        if not self.service_id:
            raise ValueError("Service not registered")

        await self.client.post(f"{self.registry_url}/services/{self.service_id}/heartbeat")
        logger.debug(f"Heartbeat sent to registry: {self.service_id}")

    async def get_service_info(self) -> Optional[Dict[str, Any]]:
        if not self.service_id:
            return None

        response = await self.client.get(f"{self.registry_url}/services/{self.service_id}")
        return response.json().get("service")

    async def close(self):
        await self.client.aclose()
