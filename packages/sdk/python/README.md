# x402-upl Python SDK

Production-ready Solana x402 SDK for autonomous payments in AI agents and services.

## Features

- ✅ **HTTP 402 Payment Protocol** - Automatic payment handling
- ✅ **Solana Integration** - Native SOL and SPL token support
- ✅ **Service Discovery** - Find and connect to x402 services
- ✅ **Type Safe** - Full type hints and validation
- ✅ **Async/Await** - Modern async Python API
- ✅ **Production Ready** - Error handling, retries, logging

## Installation

```bash
pip install x402-upl
```

### From Source

```bash
git clone https://github.com/x402-upl/x402-upl
cd x402-upl/packages/sdk/python
pip install -e .
```

## Quick Start

### Basic Usage

```python
import asyncio
from solders.keypair import Keypair
from x402_upl import SolanaX402Client, X402Config

async def main():
    wallet = Keypair()

    config = X402Config(
        network="devnet",
        rpc_url="https://api.devnet.solana.com",
    )

    client = SolanaX402Client(wallet, config)

    try:
        data = await client.get("https://api.example.com/data")
        print("Response:", data)

        balance = await client.get_balance()
        print(f"Wallet balance: {balance} SOL")

    finally:
        await client.close()

asyncio.run(main())
```

### Service Discovery

```python
from x402_upl import ServiceDiscovery, DiscoveryConfig

async def discover_services():
    config = DiscoveryConfig(
        registry_url="https://registry.x402.network"
    )

    discovery = ServiceDiscovery(config)

    try:
        services = await discovery.discover(
            category="AI & ML",
            max_price=0.05,
            min_reputation=0.8,
            limit=10
        )

        for service in services:
            print(f"Service: {service.name}")
            print(f"  URL: {service.resource}")
            print(f"  Price: {service.pricing}")
            print(f"  Reputation: {service.reputation}")

    finally:
        await discovery.close()

asyncio.run(discover_services())
```

### Paid API Calls

```python
async def call_paid_service():
    wallet = Keypair.from_seed(your_seed)
    client = SolanaX402Client(wallet)

    try:
        result = await client.post(
            "https://ai-service.com/api/analyze",
            data={
                "text": "Analyze this sentiment",
                "model": "bert-base"
            }
        )

        print("Analysis result:", result)

    except PaymentRequiredError as e:
        print("Payment required:", e.requirements)
    except InsufficientBalanceError as e:
        print("Insufficient balance:", e)
    finally:
        await client.close()

asyncio.run(call_paid_service())
```

## How It Works

### 1. Client Makes Request

```python
data = await client.get("https://api.service.com/data")
```

### 2. Server Returns 402 Payment Required

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "scheme": "solana",
  "network": "devnet",
  "asset": "SOL",
  "payTo": "recipient-wallet-address",
  "amount": "0.001",
  "timeout": 60
}
```

### 3. Client Automatically Creates Payment

- Signs Solana transaction
- Sends SOL/SPL tokens
- Gets transaction signature

### 4. Client Retries with X-Payment Header

```http
GET /data HTTP/1.1
X-Payment: eyJzaWduYXR1cmUiOiIuLi4iLCAiYW1vdW50IjoiMC4wMDEiLCAuLi59
```

### 5. Server Returns Data

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"data": "..."}
```

## API Reference

### SolanaX402Client

```python
class SolanaX402Client:
    def __init__(
        self,
        wallet: Keypair,
        config: Optional[X402Config] = None
    )

    async def get(
        self,
        url: str,
        params: Optional[Dict[str, Any]] = None
    ) -> Any

    async def post(
        self,
        url: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Any

    async def get_balance(self, currency: str = "SOL") -> float

    def get_wallet_address(self) -> str

    async def close()
```

### X402Config

```python
@dataclass
class X402Config:
    network: str = "devnet"  # or "mainnet-beta", "testnet"
    rpc_url: Optional[str] = None
    facilitator_url: str = "https://facilitator.payai.network"
    timeout: int = 30
```

### ServiceDiscovery

```python
class ServiceDiscovery:
    def __init__(self, config: Optional[DiscoveryConfig] = None)

    async def discover(
        self,
        query: Optional[str] = None,
        category: Optional[str] = None,
        max_price: Optional[float] = None,
        min_reputation: Optional[float] = None,
        min_uptime: Optional[float] = None,
        limit: int = 10
    ) -> List[X402Service]

    async def get_service(self, service_id: str) -> X402Service

    async def close()
```

## Advanced Usage

### Context Manager

```python
async with SolanaX402Client(wallet, config) as client:
    data = await client.get("https://api.example.com/data")
    print(data)
```

### Custom RPC Endpoint

```python
config = X402Config(
    network="mainnet-beta",
    rpc_url="https://api.mainnet-beta.solana.com",
    timeout=60
)
```

### Error Handling

```python
from x402_upl import (
    PaymentRequiredError,
    PaymentFailedError,
    InsufficientBalanceError,
    NetworkError
)

try:
    data = await client.get(url)
except PaymentRequiredError as e:
    print(f"Payment required: {e.requirements}")
except InsufficientBalanceError as e:
    print(f"Not enough balance: {e}")
except PaymentFailedError as e:
    print(f"Payment failed: {e}")
except NetworkError as e:
    print(f"Network error: {e}")
```

## Examples

### AI Agent with x402

```python
import asyncio
from solders.keypair import Keypair
from x402_upl import SolanaX402Client, ServiceDiscovery

class AIAgent:
    def __init__(self, wallet: Keypair):
        self.client = SolanaX402Client(wallet)
        self.discovery = ServiceDiscovery()

    async def analyze_sentiment(self, text: str):
        services = await self.discovery.discover(
            category="AI & ML",
            query="sentiment analysis",
            max_price=0.01
        )

        if not services:
            raise Exception("No services found")

        service = services[0]

        result = await self.client.post(
            service.resource,
            data={"text": text}
        )

        return result

    async def close(self):
        await self.client.close()
        await self.discovery.close()

async def main():
    wallet = Keypair()
    agent = AIAgent(wallet)

    try:
        result = await agent.analyze_sentiment("This is great!")
        print("Sentiment:", result)
    finally:
        await agent.close()

asyncio.run(main())
```

## Development

### Setup

```bash
cd packages/sdk/python
pip install -e ".[dev]"
```

### Run Tests

```bash
pytest
```

### Type Checking

```bash
mypy x402_upl
```

### Code Formatting

```bash
black x402_upl
ruff check x402_upl
```

## License

Apache-2.0

## Support

- Documentation: https://docs.x402.network
- GitHub: https://github.com/x402-upl/x402-upl
- Discord: https://discord.gg/x402

## Credits

Built by the x402-upl team for the Solana AI Hackathon.
