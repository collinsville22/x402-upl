use serde_json::json;
use solana_sdk::signature::Keypair;
use x402_upl::{SolanaX402Client, X402Config, ServiceDiscovery, DiscoveryConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("x402-upl Rust SDK - AI Inference Example\n");

    let wallet = Keypair::new();

    let config = X402Config {
        network: "devnet".to_string(),
        rpc_url: Some("https://api.devnet.solana.com".to_string()),
        ..Default::default()
    };

    let client = SolanaX402Client::new(wallet, config)?;

    println!("Wallet: {}", client.get_wallet_address());

    let balance = client.get_balance("SOL")?;
    println!("Balance: {} SOL\n", balance);

    if balance < 0.01 {
        eprintln!("Error: Insufficient balance for testing");
        eprintln!("Fund your wallet:");
        eprintln!("  solana airdrop 1 {} --url devnet", client.get_wallet_address());
        std::process::exit(1);
    }

    println!("Finding AI inference service...");
    let discovery_config = DiscoveryConfig::default();
    let discovery = ServiceDiscovery::new(discovery_config)?;

    let services = discovery
        .discover(
            Some("inference"),
            Some("AI & ML"),
            Some(0.05),
            Some(0.7),
            None,
            1
        )
        .await?;

    if services.is_empty() {
        eprintln!("No inference services found");
        std::process::exit(1);
    }

    let service = &services[0];
    println!("Using service: {}", service.name);

    if let Some(pricing) = &service.pricing {
        println!("Price: {} {}\n", pricing.amount, pricing.asset);
    }

    let prompts = vec![
        "Explain quantum computing in simple terms",
        "What are the top 3 programming languages in 2024?",
        "How does blockchain work?",
    ];

    for (i, prompt) in prompts.iter().enumerate() {
        println!("{}. Query: {}", i + 1, prompt);
        println!("{}", "=".repeat(60));

        let request_body = json!({
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "model": "llama-3.1-8b"
        });

        match client.post::<serde_json::Value>(&service.resource, Some(request_body), None).await {
            Ok(result) => {
                if let Some(choices) = result.get("choices") {
                    if let Some(first_choice) = choices.get(0) {
                        if let Some(message) = first_choice.get("message") {
                            if let Some(content) = message.get("content") {
                                println!("\nResponse:\n{}\n", content);
                            }
                        }
                    }
                }

                if let Some(usage) = result.get("usage") {
                    if let Some(tokens) = usage.get("total_tokens") {
                        println!("Tokens used: {}\n", tokens);
                    }
                }
            }
            Err(e) => {
                eprintln!("Inference failed: {}\n", e);
            }
        }

        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    }

    let final_balance = client.get_balance("SOL")?;
    println!("{}", "=".repeat(60));
    println!("Final balance: {} SOL", final_balance);
    println!("Total spent: {} SOL", balance - final_balance);

    Ok(())
}
