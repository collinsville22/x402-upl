# X402 MCP Server

Model Context Protocol (MCP) server enabling Claude Desktop to discover and interact with x402 payment-gated services on Solana.

## Overview

This MCP server bridges Claude Desktop with the x402 ecosystem, allowing Claude to autonomously discover services, handle micropayments, and chain multiple API calls together. All payment processing happens transparently through the x402 protocol.

## Features

- **Service Discovery**: Automatic discovery of x402-enabled services from the registry
- **Payment Automation**: Transparent handling of HTTP 402 Payment Required responses
- **Solana Integration**: Native SOL, USDC, and CASH token support
- **MCP Protocol**: Full compliance with Model Context Protocol specification
- **Tool Exposure**: Each discovered service becomes an available tool for Claude
- **Real-time Updates**: Periodic refresh of available services

## Architecture

```
Claude Desktop
      │
      │ MCP Protocol
      ▼
X402 MCP Server
├── Service Discovery
├── Payment Handler
└── Tool Registry
      │
      │ HTTP 402
      ▼
X402 Services (Solana)
```

## Installation

```bash
npm install
npm run build
```

## Configuration

### Environment Variables

Create a `.env` file or set the following:

```bash
# Solana wallet private key (base58 encoded)
WALLET_PRIVATE_KEY=your_solana_private_key

# Network configuration
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com

# X402 Registry URL
X402_REGISTRY_URL=https://registry.x402.network

# Optional: Service refresh interval in seconds (default: 60)
REFRESH_INTERVAL=60
```

### Claude Desktop Setup

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "x402": {
      "command": "node",
      "args": ["dist/solana-mcp-server.js"],
      "cwd": "/path/to/x402-upl/packages/mcp-bridge",
      "env": {
        "WALLET_PRIVATE_KEY": "your_private_key_here",
        "SOLANA_NETWORK": "devnet",
        "X402_REGISTRY_URL": "https://registry.x402.network"
      }
    }
  }
}
```

## Usage

### Starting the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### Available Commands

The server exposes all discovered x402 services as MCP tools. Example tools:

- Price oracle queries
- Data analysis services
- AI inference endpoints
- Custom API integrations

### Example Interaction

**User to Claude**: "Get the current SOL price"

**Claude**:
1. Discovers price oracle service from registry
2. Invokes tool with required parameters
3. Server handles payment automatically
4. Returns price data to Claude
5. Claude responds to user

## Payment Flow

1. **Service Request**: Claude calls an x402 tool
2. **402 Response**: Service returns payment requirements
3. **Payment Execution**: Server creates and signs Solana transaction
4. **Retry with Proof**: Request retried with payment proof header
5. **Service Response**: Data returned to Claude

## Tool Schema

Each x402 service is exposed as an MCP tool with:

```typescript
{
  name: string;          // Unique tool identifier
  description: string;   // Service description
  inputSchema: object;   // JSON Schema for parameters
  metadata: {
    pricePerCall: number;
    acceptedTokens: string[];
    category: string;
  }
}
```

## Development

### Project Structure

```
packages/mcp-bridge/
├── src/
│   └── solana-mcp-server.ts    # Main server implementation
├── package.json
├── tsconfig.json
└── README.md
```

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Troubleshooting

### Server Not Starting

- Verify wallet private key is valid base58 format
- Check Solana RPC URL is accessible
- Ensure registry URL returns services

### Tools Not Appearing in Claude

- Restart Claude Desktop after configuration changes
- Check server logs for errors
- Verify MCP server process is running
- Confirm configuration file path is correct

### Payment Failures

- Ensure wallet has sufficient balance (SOL for gas + payment tokens)
- Verify correct network (devnet vs mainnet-beta)
- Check transaction signatures on Solana explorer
- Confirm service payment addresses are valid

### Service Discovery Issues

- Verify registry URL is accessible
- Check network connectivity
- Review server logs for API errors
- Confirm services are registered in the x402 registry

## Security Considerations

- **Private Keys**: Never commit private keys to version control
- **Wallet Security**: Use dedicated wallets with limited funds for testing
- **Network Selection**: Use devnet for development and testing
- **Service Validation**: Server validates service metadata before exposing tools
- **Payment Limits**: Consider implementing spending limits for production use

## Integration with X402 Ecosystem

This MCP server integrates with:

- **X402 Registry**: Service discovery and metadata
- **X402 Core**: Payment protocol implementation
- **Solana Blockchain**: Transaction execution and verification
- **X402 SDKs**: Compatible with all x402 client implementations

## Contributing

This package is part of the x402-upl monorepo. See the root README for contribution guidelines.

## License

MIT

## Support

For issues and questions:
- GitHub Issues: https://github.com/collinsville22/x402-upl/issues
- Documentation: See root ARCHITECTURE.md and SETUP.md
