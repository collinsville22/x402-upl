use solana_sdk::signature::Keypair;
use x402_upl::{SolanaX402Client, X402Config, ServiceDiscovery, DiscoveryConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("x402-upl Rust SDK - Simple Agent Example\n");

    let wallet = Keypair::new();
    println!("Generated wallet: {}", wallet.pubkey());

    let config = X402Config {
        network: "devnet".to_string(),
        rpc_url: Some("https://api.devnet.solana.com".to_string()),
        ..Default::default()
    };

    let client = SolanaX402Client::new(wallet, config)?;

    let balance = client.get_balance("SOL")?;
    println!("Wallet balance: {} SOL\n", balance);

    if balance == 0.0 {
        println!("⚠️  Wallet has no balance. Fund it to test payments:");
        println!("   solana airdrop 1 {} --url devnet\n", client.get_wallet_address());
    }

    println!("Discovering x402 services...");
    let discovery_config = DiscoveryConfig::default();
    let discovery = ServiceDiscovery::new(discovery_config)?;

    let services = discovery
        .discover(
            Some("AI"),
            None,
            Some(0.10),
            None,
            None,
            5
        )
        .await?;

    println!("Found {} services:\n", services.len());

    for (i, service) in services.iter().enumerate() {
        println!("{}. {}", i + 1, service.name);
        println!("   Description: {}", service.description);
        println!("   Endpoint: {}", service.resource);
        if let Some(pricing) = &service.pricing {
            println!("   Price: {} {}", pricing.amount, pricing.asset);
        }
        println!();
    }

    if let Some(service) = services.first() {
        println!("Testing service: {}", service.name);

        match client.get::<serde_json::Value>(&service.resource, None).await {
            Ok(response) => {
                println!("✓ Service response:");
                println!("{}", serde_json::to_string_pretty(&response)?);
            }
            Err(e) => {
                println!("✗ Service call failed: {}", e);
            }
        }
    }

    Ok(())
}
