# X402 CLI

Command-line interface for managing services, agents, and payments on the x402 Universal Payment Layer.

## Overview

The X402 CLI provides a complete toolkit for interacting with the x402 network from your terminal. Whether you're registering as an agent, enabling payment on your services, discovering available services, or managing earnings, the CLI streamlines all x402 operations.

**Key Capabilities:**
- **Agent Management**: Register wallets, configure TAP authentication
- **Service Registration**: Enable x402 on your API endpoints
- **Service Discovery**: Find and browse available paid services
- **Payment Testing**: Test payment flows before going live
- **Earnings Tracking**: Monitor revenue from your services
- **Code Generation**: Scaffold middleware for popular frameworks

The CLI is designed for developers building on x402, service providers monetizing APIs, and autonomous agents consuming paid services.

## Installation

### Global Installation

```bash
npm install -g @x402-upl/cli
```

Verify installation:

```bash
x402 --version
# 2.0.0
```

### Local Installation

```bash
npm install @x402-upl/cli
npx x402 --help
```

### From Source

```bash
git clone https://github.com/collinsville22/x402-upl.git
cd x402-upl/packages/cli
npm install
npm run build
npm link
```

## Quick Start

### 1. Initialize Your Agent

Create or import a Solana wallet:

```bash
x402 init
```

Interactive prompts will guide you through:
- Creating a new wallet
- Importing an existing wallet
- Setting network (mainnet/devnet)
- Configuring RPC endpoint

### 2. Register as Agent

Register your wallet on the x402 network:

```bash
x402 register
```

This stakes SOL for reputation and registers you in the agent registry.

### 3. Configure TAP Authentication

Set up Trusted Agent Protocol for authenticated requests:

```bash
x402 tap init
```

Generates Ed25519 or RSA keypair for request signing.

### 4. Enable Service

Register your API service with x402:

```bash
x402 enable https://api.example.com \
  --name "Weather API" \
  --description "Real-time weather data" \
  --category "Data Analytics" \
  --price 0.001 \
  --tokens USDC,CASH
```

### 5. Test Payment Flow

Verify your service works correctly:

```bash
x402 test https://api.example.com/weather
```

### 6. Discover Services

Browse available paid services:

```bash
x402 discover --category "AI & ML" --max-price 0.01
```

### 7. Track Earnings

Monitor revenue from your services:

```bash
x402 earnings
```

## Commands

### `x402 init`

Initialize x402 configuration and create/import wallet.

**Usage:**
```bash
x402 init [options]
```

**Options:**
- `--network <network>` - Solana network (mainnet-beta, devnet, testnet)
- `--rpc-url <url>` - Custom RPC endpoint
- `--import <path>` - Import existing wallet from keypair file

**Interactive Mode:**

```bash
x402 init

? Select network:
  ❯ devnet (recommended for testing)
    mainnet-beta (production)
    testnet (experimental)

? How would you like to set up your wallet?
  ❯ Create new wallet
    Import existing wallet
    Use existing wallet path

? Enter wallet path: /home/user/.config/solana/id.json

✓ Configuration initialized
  Network: devnet
  RPC URL: https://api.devnet.solana.com
  Wallet: 8rKw...xY9z
  Config: /home/user/.config/x402-upl/config.json
```

**Non-Interactive:**

```bash
# Create new wallet on devnet
x402 init --network devnet

# Import existing wallet
x402 init --import ~/.config/solana/id.json --network mainnet-beta

# Custom RPC
x402 init --network mainnet-beta --rpc-url https://api.mainnet-beta.solana.com
```

---

### `x402 register`

Register wallet as x402 agent with reputation staking.

**Usage:**
```bash
x402 register [options]
```

**Options:**
- `--stake <amount>` - SOL amount to stake (default: 0.1)
- `--name <name>` - Agent display name
- `--description <desc>` - Agent description
- `--website <url>` - Agent website URL

**Example:**

```bash
x402 register \
  --stake 1.0 \
  --name "My AI Agent" \
  --description "Autonomous service consumer" \
  --website https://example.com

⠋ Creating agent registration transaction...
✓ Agent registered successfully

Agent Details:
  Public Key: 8rKw...xY9z
  Name: My AI Agent
  Stake: 1.0 SOL
  Reputation: 0/10000 (new agent)
  Registry: https://registry.x402.network/agents/8rKw...xY9z
```

**What It Does:**
1. Stakes specified SOL amount for reputation
2. Registers agent in x402 registry
3. Creates on-chain agent account
4. Initializes reputation score at 0

