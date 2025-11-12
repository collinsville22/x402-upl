import asyncio
import os
from solders.keypair import Keypair
from x402_upl import SolanaX402Client, X402Config, ServiceDiscovery


async def main():
    private_key_path = os.getenv("X402_WALLET_PATH", "wallet.json")

    try:
        import json
        with open(private_key_path, "r") as f:
            secret_key = json.load(f)
            wallet = Keypair.from_bytes(bytes(secret_key))
    except FileNotFoundError:
        print("Wallet not found, generating new wallet...")
        wallet = Keypair()
        print(f"New wallet address: {wallet.pubkey()}")
        print("Fund this wallet with SOL to use the SDK")

    config = X402Config(
        network="devnet",
        rpc_url="https://api.devnet.solana.com",
    )

    client = SolanaX402Client(wallet, config)
    discovery = ServiceDiscovery()

    try:
        balance = await client.get_balance()
        print(f"Wallet: {client.get_wallet_address()}")
        print(f"Balance: {balance} SOL")

        print("\nDiscovering x402 services...")
        services = await discovery.discover(
            category="AI & ML",
            max_price=0.10,
            limit=5
        )

        print(f"Found {len(services)} services:")
        for i, service in enumerate(services, 1):
            print(f"\n{i}. {service.name}")
            print(f"   Description: {service.description}")
            print(f"   Endpoint: {service.resource}")
            if service.pricing:
                print(f"   Price: {service.pricing.get('amount')} {service.pricing.get('asset')}")

        if services:
            print("\n" + "="*50)
            print("Testing first service...")
            service = services[0]

            try:
                result = await client.get(service.resource)
                print("Service response:")
                print(result)

            except Exception as e:
                print(f"Service call failed: {e}")

    finally:
        await client.close()
        await discovery.close()


if __name__ == "__main__":
    asyncio.run(main())
