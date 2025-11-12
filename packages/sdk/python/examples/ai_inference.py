import asyncio
import os
from solders.keypair import Keypair
from x402_upl import SolanaX402Client, X402Config, ServiceDiscovery


class AIInferenceAgent:
    def __init__(self, wallet: Keypair):
        self.config = X402Config(network="devnet")
        self.client = SolanaX402Client(wallet, self.config)
        self.discovery = ServiceDiscovery()

    async def find_inference_service(self, max_price: float = 0.05):
        services = await self.discovery.discover(
            query="inference",
            category="AI & ML",
            max_price=max_price,
            min_reputation=0.7,
            limit=1
        )

        if not services:
            raise Exception(f"No inference services found under {max_price} USD")

        return services[0]

    async def run_inference(self, prompt: str, model: str = "llama-3.1-8b"):
        print(f"Finding inference service (model: {model})...")
        service = await self.find_inference_service()

        print(f"Using service: {service.name}")
        print(f"Price: {service.pricing.get('amount')} {service.pricing.get('asset')}")

        print(f"\nRunning inference...")
        result = await self.client.post(
            service.resource,
            data={
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "model": model,
            }
        )

        return result

    async def close(self):
        await self.client.close()
        await self.discovery.close()


async def main():
    private_key_path = os.getenv("X402_WALLET_PATH", "wallet.json")

    try:
        import json
        with open(private_key_path, "r") as f:
            secret_key = json.load(f)
            wallet = Keypair.from_bytes(bytes(secret_key))
    except FileNotFoundError:
        print("Error: Wallet file not found")
        print("Set X402_WALLET_PATH environment variable or create wallet.json")
        return

    agent = AIInferenceAgent(wallet)

    try:
        balance = await agent.client.get_balance()
        print(f"Wallet: {agent.client.get_wallet_address()}")
        print(f"Balance: {balance} SOL\n")

        prompts = [
            "Explain quantum computing in simple terms",
            "What are the top 3 programming languages in 2024?",
            "How does blockchain work?",
        ]

        for i, prompt in enumerate(prompts, 1):
            print(f"\n{'='*60}")
            print(f"Query {i}: {prompt}")
            print('='*60)

            try:
                result = await agent.run_inference(prompt)

                if "choices" in result:
                    response = result["choices"][0]["message"]["content"]
                    print(f"\nResponse:\n{response}")

                    if "usage" in result:
                        tokens = result["usage"]["total_tokens"]
                        print(f"\nTokens used: {tokens}")

            except Exception as e:
                print(f"Inference failed: {e}")

            await asyncio.sleep(1)

        final_balance = await agent.client.get_balance()
        print(f"\n{'='*60}")
        print(f"Final balance: {final_balance} SOL")
        print(f"Total spent: {balance - final_balance} SOL")

    finally:
        await agent.close()


if __name__ == "__main__":
    asyncio.run(main())
