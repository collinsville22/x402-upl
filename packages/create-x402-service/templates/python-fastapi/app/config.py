from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    port: int = 8000
    host: str = "0.0.0.0"
    log_level: str = "info"

    network: str = "devnet"
    treasury_wallet: str
    redis_url: str = "redis://localhost:6379"

    enable_tap: bool = False
    registry_url: str = "https://registry.x402.network"

    auto_register_service: bool = False
    service_url: Optional[str] = None
    service_name: Optional[str] = None
    service_description: Optional[str] = None
    service_category: Optional[str] = None
    service_price: float = 0.01
    accepted_tokens: str = "CASH,USDC,SOL"
    service_capabilities: str = ""
    service_tags: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