---

### `x402 tap`

Manage TAP (Trusted Agent Protocol) authentication using RFC 9421 HTTP message signatures.

#### `x402 tap init`

Initialize TAP authentication for your agent.

**Usage:**
```bash
x402 tap init [options]
```

**Options:**
- `--did <did>` - Decentralized Identifier
- `--alg <algorithm>` - Signature algorithm: `ed25519` or `rsa-pss-sha256` (default: ed25519)

**Example:**

```bash
x402 tap init --alg ed25519

⠋ Generating TAP keypair...
✓ TAP authentication initialized

TAP Configuration:
  Key ID: ed25519_8rKw7xY9
  Algorithm: ed25519
  DID: did:x402:8rKw7xY9z4m2
  Private Key: /home/user/.config/x402-upl/keys/ed25519_8rKw7xY9.private
  Public Key: /home/user/.config/x402-upl/keys/ed25519_8rKw7xY9.public

Keep your private key secure. Never commit it to version control.
```

#### `x402 tap verify`

Verify TAP configuration is correct.

**Usage:**
```bash
x402 tap verify
```

**Example:**

```bash
x402 tap verify

⠋ Verifying TAP configuration...
✓ TAP configuration valid

Configuration:
  Key ID: ed25519_8rKw7xY9
  Algorithm: ed25519
  DID: did:x402:8rKw7xY9z4m2
  Private Key: Found ✓
  Public Key: Found ✓

Test Signature:
  Message: "test-message-1699000000"
  Signature: base64(...)
  Verification: ✓ Valid
```

#### `x402 tap show`

Display current TAP configuration.

**Usage:**
```bash
x402 tap show
```

---

### `x402 enable`

Register a service with x402 payment protocol.

**Usage:**
```bash
x402 enable <url> [options]
```

**Arguments:**
- `<url>` - Service base URL

**Options:**
- `-n, --name <name>` - Service name
- `-d, --description <desc>` - Service description
- `-c, --category <category>` - Service category
- `-p, --price <price>` - Price per call in USDC
- `-t, --tokens <tokens>` - Accepted tokens (comma-separated, default: CASH,USDC,SOL)
- `--with-tap` - Enable TAP authentication requirement
- `--cash-enabled` - Prioritize CASH token payments
- `--capabilities <caps>` - Service capabilities (comma-separated)
- `--tags <tags>` - Service tags (comma-separated)

**Example:**

```bash
x402 enable https://api.example.com/weather \
  --name "Weather API" \
  --description "Real-time weather data for any location" \
  --category "Data Analytics" \
  --price 0.001 \
  --tokens USDC,CASH \
  --capabilities "real-time,historical,forecasts" \
  --tags "weather,climate,api"

⠋ Registering service...
✓ Service registered successfully

Service Details:
  URL: https://api.example.com/weather
  Name: Weather API
  Category: Data Analytics
  Price: 0.001 USDC per call
  Accepted Tokens: USDC, CASH
  Service ID: svc_abc123xyz
  Registry URL: https://registry.x402.network/services/svc_abc123xyz
```

**Interactive Mode:**

```bash
x402 enable https://api.example.com

? Service name: Weather API
? Service description: Real-time weather data
? Service category:
  ❯ AI & ML
    Data Analytics
    Blockchain Data
    Content Generation
    Research
    Computation
    Other
? Price per call (USDC): 0.001
? Enable TAP authentication? Yes
```

---

### `x402 discover`

Discover and browse available paid services.

**Usage:**
```bash
x402 discover [options]
```

**Options:**
- `-q, --query <query>` - Search query
- `-c, --category <category>` - Filter by category
- `--max-price <price>` - Maximum price per call
- `--min-reputation <score>` - Minimum reputation score (0-10000)
- `--min-uptime <percentage>` - Minimum uptime percentage
- `--sort <field>` - Sort by: `price`, `reputation`, `value`, `recent` (default: value)
- `-l, --limit <number>` - Limit results (default: 10)

**Examples:**

```bash
# Browse all services
x402 discover

# Search for AI services
x402 discover --query "AI inference" --category "AI & ML"

# Find cheap, reliable services
x402 discover --max-price 0.01 --min-reputation 5000 --min-uptime 99

# Sort by price
x402 discover --sort price --limit 20

# High-reputation services only
x402 discover --min-reputation 8000 --sort reputation
```

**Output:**

