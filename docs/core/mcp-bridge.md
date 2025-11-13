# X402 MCP Bridge

Model Context Protocol (MCP) server enabling Claude Desktop to discover and interact with x402 payment-gated services on Solana with transparent payment automation.

## Overview

The X402 MCP Bridge connects Claude Desktop to the x402 ecosystem, allowing Claude to autonomously discover services, execute payments, and chain multiple API calls together. All payment processing happens transparently in the background using Solana micropayments.

**Key Benefits:**
- **Zero-Configuration Payments**: Claude automatically handles HTTP 402 responses
- **Service Discovery**: Browse all x402 services directly from Claude Desktop
- **Tool Generation**: Each service becomes an available tool for Claude
- **Payment Tracking**: View payment history and spending metrics
- **Wallet Management**: Check balances and transaction status

This enables Claude to use paid services naturally in conversations without manual payment intervention.

## Features

### Automatic Service Discovery
- Fetches available services from x402 registry
- Periodic refresh (configurable interval)
- Service metadata caching
- Category and price filtering

### Payment Automation
- Transparent HTTP 402 handling
- Automatic Solana transaction creation
- Payment proof generation
- Retry logic with exponential backoff

### Tool Exposure
- Each service exposed as MCP tool
- Dynamic tool schema generation
- Parameter validation
- Response formatting

### Wallet Integration
- Solana wallet management
- SOL, USDC, CASH token support
- Balance checking
- Transaction history

### Metrics & Monitoring
- Total spending tracking
- Per-service cost analysis
- Success/failure rates
- Latency monitoring

## Architecture

```
┌──────────────────────────────────────────────────────┐
│              Claude Desktop                          │
│  ┌────────────────────────────────────────────────┐  │
│  │  User: "Get weather for San Francisco"        │  │
│  └────────────┬───────────────────────────────────┘  │
│               │ MCP Protocol                         │
└───────────────┼──────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────┐
│          X402 MCP Server                             │
│  ┌──────────────────────────────────────────────┐   │
│  │ Service Registry                             │   │
│  │ - Weather API ($0.001 USDC)                  │   │
│  │ - Sentiment Analysis ($0.002 USDC)           │   │
│  │ - Translation ($0.0015 USDC)                 │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ Payment Handler                              │   │
│  │ 1. Detect 402 response                       │   │
│  │ 2. Create Solana transaction                 │   │
│  │ 3. Sign with wallet                          │   │
│  │ 4. Submit to network                         │   │
│  │ 5. Retry with payment proof                  │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ Metrics Tracker                              │   │
│  │ - Total spent: $0.145 USDC                   │   │
│  │ - Successful: 127 payments                   │   │
│  │ - Failed: 3 payments                         │   │
│  └──────────────────────────────────────────────┘   │
└───────────────┬──────────────────────────────────────┘
                │ HTTP 402 + Payment
┌───────────────▼──────────────────────────────────────┐
│          X402 Services (Solana)                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │
│  │ Weather API │ │ Sentiment   │ │ Translation │    │
│  │ 0.001 USDC  │ │ 0.002 USDC  │ │ 0.0015 USDC │    │
│  └─────────────┘ └─────────────┘ └─────────────┘    │
└──────────────────────────────────────────────────────┘
```

## Installation

### Prerequisites

- Node.js 20.0.0 or higher
- Claude Desktop installed
- Solana wallet with devnet/mainnet SOL

### Install Dependencies

```bash
cd packages/mcp-bridge
npm install
```

### Build

```bash
npm run build
```

## Configuration

### Environment Variables

Create `.env` file:

```bash
# Solana Wallet (base58 encoded private key)
WALLET_PRIVATE_KEY=your_base58_private_key_here

# Network Configuration
SOLANA_NETWORK=devnet                        # or mainnet-beta
SOLANA_RPC_URL=https://api.devnet.solana.com

# X402 Registry
X402_REGISTRY_URL=https://registry.x402.network
X402_FACILITATOR_URL=https://facilitator.x402.network

# Service Refresh Interval (seconds)
REFRESH_INTERVAL=60

# Logging
LOG_LEVEL=info                               # debug, info, warn, error
```

### Generate Wallet

If you don't have a Solana wallet:

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Generate new wallet
solana-keygen new --outfile ~/x402-wallet.json

# Get private key in base58
solana-keygen pubkey ~/x402-wallet.json
# Copy the base58 private key to .env
```

### Fund Wallet (Devnet)

```bash
# Get wallet address
solana address -k ~/x402-wallet.json

