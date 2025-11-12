from fastapi import FastAPI
from contextlib import asynccontextmanager
import asyncio
import logging
from .config import settings
from .x402 import X402Middleware, RegistryClient
from .routes import example_router
from x402_upl import X402Config

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)

registry_client = None
heartbeat_task = None


async def heartbeat_loop():
    while True:
        try:
            await asyncio.sleep(60)
            if registry_client:
                await registry_client.heartbeat()
        except Exception as e:
            logger.warning(f"Heartbeat failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global registry_client, heartbeat_task

    if settings.auto_register_service and settings.service_url and settings.service_name:
        registry_client = RegistryClient(settings.registry_url)

        accepted_tokens = [t.strip() for t in settings.accepted_tokens.split(",")]
        capabilities = [c.strip() for c in settings.service_capabilities.split(",")] if settings.service_capabilities else []
        tags = [t.strip() for t in settings.service_tags.split(",")] if settings.service_tags else []

        await registry_client.register_service(
            name=settings.service_name,
            description=settings.service_description or "",
            url=settings.service_url,
            category=settings.service_category or "API",
            pricing={"amount": settings.service_price, "currency": "CASH"},
            wallet_address=settings.treasury_wallet,
            network=settings.network,
            accepted_tokens=accepted_tokens,
            capabilities=capabilities,
            tags=tags,
        )

        heartbeat_task = asyncio.create_task(heartbeat_loop())
        logger.info(f"Service registered with x402 registry")

    yield

    if heartbeat_task:
        heartbeat_task.cancel()
        try:
            await heartbeat_task
        except asyncio.CancelledError:
            pass

    if registry_client:
        try:
            await registry_client.set_service_status("PAUSED")
            logger.info("Service status updated to PAUSED")
        except Exception as e:
            logger.warning(f"Failed to update service status: {e}")
        finally:
            await registry_client.close()


app = FastAPI(
    title=settings.service_name or "x402 FastAPI Service",
    description=settings.service_description or "Production-ready x402-enabled FastAPI service",
    lifespan=lifespan,
)

x402_config = X402Config(
    network=settings.network,
)

app.add_middleware(X402Middleware, config=x402_config)

app.include_router(example_router)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.service_name or "x402-fastapi-service",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level=settings.log_level,
    )