```
⠋ Searching services...
✓ Found 47 services

┌─────────────────────────┬────────────────┬───────────┬────────────┬─────────┬────────┐
│ Name                    │ Category       │ Price     │ Reputation │ Uptime  │ Rating │
├─────────────────────────┼────────────────┼───────────┼────────────┼─────────┼────────┤
│ GPT-4 Inference         │ AI & ML        │ $0.002000 │ 8500/10000 │ 99.9%   │ 4.8    │
│ Weather Oracle          │ Data Analytics │ $0.000500 │ 7200/10000 │ 99.5%   │ 4.6    │
│ Blockchain Analytics    │ Blockchain Data│ $0.001500 │ 9100/10000 │ 99.8%   │ 4.9    │
│ Sentiment Analysis      │ AI & ML        │ $0.001000 │ 6800/10000 │ 98.2%   │ 4.3    │
└─────────────────────────┴────────────────┴───────────┴────────────┴─────────┴────────┘
```

---

### `x402 test`

Test a service's payment flow end-to-end.

**Usage:**
```bash
x402 test <service-url> [options]
```

**Arguments:**
- `<service-url>` - Service URL to test

**Options:**
- `--method <method>` - HTTP method (GET, POST, default: GET)
- `--data <json>` - Request body for POST/PUT
- `--headers <json>` - Additional headers
- `--dry-run` - Test without actually sending payment

**Examples:**

```bash
# Test GET endpoint
x402 test https://api.example.com/weather

# Test POST endpoint with data
x402 test https://api.example.com/analyze \
  --method POST \
  --data '{"text":"Hello world"}'

# Dry run (no payment sent)
x402 test https://api.example.com/weather --dry-run
```

**Output:**

```
⠋ Testing service...

Step 1: Initial Request (No Payment)
  → GET https://api.example.com/weather
  ← 402 Payment Required

Payment Requirements:
  Network: solana-devnet
  Asset: USDC
  Amount: 0.001000 (1000 micro-USDC)
  Recipient: 9xKm...7pQz
  Timeout: 300000ms

Step 2: Creating Payment Transaction
  From: 8rKw...xY9z
  To: 9xKm...7pQz
  Amount: 0.001 USDC
  ⠋ Signing transaction...
  ⠋ Sending transaction...
  ✓ Transaction confirmed
  Signature: 5jK9m...3nWx

Step 3: Retry Request with Payment Proof
  → GET https://api.example.com/weather
    Headers: X-Payment: eyJ0eXAi...
  ← 200 OK

Response:
{
  "temperature": 72,
  "condition": "sunny",
  "humidity": 65,
  "location": "San Francisco"
}

✓ Test successful
  Total time: 2.3s
  Payment: 0.001 USDC
  Transaction: https://explorer.solana.com/tx/5jK9m...3nWx?cluster=devnet
```

---

### `x402 pay`

Make a direct payment to a service.

**Usage:**
```bash
x402 pay <service-url> [options]
```

**Options:**
- `--amount <amount>` - Payment amount
- `--token <token>` - Payment token (USDC, CASH, SOL)
- `--method <method>` - HTTP method (default: GET)
- `--data <json>` - Request body

**Example:**

```bash
x402 pay https://api.example.com/premium \
  --amount 0.05 \
  --token USDC \
  --method GET
```

---

### `x402 earnings`

View earnings from your registered services.

**Usage:**
```bash
x402 earnings [options]
```

**Options:**
- `--service <service-id>` - Filter by service ID
- `--period <period>` - Time period: `day`, `week`, `month`, `all` (default: all)
- `--format <format>` - Output format: `table`, `json`, `csv` (default: table)

**Examples:**

```bash
# View all earnings
x402 earnings

# Monthly earnings
x402 earnings --period month

# Specific service
x402 earnings --service svc_abc123

# Export to CSV
x402 earnings --format csv > earnings.csv
```

**Output:**

```
⠋ Fetching earnings...
✓ Earnings retrieved

Period: All Time
Total Revenue: 12.450 USDC

┌──────────────┬───────────┬────────────┬──────────┬──────────┐
│ Service      │ Calls     │ Revenue    │ Avg/Call │ Token    │
├──────────────┼───────────┼────────────┼──────────┼──────────┤
│ Weather API  │ 8,423     │ 8.423 USDC │ 0.001    │ USDC     │
│ Sentiment AI │ 2,014     │ 4.027 USDC │ 0.002    │ USDC     │
└──────────────┴───────────┴────────────┴──────────┴──────────┘

Recent Transactions (Last 10):
┌────────────────────────┬──────────────┬─────────┬───────────┐
│ Time                   │ Service      │ Amount  │ From      │
├────────────────────────┼──────────────┼─────────┼───────────┤
│ 2024-11-13 14:32:15   │ Weather API  │ 0.001   │ 7mQp...   │
│ 2024-11-13 14:28:43   │ Sentiment AI │ 0.002   │ 3nKx...   │
│ 2024-11-13 14:15:22   │ Weather API  │ 0.001   │ 9rLm...   │
└────────────────────────┴──────────────┴─────────┴───────────┘
```

