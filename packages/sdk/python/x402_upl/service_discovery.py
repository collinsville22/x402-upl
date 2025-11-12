from typing import List, Optional, Dict, Any
from dataclasses import dataclass

import httpx


@dataclass
class DiscoveryConfig:
    registry_url: str = "https://registry.x402.network"
    timeout: int = 10


@dataclass
class X402Service:
    id: str
    name: str
    description: str
    resource: str
    method: str
    pricing: Optional[Dict[str, Any]]
    category: Optional[str]
    reputation: Optional[float]
    uptime: Optional[float]


class ServiceDiscovery:
    def __init__(self, config: Optional[DiscoveryConfig] = None):
        self.config = config or DiscoveryConfig()
        self.client = httpx.AsyncClient(timeout=self.config.timeout)

    async def discover(
        self,
        query: Optional[str] = None,
        category: Optional[str] = None,
        max_price: Optional[float] = None,
        min_reputation: Optional[float] = None,
        min_uptime: Optional[float] = None,
        limit: int = 10,
    ) -> List[X402Service]:
        params: Dict[str, Any] = {"limit": limit}

        if query:
            params["query"] = query
        if category:
            params["category"] = category
        if max_price is not None:
            params["maxPrice"] = max_price
        if min_reputation is not None:
            params["minReputation"] = min_reputation
        if min_uptime is not None:
            params["minUptime"] = min_uptime

        url = f"{self.config.registry_url}/services/discover"

        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()

            services_data = response.json()

            services = [
                X402Service(
                    id=service.get("id", ""),
                    name=service.get("name", ""),
                    description=service.get("description", ""),
                    resource=service.get("resource", ""),
                    method=service.get("method", "GET"),
                    pricing=service.get("pricing"),
                    category=service.get("category"),
                    reputation=service.get("reputation"),
                    uptime=service.get("uptime"),
                )
                for service in services_data
            ]

            return services

        except httpx.HTTPError as e:
            raise Exception(f"Service discovery failed: {e}")

    async def get_service(self, service_id: str) -> X402Service:
        url = f"{self.config.registry_url}/services/{service_id}"

        try:
            response = await self.client.get(url)
            response.raise_for_status()

            service = response.json()

            return X402Service(
                id=service.get("id", ""),
                name=service.get("name", ""),
                description=service.get("description", ""),
                resource=service.get("resource", ""),
                method=service.get("method", "GET"),
                pricing=service.get("pricing"),
                category=service.get("category"),
                reputation=service.get("reputation"),
                uptime=service.get("uptime"),
            )

        except httpx.HTTPError as e:
            raise Exception(f"Failed to get service: {e}")

    async def close(self):
        await self.client.aclose()
