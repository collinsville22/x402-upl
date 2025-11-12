# x402 Go Service

Production-ready x402-enabled API service built with Go net/http, TAP authentication, and automatic registry integration.

## Features

- Go standard library net/http
- x402 payment verification middleware
- TAP (Trusted Agent Protocol) authentication
- Automatic service registration with x402 registry
- Redis-backed signature store for horizontal scalability
- CASH token support (TOKEN_2022)
- Compile-time type safety
- Production-grade error handling

## Prerequisites

- Go 1.21+
- Redis (required for production)
- Solana wallet for treasury
- x402 registry access

## Quick Start

### 1. Install Dependencies

```bash
go mod download
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
SERVICE_NAME=My x402 Go Service
```

### 3. Run Development Server

```bash
go run cmd/server/main.go
```

Or build and run:

```bash
go build -o server cmd/server/main.go
./server
```

The service runs on `http://localhost:8080`.

### 4. Test Payment Flow

```bash
curl http://localhost:8080/api/example
```

Returns 402 Payment Required with payment requirements.

## Project Structure

```
go-nethttp/
├── cmd/
│   └── server/
│       └── main.go            # Application entry point
├── internal/
│   ├── config/
│   │   └── config.go          # Configuration management
│   ├── routes/
│   │   └── example.go         # Example x402-protected routes
│   └── x402/
│       ├── middleware.go      # x402 payment middleware
│       └── registry_client.go # x402 registry integration
├── go.mod                     # Go modules
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
SERVICE_NAME=My Go Service
```

The service automatically:
- Registers on startup
- Sends periodic heartbeats (every 60s)
- Updates status to PAUSED on shutdown (SIGINT/SIGTERM)

## Adding Protected Routes

Add a new handler in `internal/routes/`:

```go
package routes

import (
	"encoding/json"
	"net/http"
)

type CustomRequest struct {
	Data string `json:"data"`
}

type CustomResponse struct {
	Success bool   `json:"success"`
	Data    string `json:"data"`
}

func HandleCustom(w http.ResponseWriter, r *http.Request) {
	var req CustomRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	response := CustomResponse{
		Success: true,
		Data:    req.Data,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
```

Register the route in `cmd/server/main.go`:

```go
mux.HandleFunc("/api/custom", func(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		routes.HandleCustom(w, r)
	} else {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
})
```

All routes automatically require x402 payment through the middleware.

## Production Deployment

### Docker

```dockerfile
FROM golang:1.21 as builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server cmd/server/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 8080
CMD ["./server"]
```

Build and run:

```bash
docker build -t x402-go-service .
docker run -p 8080:8080 --env-file .env x402-go-service
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
go test ./...
```

With coverage:

```bash
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

## Performance

Go net/http is highly performant:
- Lightweight goroutines for concurrency
- Fast compilation and execution
- Low memory footprint
- Excellent standard library

Typical performance:
- **Throughput:** ~50,000 req/s
- **Latency:** ~2ms
- **Best For:** Microservices, systems programming, high-concurrency APIs

## Monitoring

Structured logging with standard log package:

```go
import "log"

log.Println("Processing request")
log.Printf("Error: %v", err)
```

For production, consider using structured logging libraries like `zap` or `zerolog`.

## Security

- Redis required for mainnet (horizontal scaling)
- Compile-time type safety with Go
- Memory safety with garbage collection
- CORS configurable via middleware
- Rate limiting recommended (not included)

## Support

- Documentation: https://docs.x402.network
- Registry: https://registry.x402.network
- Issues: https://github.com/x402-upl/issues
