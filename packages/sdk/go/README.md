# x402-upl Go SDK

Production-ready Solana x402 SDK for autonomous payments in AI agents and services.

[![Go Reference](https://pkg.go.dev/badge/github.com/x402-upl/x402-upl-go.svg)](https://pkg.go.dev/github.com/x402-upl/x402-upl-go)
[![Go Report Card](https://goreportcard.com/badge/github.com/x402-upl/x402-upl-go)](https://goreportcard.com/report/github.com/x402-upl/x402-upl-go)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

## Features

- HTTP 402 Payment Protocol - Automatic payment handling
- Solana Integration - Native SOL and SPL token support
- Service Discovery - Find and connect to x402 services
- Type Safe - Full Go type safety with interfaces
- Context Support - Native context.Context integration
- Production Ready - Error handling, retries, logging

## Installation

```bash
go get github.com/x402-upl/x402-upl-go
```

## Quick Start

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/gagliardetto/solana-go"
    x402 "github.com/x402-upl/x402-upl-go"
)

func main() {
    wallet := solana.NewWallet()

    config := x402.X402Config{
        Network: "devnet",
        RPCUrl:  "https://api.devnet.solana.com",
        Timeout: 30,
    }

    client, err := x402.NewSolanaX402Client(wallet.PrivateKey, config)
    if err != nil {
        log.Fatal(err)
    }

    ctx := context.Background()

    var data interface{}
    data, err = client.Get(ctx, "https://api.example.com/data", nil)
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Response: %v\n", data)

    balance, err := client.GetBalance(ctx, "SOL")
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Balance: %.9f SOL\n", balance)
}
```

## Service Discovery

```go
package main

import (
    "context"
    "fmt"
    "log"

    x402 "github.com/x402-upl/x402-upl-go"
)

func main() {
    config := x402.DefaultDiscoveryConfig()
    discovery, err := x402.NewServiceDiscovery(config)
    if err != nil {
        log.Fatal(err)
    }

    ctx := context.Background()

    query := "AI"
    category := "AI & ML"
    maxPrice := 0.05
    minReputation := 0.8

    services, err := discovery.Discover(
        ctx,
        &query,
        &category,
        &maxPrice,
        &minReputation,
        nil,
        10,
    )
    if err != nil {
        log.Fatal(err)
    }

    for _, service := range services {
        fmt.Printf("Service: %s\n", service.Name)
        fmt.Printf("  URL: %s\n", service.Resource)
        if service.Pricing != nil {
            fmt.Printf("  Price: %s %s\n", service.Pricing.Amount, service.Pricing.Asset)
        }
    }
}
```

## Paid API Calls

```go
package main

import (
    "context"
    "log"

    "github.com/gagliardetto/solana-go"
    x402 "github.com/x402-upl/x402-upl-go"
)

func main() {
    wallet := solana.NewWallet()
    config := x402.DefaultConfig()

    client, err := x402.NewSolanaX402Client(wallet.PrivateKey, config)
    if err != nil {
        log.Fatal(err)
    }

    ctx := context.Background()

    requestBody := map[string]interface{}{
        "messages": []map[string]string{
            {"role": "user", "content": "Hello AI"},
        },
        "model": "llama-3.1-8b",
    }

    result, err := client.Post(
        ctx,
        "https://ai-service.com/api/inference",
        requestBody,
        nil,
    )
    if err != nil {
        log.Fatal(err)
    }

    log.Printf("Result: %v", result)
}
```

## How It Works

### 1. Client Makes Request

```go
data, err := client.Get(ctx, "https://api.service.com/data", nil)
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

```go
type SolanaX402Client struct {}

func NewSolanaX402Client(wallet solana.PrivateKey, config X402Config) (*SolanaX402Client, error)

func (c *SolanaX402Client) Get(ctx context.Context, url string, params map[string]string) (interface{}, error)

func (c *SolanaX402Client) Post(ctx context.Context, url string, data interface{}, params map[string]string) (interface{}, error)

func (c *SolanaX402Client) GetBalance(ctx context.Context, currency string) (float64, error)

func (c *SolanaX402Client) GetWalletAddress() string
```

### X402Config

```go
type X402Config struct {
    Network        string
    RPCUrl         string
    FacilitatorURL string
    Timeout        int
}

func DefaultConfig() X402Config
```

Default configuration:
- Network: "devnet"
- RPCUrl: "https://api.devnet.solana.com"
- FacilitatorURL: "https://facilitator.payai.network"
- Timeout: 30 seconds

### ServiceDiscovery

```go
type ServiceDiscovery struct {}

func NewServiceDiscovery(config DiscoveryConfig) (*ServiceDiscovery, error)

func (s *ServiceDiscovery) Discover(
    ctx context.Context,
    query *string,
    category *string,
    maxPrice *float64,
    minReputation *float64,
    minUptime *float64,
    limit int,
) ([]X402ServiceInfo, error)

func (s *ServiceDiscovery) GetService(ctx context.Context, serviceID string) (*X402ServiceInfo, error)
```

## Examples

### Simple Agent

```bash
cd examples/simple_agent
go run main.go
```

### AI Inference

```bash
cd examples/ai_inference
go run main.go
```

## Error Handling

```go
import "github.com/x402-upl/x402-upl-go"

data, err := client.Get(ctx, "https://api.example.com/data", nil)
if err != nil {
    if x402Err, ok := err.(*x402.X402Error); ok {
        switch x402Err.Type {
        case x402.ErrorTypePaymentRequired:
            log.Printf("Payment required: %v", x402Err)
        case x402.ErrorTypeInsufficientBalance:
            log.Printf("Insufficient balance: %v", x402Err)
        case x402.ErrorTypePaymentFailed:
            log.Printf("Payment failed: %v", x402Err)
        case x402.ErrorTypeNetwork:
            log.Printf("Network error: %v", x402Err)
        case x402.ErrorTypeSolana:
            log.Printf("Solana error: %v", x402Err)
        default:
            log.Printf("Error: %v", x402Err)
        }
    } else {
        log.Printf("Unknown error: %v", err)
    }
    return
}
```

## Advanced Usage

### Custom RPC Endpoint

```go
config := x402.X402Config{
    Network: "mainnet-beta",
    RPCUrl:  "https://api.mainnet-beta.solana.com",
    Timeout: 60,
}
```

### Query Parameters

```go
params := map[string]string{
    "limit":  "10",
    "offset": "0",
}

data, err := client.Get(ctx, "https://api.example.com/items", params)
```

### Context Timeout

```go
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()

data, err := client.Get(ctx, "https://api.example.com/data", nil)
```

## Testing

```bash
go test ./tests -v

go test ./tests -run TestClientCreation -v

go test ./tests -bench=.
```

## Building

```bash
go build

go build -o x402-example ./examples/simple_agent

go test ./...

go fmt ./...

go vet ./...

golangci-lint run
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

- Private keys never leave memory
- Secure transaction signing
- Payment verification
- Amount validation
- Recipient address validation
- Signature verification

## Documentation

Full documentation available at [pkg.go.dev](https://pkg.go.dev/github.com/x402-upl/x402-upl-go)

```bash
go doc -all
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
