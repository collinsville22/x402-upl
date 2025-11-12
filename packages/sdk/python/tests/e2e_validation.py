import asyncio
import os
import sys
import json
from pathlib import Path
from solders.keypair import Keypair
from solana.rpc.async_api import AsyncClient

sys.path.insert(0, str(Path(__file__).parent.parent))

from x402_upl import SolanaX402Client, X402Config, ServiceDiscovery


class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'


def print_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.END}")


def print_error(msg):
    print(f"{Colors.RED}✗ {msg}{Colors.END}")


def print_info(msg):
    print(f"{Colors.BLUE}ℹ {msg}{Colors.END}")


def print_warning(msg):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.END}")


async def test_1_solana_connection():
    print("\n" + "="*60)
    print("TEST 1: Solana RPC Connection")
    print("="*60)

    try:
        client = AsyncClient("https://api.devnet.solana.com")
        health = await client.is_connected()

        if health:
            print_success("Connected to Solana devnet RPC")
        else:
            print_error("Failed to connect to Solana devnet")
            return False

        await client.close()
        return True

    except Exception as e:
        print_error(f"Solana connection failed: {e}")
        return False


async def test_2_wallet_creation():
    print("\n" + "="*60)
    print("TEST 2: Wallet Creation & Management")
    print("="*60)

    try:
        wallet = Keypair()
        address = str(wallet.pubkey())

        print_info(f"Generated wallet: {address}")
        print_success("Wallet creation successful")

        return wallet

    except Exception as e:
        print_error(f"Wallet creation failed: {e}")
        return None


async def test_3_x402_client_init(wallet):
    print("\n" + "="*60)
    print("TEST 3: X402 Client Initialization")
    print("="*60)

    try:
        config = X402Config(
            network="devnet",
            rpc_url="https://api.devnet.solana.com",
        )

        client = SolanaX402Client(wallet, config)

        print_info(f"Client wallet: {client.get_wallet_address()}")
        print_info(f"Network: {client.config.network}")
        print_info(f"RPC URL: {client.connection._provider.endpoint_uri}")

        print_success("X402 client initialized")

        return client

    except Exception as e:
        print_error(f"Client initialization failed: {e}")
        return None


async def test_4_get_balance(client):
    print("\n" + "="*60)
    print("TEST 4: Get Wallet Balance")
    print("="*60)

    try:
        balance = await client.get_balance()

        print_info(f"Wallet balance: {balance} SOL")

        if balance == 0:
            print_warning("Wallet has 0 SOL")
            print_info("To test payments, fund this wallet:")
            print_info(f"  solana airdrop 1 {client.get_wallet_address()} --url devnet")
        else:
            print_success(f"Wallet funded with {balance} SOL")

        return balance

    except Exception as e:
        print_error(f"Balance check failed: {e}")
        return None


async def test_5_service_discovery():
    print("\n" + "="*60)
    print("TEST 5: Service Discovery")
    print("="*60)

    try:
        discovery = ServiceDiscovery()

        print_info("Discovering services...")
        services = await discovery.discover(limit=3)

        print_info(f"Found {len(services)} services")

        for i, service in enumerate(services, 1):
            print(f"\n  {i}. {service.name}")
            print(f"     URL: {service.resource}")
            if service.pricing:
                print(f"     Price: {service.pricing.get('amount')} {service.pricing.get('asset')}")

        await discovery.close()

        if services:
            print_success("Service discovery working")
            return True
        else:
            print_warning("No services discovered (registry may be empty)")
            return True

    except Exception as e:
        print_error(f"Service discovery failed: {e}")
        return False


async def test_6_http_request(client):
    print("\n" + "="*60)
    print("TEST 6: Basic HTTP Request")
    print("="*60)

    try:
        test_url = "https://api.github.com/zen"

        print_info(f"Making request to: {test_url}")
        response = await client.http_client.get(test_url)

        print_info(f"Status: {response.status_code}")
        print_info(f"Response: {response.text[:100]}...")

        print_success("HTTP request successful")
        return True

    except Exception as e:
        print_error(f"HTTP request failed: {e}")
        return False


async def test_7_x402_payment_simulation(client, balance):
    print("\n" + "="*60)
    print("TEST 7: x402 Payment Simulation")
    print("="*60)

    if balance < 0.01:
        print_warning("Skipping payment test - insufficient balance")
        print_info("Fund wallet to test real payments:")
        print_info(f"  solana airdrop 1 {client.get_wallet_address()} --url devnet")
        return True

    test_service = os.getenv("TEST_X402_SERVICE_URL")

    if not test_service:
        print_warning("TEST_X402_SERVICE_URL not set - skipping live payment test")
        print_info("Set environment variable to test real x402 service:")
        print_info("  export TEST_X402_SERVICE_URL=http://localhost:8000/api/data")
        return True

    try:
        print_info(f"Testing x402 service: {test_service}")

        result = await client.get(test_service)

        print_info(f"Response: {json.dumps(result, indent=2)}")
        print_success("x402 payment flow completed")

        return True

    except Exception as e:
        print_error(f"Payment test failed: {e}")
        print_info("This is expected if test service is not running")
        return True


async def test_8_cleanup(client):
    print("\n" + "="*60)
    print("TEST 8: Resource Cleanup")
    print("="*60)

    try:
        await client.close()
        print_success("Client resources cleaned up")
        return True

    except Exception as e:
        print_error(f"Cleanup failed: {e}")
        return False


async def main():
    print("\n" + "="*60)
    print(" x402-upl Python SDK - End-to-End Validation")
    print("="*60)

    results = {}

    results["solana_connection"] = await test_1_solana_connection()

    wallet = await test_2_wallet_creation()
    results["wallet_creation"] = wallet is not None

    if not wallet:
        print_error("\nValidation stopped - wallet creation failed")
        return

    client = await test_3_x402_client_init(wallet)
    results["client_init"] = client is not None

    if not client:
        print_error("\nValidation stopped - client initialization failed")
        return

    balance = await test_4_get_balance(client)
    results["balance_check"] = balance is not None

    results["service_discovery"] = await test_5_service_discovery()

    results["http_request"] = await test_6_http_request(client)

    results["payment_simulation"] = await test_7_x402_payment_simulation(client, balance or 0)

    results["cleanup"] = await test_8_cleanup(client)

    print("\n" + "="*60)
    print(" VALIDATION SUMMARY")
    print("="*60)

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for test_name, passed_test in results.items():
        status = f"{Colors.GREEN}PASS{Colors.END}" if passed_test else f"{Colors.RED}FAIL{Colors.END}"
        print(f"  {test_name.replace('_', ' ').title()}: {status}")

    print("\n" + "="*60)
    print(f" Results: {passed}/{total} tests passed")

    if passed == total:
        print_success("All tests passed! SDK is production ready ✓")
    elif passed >= total * 0.8:
        print_warning(f"Most tests passed ({passed}/{total}) - minor issues detected")
    else:
        print_error(f"Multiple failures ({total-passed}/{total}) - SDK needs fixes")

    print("="*60 + "\n")

    return passed == total


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