# Request airdrop
solana airdrop 1 <YOUR_ADDRESS> --url devnet
```

## Claude Desktop Setup

### macOS Configuration

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "x402": {
      "command": "node",
      "args": ["/absolute/path/to/x402-upl/packages/mcp-bridge/dist/solana-mcp-server.js"],
      "env": {
        "WALLET_PRIVATE_KEY": "your_base58_private_key",
        "SOLANA_NETWORK": "devnet",
        "SOLANA_RPC_URL": "https://api.devnet.solana.com",
        "X402_REGISTRY_URL": "https://registry.x402.network",
        "REFRESH_INTERVAL": "60",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Windows Configuration

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "x402": {
      "command": "node",
      "args": ["C:\\path\\to\\x402-upl\\packages\\mcp-bridge\\dist\\solana-mcp-server.js"],
      "env": {
        "WALLET_PRIVATE_KEY": "your_base58_private_key",
        "SOLANA_NETWORK": "devnet",
        "SOLANA_RPC_URL": "https://api.devnet.solana.com",
        "X402_REGISTRY_URL": "https://registry.x402.network"
      }
    }
  }
}
```

### Linux Configuration

Edit `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "x402": {
      "command": "node",
      "args": ["/home/user/x402-upl/packages/mcp-bridge/dist/solana-mcp-server.js"],
      "env": {
        "WALLET_PRIVATE_KEY": "your_base58_private_key",
        "SOLANA_NETWORK": "devnet"
      }
    }
  }
}
```

## Usage

### Starting the Server

The MCP server starts automatically when Claude Desktop launches. You can also test it standalone:

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### Using Services in Claude

Once configured, simply ask Claude to use x402 services:

**Example 1: Weather Query**
```
User: Get the current weather for San Francisco

Claude: I'll use the weather service to get that information for you.
[Automatically pays 0.001 USDC]

The current weather in San Francisco is 72°F, sunny with 65% humidity.
```

**Example 2: Sentiment Analysis**
```
User: Analyze the sentiment of this review: "Amazing product, highly recommend!"

Claude: Let me analyze that for you.
[Automatically pays 0.002 USDC]

Sentiment: Positive
Score: 0.95
Confidence: High
```

**Example 3: Multi-Service Chain**
```
User: Get weather for NYC, analyze if it's good for outdoor activities, then translate your recommendation to Spanish

Claude: I'll use three services to help with that.
[Pays for weather service: 0.001 USDC]
[Pays for analysis service: 0.002 USDC]
[Pays for translation service: 0.0015 USDC]

Weather: 78°F, partly cloudy
Analysis: Excellent conditions for outdoor activities
Spanish: "Excelentes condiciones para actividades al aire libre"
```

### Available MCP Resources

The server exposes several resources Claude can access:

#### Service Catalog

```
Resource: x402://services/catalog
Description: Browse all available x402 services
```

Claude can ask: "Show me all available x402 services"

#### Payment History

```
Resource: x402://payments/history
Description: View past payments and spending
```

Claude can ask: "Show my x402 payment history"

#### Wallet Status

```
Resource: x402://wallet/status
Description: Check wallet balance and address
```

Claude can ask: "What's my x402 wallet balance?"

#### Spending Metrics

```
Resource: x402://metrics/spending
Description: Analyze spending patterns
```

Claude can ask: "How much have I spent on x402 services?"

## API Reference

### SolanaMCPServer

Main MCP server class.

```typescript
class SolanaMCPServer {
  constructor(config: MCPConfig);

  // Start the server
  async run(): Promise<void>;

  // Refresh service registry
  async refreshServices(): Promise<void>;

  // Make payment request
  async makePaymentRequest(
    url: string,
    method: string,
    params: unknown
  ): Promise<any>;
}
```

### MCPConfig

Configuration interface:

```typescript
interface MCPConfig {
  privateKey: Uint8Array;                           // Wallet private key
  network: 'mainnet-beta' | 'devnet' | 'testnet';  // Solana network
  facilitatorUrl: string;                           // Facilitator API URL
  registryUrl: string;                              // Registry API URL
  serviceRefreshInterval: number;                   // Refresh interval (ms)
}
```

### X402Service

Service metadata:

```typescript
interface X402Service {
  id: string;                    // Unique service ID
  name: string;                  // Display name
  description: string;           // Service description
  resource: string;              // API endpoint URL
  method?: string;               // HTTP method (default: GET)
  pricing?: {
    amount: string;              // Price in token units
    asset: string;               // Token type (USDC, CASH, SOL)
    network: string;             // Solana network
  };
}
```

## Examples

### Example 1: Service Discovery

Ask Claude to discover services:

```
User: What x402 services are available?

Claude: Here are the available x402 services:

1. Weather API ($0.001 USDC)
   - Real-time weather data for any location

2. Sentiment Analysis ($0.002 USDC)
   - AI-powered sentiment analysis

3. Translation API ($0.0015 USDC)
   - Multi-language translation

4. Price Oracle ($0.0005 USDC)
   - Cryptocurrency price data

Would you like me to use any of these services?
```

### Example 2: Automatic Payment

Claude handles payments automatically:

```
User: What's the weather in Tokyo?

Claude: [Internal process]:
1. Discovers weather service
2. Sees 402 Payment Required
3. Creates Solana transaction (0.001 USDC)
4. Signs with wallet
5. Submits transaction
6. Retries request with payment proof
7. Returns result

The weather in Tokyo is 68°F with light rain.
```

### Example 3: Cost Tracking

Track spending:

```
User: How much have I spent on x402 services today?

Claude: Today's x402 Spending:
- Weather API: $0.015 USDC (15 calls)
- Sentiment Analysis: $0.008 USDC (4 calls)
- Translation: $0.003 USDC (2 calls)

Total: $0.026 USDC across 21 service calls
```

### Example 4: Multi-Step Workflow

Complex workflows with multiple services:

```
User: Research the top 3 AI trends, analyze sentiment around each, and summarize in Spanish

Claude: [Executes workflow]:
1. Research Service → 3 queries ($0.003 USDC)
2. Sentiment Analysis → 3 analyses ($0.006 USDC)
3. Translation Service → 1 translation ($0.0015 USDC)

Total cost: $0.0105 USDC

[Returns comprehensive analysis in Spanish]
```

## Troubleshooting

### Server Not Starting

**Error**: MCP server not appearing in Claude Desktop

**Solution**:
1. Check Claude Desktop logs:
   - macOS: `~/Library/Logs/Claude/mcp*.log`
   - Windows: `%APPDATA%\Claude\logs\`

2. Verify configuration path is absolute
3. Test server manually: `npm start`
4. Check Node.js version: `node --version` (must be 20+)

### Wallet Issues

**Error**: `Insufficient balance for transaction`

**Solution**:
```bash
# Check balance
solana balance <YOUR_ADDRESS> --url devnet

# Request airdrop (devnet only)
solana airdrop 1 <YOUR_ADDRESS> --url devnet
```

### Service Discovery Fails

**Error**: No services found

**Solution**:
1. Check registry URL: `curl https://registry.x402.network/health`
2. Verify network connectivity
3. Check refresh interval setting
4. Manually trigger refresh by restarting Claude Desktop

### Payment Failures

**Error**: Payment transaction failed

**Solution**:
1. Check RPC endpoint is responding
2. Verify sufficient token balance
3. Increase transaction timeout
4. Check Solana network status

### Tool Not Available

**Error**: Claude says service tool doesn't exist

**Solution**:
1. Wait for service refresh (default: 60 seconds)
2. Restart Claude Desktop
3. Check server logs for errors
4. Verify service is registered in registry

## Security

### Private Key Management

**Never** commit private keys to version control:

```bash
# .gitignore
.env
*.json
**/dist/
```

Store private key securely:

```bash
# Use environment variable
export WALLET_PRIVATE_KEY=$(cat ~/x402-wallet.json | jq -r '.[0:32]' | base58)

# Or use encrypted storage
gpg -c ~/x402-wallet.json
```

### Spending Limits

Implement spending limits in code:

```typescript
const MAX_DAILY_SPEND = 10.0; // USDC
const MAX_PER_SERVICE = 1.0;  // USDC

if (metrics.totalSpent > MAX_DAILY_SPEND) {
  throw new Error('Daily spending limit reached');
}
```

### Network Security

Use secure RPC endpoints:

```bash
# ❌ Bad: Public RPC (rate limited, unreliable)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# ✅ Good: Private RPC with API key
SOLANA_RPC_URL=https://your-project.rpcpool.com/api-key
```

## Performance

### Service Caching

Services are cached and refreshed periodically:

```typescript
// Default: 60 seconds
REFRESH_INTERVAL=60

// Production: 5 minutes
REFRESH_INTERVAL=300

// Development: 30 seconds
REFRESH_INTERVAL=30
```

### Payment Optimization

Batch multiple requests when possible:

```typescript
// Instead of 3 separate payments
await Promise.all([
  service1.call(),
  service2.call(),
  service3.call(),
]);
```

### Latency Monitoring

Check average latency:

```
User: What's the average response time for x402 services?

Claude: Average Latency Metrics:
- Weather API: 234ms
- Sentiment Analysis: 1,203ms
- Translation: 456ms
- Overall Average: 631ms
```

## Integration with X402

### Service Registration

For service providers, register your service:

```bash
x402 enable https://api.example.com \
  --name "My Service" \
  --category "AI & ML" \
  --price 0.001
```

Your service will automatically appear in Claude Desktop.

### Payment Flow

1. **Service Call**: Claude calls your service
2. **402 Response**: Your service returns payment requirements
3. **Payment**: MCP server creates Solana transaction
4. **Verification**: Your service verifies on-chain
5. **Data Response**: Your service returns requested data

### Webhook Integration

Receive payment notifications:

```typescript
// Your service webhook endpoint
app.post('/webhooks/x402-payment', (req, res) => {
  const { signature, amount, from } = req.body;

  // Verify payment
  // Update database
  // Send notification

  res.sendStatus(200);
});
```

## Related Documentation

- [X042 Core Middleware](./x042-middleware.md) - Server-side middleware
- [CLI Tool](./cli.md) - Service management
- [JavaScript SDK](../sdks/javascript.md) - Client library
- [Service Provider Guide](./service-provider.md) - Building services

## Support

- [GitHub Repository](https://github.com/collinsville22/x402-upl)
- [GitHub Issues](https://github.com/collinsville22/x402-upl/issues)
- [MCP Protocol Docs](https://modelcontextprotocol.io/docs)