---

### `x402 deploy`

Generate middleware code for popular frameworks.

**Usage:**
```bash
x402 deploy [options]
```

**Options:**
- `--framework <framework>` - Target framework: `express`, `fastify`, `nextjs`, `koa`, `nestjs`
- `--output <directory>` - Output directory (default: ./x402-middleware)
- `--language <lang>` - Language: `typescript`, `javascript` (default: typescript)
- `--with-examples` - Include example endpoints

**Examples:**

```bash
# Generate Express middleware
x402 deploy --framework express --output ./middleware

# Generate Next.js middleware with examples
x402 deploy --framework nextjs --with-examples

# Generate JavaScript version
x402 deploy --framework fastify --language javascript
```

**Output:**

```
⠋ Generating middleware code...
✓ Code generated successfully

Generated files:
  ./x402-middleware/
    ├── middleware.ts          # X402 middleware
    ├── config.ts              # Configuration
    ├── types.ts               # TypeScript types
    ├── examples/
    │   ├── basic-usage.ts     # Basic example
    │   └── advanced-usage.ts  # Advanced example
    ├── package.json           # Dependencies
    ├── tsconfig.json          # TypeScript config
    └── README.md              # Usage instructions

Next steps:
  1. cd ./x402-middleware
  2. npm install
  3. Configure environment variables in .env
  4. Import middleware in your app
```

---

### `x402 config`

Manage CLI configuration.

#### `x402 config show`

Display current configuration.

```bash
x402 config show

Configuration:
  Network: devnet
  RPC URL: https://api.devnet.solana.com
  Wallet: 8rKw...xY9z
  Registry URL: https://registry.x402.network
  Config Path: /home/user/.config/x402-upl/config.json

TAP Configuration:
  Enabled: Yes
  Key ID: ed25519_8rKw7xY9
  Algorithm: ed25519
  DID: did:x402:8rKw7xY9z4m2
```

#### `x402 config set`

Update configuration value.

```bash
x402 config set <key> <value>

# Examples
x402 config set network mainnet-beta
x402 config set rpcUrl https://api.mainnet-beta.solana.com
```

#### `x402 config reset`

Reset configuration to defaults.

```bash
x402 config reset

? Are you sure you want to reset configuration? (y/N) y
✓ Configuration reset
```

---

### `x402 wallet`

Manage Solana wallet.

#### `x402 wallet show`

Display wallet information.

```bash
x402 wallet show

Wallet Information:
  Public Key: 8rKw7xY9z4m2pQnT3vRx1sWc6hLk9jNa5bKt8dMf2yXu
  Balance: 5.234 SOL
  Network: devnet

Token Balances:
  USDC: 100.000000
  CASH: 50.000000
```

#### `x402 wallet airdrop`

Request SOL airdrop (devnet/testnet only).

```bash
x402 wallet airdrop [amount]

# Request 1 SOL
x402 wallet airdrop 1

⠋ Requesting airdrop...
✓ Airdrop successful
  Amount: 1.0 SOL
  New Balance: 6.234 SOL
```

---

### `x402 verify`

Verify service payment integration.

**Usage:**
```bash
x402 verify <service-url> [options]
```

**Options:**
- `--check-endpoints` - Verify all registered endpoints
- `--check-pricing` - Verify pricing matches registry
- `--check-auth` - Verify TAP authentication if enabled

**Example:**

```bash
x402 verify https://api.example.com

⠋ Verifying service...

Checks:
  ✓ Service is registered
  ✓ URL is accessible
  ✓ Returns 402 for unpaid requests
  ✓ Accepts payment proofs
  ✓ Pricing matches registry
  ✓ TAP authentication working
  ✓ Replay protection enabled

✓ Service verification passed (7/7 checks)
```

## Configuration

### Config File Location

```bash
~/.config/x402-upl/config.json
```

### Config Structure

