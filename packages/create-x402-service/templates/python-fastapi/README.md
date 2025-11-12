# x402 FastAPI Service

Production-ready x402-enabled API service built with FastAPI, TAP authentication, and automatic registry integration.

## Features

- FastAPI high-performance async framework
- x402 payment verification middleware
- TAP (Trusted Agent Protocol) authentication
- Automatic service registration with x402 registry
- Redis-backed signature store for horizontal scalability
- CASH token support (TOKEN_2022)
- Pydantic settings validation
- Structured logging
- Production-grade error handling

## Prerequisites

- Python 3.11+
- Redis (required for production)
- Solana wallet for treasury
- x402 registry access

## Quick Start

### 1. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -e .
```

### 3. Configure Environment

Copy `.env.example` to `.env` and configure:

```env
NETWORK=devnet
TREASURY_WALLET=your_wallet_address_here
REDIS_URL=redis://localhost:6379

ENABLE_TAP=false
REGISTRY_URL=https://registry.x402.network

AUTO_REGISTER_SERVICE=false
SERVICE_URL=https://api.example.com
SERVICE_NAME=My x402 FastAPI Service
```

### 4. Run Development Server

```bash
python -m app.main
```

Or with uvicorn directly:

```bash
uvicorn app.main:app --reload --port 8000
```

The service runs on `http://localhost:8000`.

### 5. Test Payment Flow

```bash
curl http://localhost:8000/api/example
```

Returns 402 Payment Required with payment requirements.

## Project Structure

```
python-fastapi/
├── app/
│   ├── routes/
│   │   ├── __init__.py
│   │   └── example.py          # Example x402-protected routes
│   ├── x402/
│   │   ├── __init__.py
│   │   ├── middleware.py       # x402 payment middleware
│   │   └── registry_client.py  # x402 registry integration
│   ├── __init__.py
│   ├── config.py               # Pydantic settings
│   └── main.py                 # FastAPI application
├── pyproject.toml              # Dependencies
└── README.md
```

## API Endpoints

### Protected Endpoints

**POST /api/example**
- Requires x402 payment
- Price: 0.01 CASH (configurable)
- Accepts JSON body
- Returns processed data with payment info

**GET /api/example**
- Requires x402 payment
- Price: 0.01 CASH
- Returns success message with payment info

### Public Endpoints

**GET /health**
- Health check endpoint
- No payment required
- Returns service status

**GET /docs**
- Interactive API documentation (Swagger UI)
- No payment required

## Registry Integration

Enable automatic registration in `.env`:

```env
AUTO_REGISTER_SERVICE=true
SERVICE_URL=https://api.example.com
SERVICE_NAME=My FastAPI Service
```

The service automatically:
- Registers on startup (lifespan startup)
- Sends periodic heartbeats (every 60s)
- Updates status to PAUSED on shutdown

## Adding Protected Routes

Create a new router in `app/routes/`:

```python
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api")

@router.post("/custom")
async def custom_endpoint(request: Request, data: dict):
    payment = getattr(request.state, "x402_payment", None)

    return {
        "success": True,
        "data": data,
        "payment": payment,
    }
```

Register the router in `app/main.py`:

```python
from .routes.custom import router as custom_router

app.include_router(custom_router)
```

All routes automatically require x402 payment through the middleware.

## Accessing Payment Data

Payment information is available in `request.state`:

```python
@router.post("/example")
async def handle_request(request: Request):
    payment = getattr(request.state, "x402_payment", None)
    verified = getattr(request.state, "x402_verified", False)
    tap_verified = getattr(request.state, "tap_verified", False)

    return {
        "paymentVerified": verified,
        "tapVerified": tap_verified,
        "signature": payment.get("signature") if payment else None,
    }
```

## Production Deployment

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir -e .

COPY app/ ./app/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:

```bash
docker build -t x402-fastapi-service .
docker run -p 8000:8000 --env-file .env x402-fastapi-service
```

### Environment Variables

Production environment requires:
- `NETWORK=mainnet-beta`
- `REDIS_URL` (required for mainnet)
- `TREASURY_WALLET` (production wallet)
- `SERVICE_URL` (public HTTPS URL)

## Testing

Run tests with pytest:

```bash
pytest
```

With coverage:

```bash
pytest --cov=app --cov-report=html
```

## Code Quality

Format code with Black:

```bash
black app/
```

Lint with Ruff:

```bash
ruff check app/
```

## Performance

FastAPI is one of the fastest Python frameworks:
- Async/await throughout
- Pydantic validation
- ASGI server (Uvicorn)
- Type hints for better performance

Typical performance:
- **Throughput:** ~10,000 req/s (single worker)
- **Latency:** ~8ms
- **Best For:** Python ecosystem, ML/AI services, async operations

## Monitoring

Structured logging is built-in:

```python
import logging

logger = logging.getLogger(__name__)

logger.info("Processing request")
logger.error(f"Error: {e}")
```

## Security

- Redis required for mainnet (horizontal scaling)
- Pydantic settings validation
- CORS configurable via FastAPI
- Rate limiting recommended (not included)

## Support

- Documentation: https://collinsville22.github.io/x402-upl
- Registry: https://registry.x402.network
- Issues: https://github.com/x402-upl/issues
