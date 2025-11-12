# x402-upl Rust SDK

Production-ready Solana x402 SDK for autonomous payments in AI agents and services.

[![Crates.io](https://img.shields.io/crates/v/x402-upl.svg)](https://crates.io/crates/x402-upl)
[![Documentation](https://docs.rs/x402-upl/badge.svg)](https://docs.rs/x402-upl)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

## Features

- ✅ **HTTP 402 Payment Protocol** - Automatic payment handling
- ✅ **Solana Integration** - Native SOL and SPL token support
- ✅ **Service Discovery** - Find and connect to x402 services
- ✅ **Type Safe** - Full Rust type safety
- ✅ **Async/Await** - Modern async Rust API
- ✅ **Production Ready** - Error handling, retries, logging

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
x402-upl = "2.0"
tokio = { version = "1", features = ["full"] }
solana-sdk = "1.18"
```

## Quick Start

```rust
use solana_sdk::signature::Keypair;
use x402_upl::{SolanaX402Client, X402Config};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let wallet = Keypair::new();

    let config = X402Config {
        network: "devnet".to_string(),
        rpc_url: Some("https://api.devnet.solana.com".to_string()),
        ..Default::default()
    };

    let client = SolanaX402Client::new(wallet, config)?;

    let data: serde_json::Value = client
        .get("https://api.example.com/data", None)
        .await?;

    println!("Response: {}", data);

    let balance = client.get_balance("SOL")?;
    println!("Balance: {} SOL", balance);

    Ok(())
}
```

## Service Discovery

```rust
use x402_upl::{ServiceDiscovery, DiscoveryConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = DiscoveryConfig::default();
    let discovery = ServiceDiscovery::new(config)?;

    let services = discovery
        .discover(
            Some("AI"),           // query
            Some("AI & ML"),      // category
            Some(0.05),           // max_price
            Some(0.8),            // min_reputation
            None,                 // min_uptime
            10                    // limit
        )
        .await?;

    for service in services {
        println!("Service: {}", service.name);
        println!("  URL: {}", service.resource);
        if let Some(pricing) = service.pricing {
            println!("  Price: {} {}", pricing.amount, pricing.asset);
        }
    }

    Ok(())
}
```

## Paid API Calls

```rust
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = SolanaX402Client::new(wallet, config)?;

    let request_body = json!({
        "messages": [
            {"role": "user", "content": "Hello AI"}
        ],
        "model": "llama-3.1-8b"
    });

    let result: serde_json::Value = client
        .post(
            "https://ai-service.com/api/inference",
            Some(request_body),
            None
        )
        .await?;

    println!("Result: {}", result);

    Ok(())
}
```

## How It Works

### 1. Client Makes Request

```rust
let data = client.get("https://api.service.com/data", None).await?;
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

```rust
impl SolanaX402Client {
    pub fn new(wallet: Keypair, config: X402Config) -> Result<Self>;

    pub async fn get<T: DeserializeOwned>(
        &self,
        url: &str,
        params: Option<Vec<(&str, &str)>>
    ) -> Result<T>;

    pub async fn post<T: DeserializeOwned>(
        &self,
        url: &str,
        data: Option<Value>,
        params: Option<Vec<(&str, &str)>>
    ) -> Result<T>;

    pub fn get_balance(&self, currency: &str) -> Result<f64>;

    pub fn get_wallet_address(&self) -> String;
}
```

### X402Config

```rust
pub struct X402Config {
    pub network: String,              // "devnet" | "mainnet-beta" | "testnet"
    pub rpc_url: Option<String>,
    pub facilitator_url: String,
    pub timeout: u64,
}

impl Default for X402Config {
    fn default() -> Self {
        Self {
            network: "devnet".to_string(),
            rpc_url: None,
            facilitator_url: "https://facilitator.payai.network".to_string(),
            timeout: 30,
        }
    }
}
```

### ServiceDiscovery

```rust
impl ServiceDiscovery {
    pub fn new(config: DiscoveryConfig) -> Result<Self>;

    pub async fn discover(
        &self,
        query: Option<&str>,
        category: Option<&str>,
        max_price: Option<f64>,
        min_reputation: Option<f64>,
        min_uptime: Option<f64>,
        limit: usize
    ) -> Result<Vec<X402Service>>;

    pub async fn get_service(&self, service_id: &str) -> Result<X402Service>;
}
```

## Examples

### Simple Agent

```bash
cargo run --example simple_agent
```

### AI Inference

```bash
cargo run --example ai_inference
```

## Error Handling

```rust
use x402_upl::X402Error;

match client.get("https://api.example.com/data", None).await {
    Ok(data) => println!("Success: {:?}", data),
    Err(X402Error::PaymentRequired(msg)) => eprintln!("Payment required: {}", msg),
    Err(X402Error::InsufficientBalance(msg)) => eprintln!("Insufficient balance: {}", msg),
    Err(X402Error::PaymentFailed(msg)) => eprintln!("Payment failed: {}", msg),
    Err(X402Error::Network(e)) => eprintln!("Network error: {}", e),
    Err(e) => eprintln!("Error: {}", e),
}
```

## Advanced Usage

### Custom RPC Endpoint

```rust
let config = X402Config {
    network: "mainnet-beta".to_string(),
    rpc_url: Some("https://api.mainnet-beta.solana.com".to_string()),
    timeout: 60,
    ..Default::default()
};
```

### Query Parameters

```rust
let params = vec![("limit", "10"), ("offset", "0")];
let data: Vec<Item> = client
    .get("https://api.example.com/items", Some(params))
    .await?;
```

## Testing

```bash
# Run tests
cargo test

# Run with output
cargo test -- --nocapture

# Run specific test
cargo test test_client_creation
```

## Building

```bash
# Build
cargo build

# Build release
cargo build --release

# Check
cargo check

# Format
cargo fmt

# Lint
cargo clippy
```

## Performance

Typical latencies on Solana devnet:

- Wallet creation: <1ms
- Balance check: 200-500ms
- Service discovery: 100-300ms
- HTTP request: 50-200ms
- SOL payment: 400-800ms
- SPL token payment: 600-1000ms
- Full x402 flow: 1-2 seconds

## Security

- ✅ Private keys never leave memory
- ✅ Secure transaction signing
- ✅ Payment verification
- ✅ Amount validation
- ✅ Recipient address validation
- ✅ Signature verification

## Documentation

Full documentation available at [docs.rs/x402-upl](https://docs.rs/x402-upl)

```bash
# Build and open docs locally
cargo doc --open
```

## License

Apache-2.0

## Support

- Documentation: https://docs.x402.network
- GitHub: https://github.com/x402-upl/x402-upl
- Discord: https://discord.gg/x402

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## Credits

Built by the x402-upl team for the Solana AI Hackathon.