```json
{
  "network": "devnet",
  "rpcUrl": "https://api.devnet.solana.com",
  "walletPath": "/home/user/.config/solana/id.json",
  "registryUrl": "https://registry.x402.network",
  "tapKeyId": "ed25519_8rKw7xY9",
  "tapAlgorithm": "ed25519",
  "tapPrivateKeyPath": "/home/user/.config/x402-upl/keys/ed25519_8rKw7xY9.private",
  "did": "did:x402:8rKw7xY9z4m2"
}
```

### Environment Variables

```bash
# Override network
X402_NETWORK=mainnet-beta

# Override RPC URL
X402_RPC_URL=https://api.mainnet-beta.solana.com

# Override wallet path
X402_WALLET_PATH=/path/to/wallet.json

# Override registry URL
X402_REGISTRY_URL=https://custom-registry.com
```

## Examples

### Example 1: Complete Service Setup

Register and enable a new service:

```bash
# 1. Initialize
x402 init --network devnet

# 2. Register as agent
x402 register --stake 0.5 --name "Weather Service Provider"

# 3. Setup TAP auth
x402 tap init --alg ed25519

# 4. Enable service
x402 enable https://api.weather.example.com \
  --name "Global Weather API" \
  --description "Real-time weather data for 10M+ locations" \
  --category "Data Analytics" \
  --price 0.001 \
  --tokens USDC,CASH \
  --with-tap \
  --capabilities "real-time,historical,forecasts,alerts" \
  --tags "weather,climate,meteorology"

# 5. Generate middleware
x402 deploy --framework express --with-examples

# 6. Verify setup
x402 verify https://api.weather.example.com

# 7. Test payment flow
x402 test https://api.weather.example.com/current?city=SF
```

### Example 2: Service Discovery and Testing

Find and test services:

```bash
# Discover AI services under 0.01 USDC
x402 discover \
  --category "AI & ML" \
  --max-price 0.01 \
  --min-reputation 5000 \
  --sort value \
  --limit 5

# Test top service
x402 test https://api.ai-service.com/inference \
  --method POST \
  --data '{"prompt":"Explain quantum computing","max_tokens":500}'
```

### Example 3: Earnings Monitoring

Track revenue:

```bash
# View monthly earnings
x402 earnings --period month

# Export detailed report
x402 earnings --format json > earnings-report.json

# Specific service performance
x402 earnings --service svc_abc123 --period week
```

### Example 4: Multi-Service Provider

Manage multiple services:

```bash
# Enable first service
x402 enable https://api.example.com/weather \
  --name "Weather API" \
  --price 0.001

# Enable second service
x402 enable https://api.example.com/sentiment \
  --name "Sentiment Analysis" \
  --price 0.002

# Enable third service
x402 enable https://api.example.com/translate \
  --name "Translation API" \
  --price 0.0015

# View all earnings
x402 earnings
```

### Example 5: Production Deployment

Deploy to production:

```bash
# Switch to mainnet
x402 init --network mainnet-beta --rpc-url $MAINNET_RPC_URL

# Import production wallet
x402 wallet import --path ./production-wallet.json

# Register with higher stake
x402 register --stake 10.0 --name "Production Service"

# Enable service
x402 enable https://api.production.com \
  --name "Production API" \
  --category "AI & ML" \
  --price 0.05 \
  --tokens USDC \
  --with-tap

# Verify everything works
x402 verify https://api.production.com --check-endpoints --check-auth
```

## Troubleshooting

### Wallet Not Found

**Error**: `No wallet found. Run "x402 register" first.`

**Solution**:
```bash
# Initialize and create wallet
x402 init

# Or import existing wallet
x402 init --import ~/.config/solana/id.json
```

### Insufficient Balance

**Error**: `Insufficient balance for transaction`

**Solution**:
```bash
# Check balance
x402 wallet show

# Request airdrop (devnet/testnet only)
x402 wallet airdrop 1

# Or fund wallet from exchange/faucet
```

### TAP Configuration Error

**Error**: `TAP configuration not found`

**Solution**:
```bash
# Initialize TAP
x402 tap init

# Verify configuration
x402 tap verify

# Show current config
x402 tap show
```

### Service Registration Failed

**Error**: `Service registration failed: Network error`

**Solution**:
```bash
# Check network connectivity
ping registry.x402.network

# Verify RPC endpoint
x402 config show

# Try different RPC
x402 config set rpcUrl https://api.devnet.solana.com

# Retry registration
x402 enable <url> --name "Service" ...
```

### Payment Test Failed

**Error**: `Payment verification failed: Transaction not found`

