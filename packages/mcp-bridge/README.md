# x402 MCP Server - CORRECT IMPLEMENTATION

Production MCP server with x402 payment protocol integration for Claude.

---

## What This Does

Exposes x402-enabled services as MCP tools for Claude Desktop. Claude can:
- Discover paid services from Bazaar
- Automatically pay for API calls in USDC
- Chain multiple paid services together
- All payments handled transparently

---

## Changes from Old Implementation

### ❌ Old (Wrong)
```typescript
private async createPayment(requirements: any): Promise<string> {
  throw new Error('Payment creation must be handled by MCP client');
}
```

### ✅ New (Correct)
```typescript
this.httpClient = withPaymentInterceptor(axios.create(), walletClient, {
  facilitatorUrl: config.facilitatorUrl,
});
```

**Result**: Automatic payment handling via x402-axios

---

## Architecture

```
┌─────────────────┐
│  Claude Desktop │
└────────┬────────┘
         │ MCP Protocol
         ▼
┌─────────────────┐
│ x402 MCP Server │
│ - x402-axios    │
│ - Wallet signer │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌─────────┐ ┌─────────────┐
│ Bazaar  │ │ x402        │
│ API     │ │ Services    │
└─────────┘ │ (402 APIs)  │
            └─────────────┘
```

---

## Setup

### 1. Environment Variables

```bash
PRIVATE_KEY=0xYourPrivateKey
NETWORK=base-sepolia
FACILITATOR_URL=https://x402.org/facilitator
BAZAAR_URL=https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources
```

### 2. Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "x402-services": {
      "command": "node",
      "args": ["dist/server-correct.js"],
      "cwd": "/path/to/x402-upl/packages/mcp-bridge",
      "env": {
        "PRIVATE_KEY": "0xYourPrivateKey",
        "NETWORK": "base-sepolia",
        "FACILITATOR_URL": "https://x402.org/facilitator"
      }
    }
  }
}
```

### 3. Build & Run

```bash
npm install
npm run build
npm start
```

---

## How It Works

### Tool Discovery

1. **Server starts** → Fetches services from Bazaar API
2. **Services cached** → Map of all available x402 services
3. **Tools exposed** → Each service becomes an MCP tool
4. **Auto-refresh** → Updates every 60 seconds

### Tool Execution

**Claude**: "Get weather data"

**MCP Server**:
1. Identifies weather service tool
2. Calls service URL with x402-axios
3. x402-axios detects 402 response
4. Automatically signs payment
5. Retries with X-PAYMENT header
6. Returns data to Claude

**Claude**: Receives weather data (payment transparent)

---

## Example Tools

After connecting to Bazaar, Claude sees tools like:

```
🔧 api_example_com_weather
   Get current weather data
   Cost: $0.001000
   Network: base-sepolia
   Method: GET

🔧 api_service_io_sentiment
   Analyze text sentiment
   Cost: $0.002000
   Network: base-sepolia
   Method: POST
```

---

## Usage in Claude

**User**: "What's the weather in NYC and what's the sentiment of 'AI is awesome'?"

**Claude** (automatically):
1. Calls `api_example_com_weather` → Pays $0.001
2. Calls `api_service_io_sentiment` → Pays $0.002
3. Aggregates results
4. Responds to user

**Total spend**: $0.003 in USDC

---

## Key Features

### Automatic Payment Handling

x402-axios intercept handles:
- 402 detection
- EIP-3009 signature generation
- X-PAYMENT header construction
- Request retry with payment
- Transaction confirmation

### Bazaar Integration

Real-time service discovery:
- Fetches from CDP Bazaar API
- Updates every 60 seconds
- Exposes all available services
- Includes pricing, network, schemas

### Production Ready

- Error handling for failed payments
- Service unavailability handling
- Wallet balance validation
- Transaction retry logic
- Comprehensive logging

---

## Comparison with Old Implementation

| Feature | Old | New |
|---------|-----|-----|
| Payment handling | Throws error | Automatic via x402-axios |
| Service discovery | Custom registry | Official Bazaar API |
| 402 detection | Manual | Automatic interceptor |
| Facilitator | None | x402.org or CDP |
| Signatures | None | EIP-3009 |
| Working | No | Yes |

---

## Testing

### 1. Test Service Discovery

```bash
npm run dev
```

Check logs for:
```
Refreshed X services from Bazaar
x402 MCP Server started
Wallet: 0xYourAddress
Network: base-sepolia
```

### 2. Test with Claude

Ask Claude:
- "List available paid services"
- "Use the weather service to get data for NYC"
- "What tools do you have access to?"

### 3. Verify Payments

Check wallet balance before/after:
```bash
# Balance should decrease by service costs
```

---

## Troubleshooting

### No tools showing in Claude

- Check Bazaar URL is accessible
- Verify services are publishing to Bazaar
- Check server logs for refresh errors

### Payment failures

- Verify wallet has USDC
- Check private key is correct
- Ensure network matches (base-sepolia vs base)
- Verify facilitator URL

### Claude can't call tools

- Check Claude config JSON is valid
- Restart Claude Desktop after config changes
- Verify MCP server is running
- Check server logs for errors

---

## Bounty Alignment

### MCP Server Track ($10k)

✅ Official MCP SDK integration
✅ x402 protocol implementation
✅ Automatic payment handling
✅ Bazaar discovery integration
✅ Claude Desktop ready
✅ Production error handling
✅ Complete documentation

---

## Next Steps

1. **Deploy Services**: Create x402-enabled APIs for Claude to use
2. **Test Workflows**: Multi-step agent tasks with payments
3. **Monitor Usage**: Track payments and service calls
4. **Optimize Costs**: Cache results, batch requests

---

## License

MIT
