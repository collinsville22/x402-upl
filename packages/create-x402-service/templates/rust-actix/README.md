# x402 Actix Service

Production-ready x402-enabled API service built with Actix Web, TAP authentication, and automatic registry integration.

## Features

- Actix Web high-performance async framework
- x402 payment verification middleware
- TAP (Trusted Agent Protocol) authentication
- Automatic service registration with x402 registry
- Redis-backed signature store for horizontal scalability
- CASH token support (TOKEN_2022)
- Compile-time type safety
- Production-grade error handling

## Prerequisites

- Rust 1.70+
- Redis (required for production)
- Solana wallet for treasury
- x402 registry access

## Quick Start

### 1. Install Dependencies

```bash
cargo build
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```env
NETWORK=devnet
TREASURY_WALLET=your_wallet_address_here
REDIS_URL=redis://localhost:6379

ENABLE_TAP=false
REGISTRY_URL=https://registry.x402.network

AUTO_REGISTER_SERVICE=false
SERVICE_URL=https://api.example.com
SERVICE_NAME=My x402 Actix Service
```

### 3. Run Development Server

```bash
cargo run
```

Or with automatic reloading:

```bash
cargo install cargo-watch
cargo watch -x run
```

The service runs on `http://localhost:8080`.

### 4. Test Payment Flow

```bash
curl http://localhost:8080/api/example
```

Returns 402 Payment Required with payment requirements.

## Project Structure

```
rust-actix/
├── src/
│   ├── routes/
│   │   ├── mod.rs
│   │   └── example.rs         # Example x402-protected routes
│   ├── x402/
│   │   ├── mod.rs
│   │   ├── middleware.rs      # x402 payment middleware
│   │   └── registry_client.rs # x402 registry integration
│   ├── config.rs              # Configuration management
│   └── main.rs                # Application entry point
├── Cargo.toml                 # Dependencies
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

## Registry Integration

Enable automatic registration in `.env`:

```env
AUTO_REGISTER_SERVICE=true
SERVICE_URL=https://api.example.com
SERVICE_NAME=My Actix Service
```

The service automatically:
- Registers on startup
- Sends periodic heartbeats (every 60s)
- Updates status to PAUSED on shutdown (SIGINT/SIGTERM)

## Adding Protected Routes

Create a new route in `src/routes/`:

```rust
use actix_web::{web, HttpRequest, HttpResponse, Result};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct CustomRequest {
    pub data: String,
}

#[derive(Serialize)]
pub struct CustomResponse {
    pub success: bool,
    pub data: String,
}

pub async fn handle_custom(
    req: HttpRequest,
    body: web::Json<CustomRequest>,
) -> Result<HttpResponse> {
    let payment_verified = req.extensions()
        .get::<crate::x402::PaymentVerified>()
        .is_some();

    let response = CustomResponse {
        success: true,
        data: body.data.clone(),
    };

    Ok(HttpResponse::Ok().json(response))
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api")
            .route("/custom", web::post().to(handle_custom)),
    );
}
```

Register the route in `src/main.rs`:

```rust
use routes::configure_custom;

App::new()
    .configure(configure_custom)
```

All routes automatically require x402 payment through the middleware.

## Accessing Payment Data

Payment verification is available in `HttpRequest` extensions:

```rust
pub async fn handle_request(req: HttpRequest) -> Result<HttpResponse> {
    let payment_verified = req.extensions()
        .get::<crate::x402::PaymentVerified>()
        .is_some();

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "paymentVerified": payment_verified,
    })))
}
```

## Production Deployment

### Docker

```dockerfile
FROM rust:1.75 as builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/target/release/x402-actix-service .
EXPOSE 8080
CMD ["./x402-actix-service"]
```

Build and run:

```bash
docker build -t x402-actix-service .
docker run -p 8080:8080 --env-file .env x402-actix-service
```

### Environment Variables

Production environment requires:
- `NETWORK=mainnet-beta`
- `REDIS_URL` (required for mainnet)
- `TREASURY_WALLET` (production wallet)
- `SERVICE_URL` (public HTTPS URL)

## Testing

Run tests:

```bash
cargo test
```

With coverage:

```bash
cargo install cargo-tarpaulin
cargo tarpaulin --out Html
```

## Performance

Actix Web is one of the fastest web frameworks:
- Zero-cost abstractions
- Async/await with Tokio runtime
- Minimal overhead
- Actor model for concurrency

Typical performance:
- **Throughput:** ~100,000 req/s (single thread)
- **Latency:** ~1ms
- **Best For:** High-performance APIs, microservices, real-time systems

## Monitoring

Structured logging with `env_logger`:

```rust
use log::{info, warn, error};

info!("Processing request");
warn!("Heartbeat failed: {}", e);
error!("Failed to register service: {}", e);
```

Set log level with `RUST_LOG`:

```env
RUST_LOG=debug
```

## Security

- Redis required for mainnet (horizontal scaling)
- Compile-time type safety with Rust
- Memory safety without garbage collection
- CORS configurable via actix-cors
- Rate limiting recommended (not included)

## Support

- Documentation: https://collinsville22.github.io/x402-upl
- Registry: https://registry.x402.network
- Issues: https://github.com/x402-upl/issues