**Solution**:
```bash
# Increase timeout
x402 test <url> --timeout 60000

# Check service is registered
x402 verify <url>

# Test with dry run first
x402 test <url> --dry-run

# Check wallet has sufficient tokens
x402 wallet show
```

### Permission Denied (TAP Keys)

**Error**: `EACCES: permission denied, open '...keys/ed25519_*.private'`

**Solution**:
```bash
# Fix key permissions
chmod 600 ~/.config/x402-upl/keys/*.private
chmod 644 ~/.config/x402-upl/keys/*.public

# Verify
ls -la ~/.config/x402-upl/keys/
```

### Config Not Found

**Error**: `Configuration file not found`

**Solution**:
```bash
# Re-initialize
x402 init

# Or manually create config directory
mkdir -p ~/.config/x402-upl

# Then initialize
x402 init
```

### Network Mismatch

**Error**: `Transaction not found on blockchain`

**Cause**: Client using devnet, service expecting mainnet (or vice versa)

**Solution**:
```bash
# Check current network
x402 config show

# Switch network
x402 config set network devnet  # or mainnet-beta

# Verify service network
x402 verify <service-url>
```

## Best Practices

### 1. Use Environment Variables for Production

```bash
# .env
X402_NETWORK=mainnet-beta
X402_RPC_URL=https://api.mainnet-beta.solana.com
X402_WALLET_PATH=/secure/path/to/wallet.json

# Load in scripts
source .env
x402 enable https://api.prod.com ...
```

### 2. Secure Private Keys

```bash
# Store TAP keys securely
chmod 600 ~/.config/x402-upl/keys/*.private

# Never commit keys to git
echo ".config/x402-upl/keys/*.private" >> .gitignore

# Backup keys
cp ~/.config/x402-upl/keys/*.private /secure/backup/location/
```

### 3. Test on Devnet First

```bash
# Always test on devnet before mainnet
x402 init --network devnet
x402 test <service-url>

# Then deploy to mainnet
x402 init --network mainnet-beta
x402 enable <service-url> ...
```

### 4. Monitor Earnings Regularly

```bash
# Set up cron job for daily earnings reports
crontab -e

# Add:
0 9 * * * x402 earnings --period day --format json > /var/log/x402-earnings-$(date +\%Y-\%m-\%d).json
```

### 5. Use Service Verification

```bash
# Verify before announcing service
x402 verify https://api.example.com \
  --check-endpoints \
  --check-pricing \
  --check-auth

# Re-verify after updates
x402 verify https://api.example.com
```

### 6. Automate Service Registration

```bash
#!/bin/bash
# register-services.sh

SERVICES=(
  "https://api.example.com/weather:Weather API:0.001"
  "https://api.example.com/sentiment:Sentiment:0.002"
  "https://api.example.com/translate:Translate:0.0015"
)

for service in "${SERVICES[@]}"; do
  IFS=':' read -r url name price <<< "$service"
  x402 enable "$url" \
    --name "$name" \
    --price "$price" \
    --category "Data Analytics" \
    --tokens USDC,CASH
done
```

## Integration with X402

### Service Registration Flow

1. **CLI Registration**: `x402 enable` registers service metadata in registry
2. **On-Chain Record**: Creates service account on Solana
3. **Discovery**: Service appears in `x402 discover` results
4. **Payments**: Clients can pay using X402 SDK or CLI

### TAP Authentication Integration

TAP signatures can be used with any HTTP client:

```bash
# Generate signature
SIGNATURE=$(x402 tap sign "GET /weather HTTP/1.1")

# Use in curl
curl https://api.example.com/weather \
  -H "Authorization: TAP keyId=\"ed25519_abc\", signature=\"$SIGNATURE\""
```

### Earnings Settlement

Earnings are tracked on-chain and settled via facilitator:

```bash
# View pending settlements
x402 earnings --format json | jq '.pending_settlements'

# Trigger settlement (if facilitator configured)
x402 settle --service svc_abc123
```

## Related Documentation

- [X042 Core Middleware](./x042-middleware.md) - Server-side payment middleware
- [JavaScript SDK](../sdks/javascript.md) - Client SDK for consuming services
- [MCP Bridge](./mcp-bridge.md) - Claude Desktop integration
- [Service Provider](./service-provider.md) - Building x402 services
- [Registry API](../infrastructure/registry.md) - Service registry

## Support

- [GitHub Repository](https://github.com/collinsville22/x402-upl)
- [GitHub Issues](https://github.com/collinsville22/x402-upl/issues)
- [Documentation](https://collinsville22.github.io/x402-upl/)
