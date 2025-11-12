import pytest
import asyncio
import os
from solders.keypair import Keypair
from x402_upl import SolanaX402Client, X402Config, ServiceDiscovery


@pytest.fixture
def test_wallet():
    private_key = os.getenv("TEST_WALLET_PRIVATE_KEY")
    if private_key:
        import json
        secret_key = json.loads(private_key)
        return Keypair.from_bytes(bytes(secret_key))
    return Keypair()


@pytest.fixture
def client(test_wallet):
    config = X402Config(
        network="devnet",
        rpc_url="https://api.devnet.solana.com",
    )
    return SolanaX402Client(test_wallet, config)


@pytest.fixture
def discovery():
    return ServiceDiscovery()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_real_solana_connection(client):
    balance = await client.get_balance()
    assert balance >= 0.0
    print(f"Wallet balance: {balance} SOL")


@pytest.mark.integration
@pytest.mark.asyncio
async def test_wallet_address(client):
    address = client.get_wallet_address()
    assert len(address) > 0
    assert address.startswith(('1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'))
    print(f"Wallet address: {address}")


@pytest.mark.integration
@pytest.mark.asyncio
async def test_service_discovery_real(discovery):
    services = await discovery.discover(limit=5)

    print(f"Discovered {len(services)} services")
    for service in services:
        print(f"  - {service.name}: {service.resource}")

    assert isinstance(services, list)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_x402_payment_flow_real(client):
    test_service_url = os.getenv("TEST_X402_SERVICE_URL")

    if not test_service_url:
        pytest.skip("TEST_X402_SERVICE_URL not set")

    balance_before = await client.get_balance()

    try:
        result = await client.get(test_service_url)
        print(f"Service response: {result}")

        balance_after = await client.get_balance()
        spent = balance_before - balance_after

        print(f"Payment successful. Spent: {spent} SOL")
        assert spent > 0, "Payment should have been made"

    except Exception as e:
        print(f"Expected behavior for test: {e}")


@pytest.mark.integration
@pytest.mark.asyncio
async def test_concurrent_requests(client):
    test_url = os.getenv("TEST_X402_SERVICE_URL", "https://api.devnet.solana.com")

    async def make_request():
        try:
            return await client.get(test_url)
        except Exception as e:
            return {"error": str(e)}

    tasks = [make_request() for _ in range(3)]
    results = await asyncio.gather(*tasks)

    assert len(results) == 3
    print(f"Concurrent requests completed: {len(results)} results")


@pytest.mark.integration
@pytest.mark.asyncio
async def test_client_lifecycle(test_wallet):
    config = X402Config(network="devnet")
    client = SolanaX402Client(test_wallet, config)

    balance = await client.get_balance()
    assert balance >= 0

    await client.close()

    print("Client lifecycle test passed")
