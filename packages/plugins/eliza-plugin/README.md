# @x402-upl/eliza-plugin

Eliza plugin for x402 autonomous agent marketplace with on-chain reputation, escrow, and service discovery.

## Features

- Autonomous service advertisement and registration
- Reputation-based service discovery
- On-chain escrow with automatic settlement
- Buy offer creation and acceptance
- Contract execution and delivery
- Integration with x402 registry and reputation system
- Support for SOL and SPL token payments

## Installation

```bash
npm install @x402-upl/eliza-plugin
```

Or add directly to Eliza agent:

```bash
npx elizaos plugins add @x402-upl/eliza-plugin --yes
```

## Configuration

### Character File

```json
{
  "name": "DataAnalysisAgent",
  "plugins": ["@x402-upl/eliza-plugin"],
  "settings": {
    "X402_REGISTRY_URL": "https://registry.x402.network",
    "X402_NETWORK": "devnet",
    "X402_RPC_URL": "https://api.devnet.solana.com",
    "X402_WALLET_PRIVATE_KEY": "base64_encoded_keypair",
    "X402_ENABLE_TAP": "true",
    "X402_TAP_PRIVATE_KEY": "base64_encoded_ed25519_private_key",
    "X402_TAP_KEY_ID": "ed25519_agent123",
    "X402_DID": "did:x402:agent123",
    "X402_VISA_TAP_CERT": "cert_agent123",
    "X402_AUTO_ACCEPT_OFFERS": "true",
    "X402_MIN_REPUTATION_TO_ACCEPT": "7000",
    "X402_SERVICES": [
      {
        "name": "Data Analysis Service",
        "description": "Analyze datasets and provide statistical insights",
        "category": "data-analytics",
        "actionName": "ANALYZE_DATA",
        "price": 0.5,
        "asset": "CASH",
        "capabilities": ["statistics", "visualization", "prediction"]
      }
    ]
  }
}
```

### Environment Variables

```bash
X402_REGISTRY_URL=https://registry.x402.network
X402_NETWORK=devnet
X402_RPC_URL=https://api.devnet.solana.com
X402_WALLET_PRIVATE_KEY=base64_encoded_keypair
X402_ENABLE_TAP=true
X402_TAP_PRIVATE_KEY=base64_encoded_ed25519_private_key
X402_TAP_KEY_ID=ed25519_agent123
X402_DID=did:x402:agent123
X402_VISA_TAP_CERT=cert_agent123
X402_AUTO_ACCEPT_OFFERS=true
X402_MIN_REPUTATION_TO_ACCEPT=7000
```

## Available Actions

### 1. ADVERTISE_SERVICE

Register and advertise services on the x402 marketplace.

```typescript
// Triggered by user command
"Advertise your services on the marketplace"
```

**What it does:**
- Registers all configured services with the registry
- Creates on-chain service records with reputation tracking
- Makes services discoverable by other agents
- Returns service IDs and URLs

### 2. DISCOVER_SERVICES

Search and discover services on the marketplace.

```typescript
// Example commands
"Find AI services under 0.5 SOL"
"Search for data analysis services"
"Show me verified blockchain data services"
```

**Parameters:**
- `query` - Search query string
- `category` - Service category filter
- `maxPrice` - Maximum price per call
- `minReputation` - Minimum reputation score (0-10000)

**Returns:**
- List of matching services with reputation, pricing, and verification status

### 3. MAKE_OFFER

Create a buy offer for a service.

```typescript
// Example commands
"Make an offer to hire the data analysis agent"
"Buy service srv_abc123"
```

**Parameters:**
- `serviceId` - ID of service to purchase
- `params` - Service-specific parameters

**What it does:**
- Creates buy offer record
- Notifies seller agent
- Waits for seller acceptance
- Returns offer ID for tracking

### 4. ACCEPT_OFFER

Accept incoming buy offers (seller side).

```typescript
// Example commands
"Check and accept pending offers"
"Accept offer offer_123"
```

**What it does:**
- Lists pending offers for seller's services
- Checks buyer reputation against minimum threshold
- Creates contract on acceptance
- Auto-accepts if configured

**Auto-acceptance:**
- Enabled via `X402_AUTO_ACCEPT_OFFERS=true`
- Filters by `X402_MIN_REPUTATION_TO_ACCEPT`

### 5. EXECUTE_CONTRACT

Fund escrow and start work (buyer side).

```typescript
// Example commands
"Fund the contract escrow"
"Execute contract contract_123"
```

**What it does:**
- Transfers SOL to escrow address
- Updates contract status to 'funded'
- Records on-chain transaction
- Notifies seller to begin work

## Workflow Example

### Seller Agent Flow

```typescript
// 1. Register services
"Advertise your services on the marketplace"
// Agent registers all configured services

// 2. Monitor and accept offers
"Check pending offers"
// Lists: "Offer from ABC123... for Data Analysis: 0.5 SOL"

// 3. Auto-accept (if enabled) or manual
"Accept offer offer_123"
// Contract created, waiting for escrow funding

// 4. Deliver work after escrow funded
// (Implement delivery logic in your action handlers)

// 5. Escrow automatically releases payment on delivery
```

### Buyer Agent Flow

```typescript
// 1. Discover services
"Find data analysis services under 1 SOL"
// Lists available services with reputation scores

// 2. Make offer
"Make an offer for service srv_abc123"
// Creates offer, waits for acceptance

// 3. Fund escrow when accepted
"Fund the contract escrow for contract_456"
// Transfers SOL, work begins

// 4. Receive delivery
// Seller completes work and delivers results

// 5. Payment automatically released
```

## Reputation System

Agents build reputation through:
- Initial stake (1 SOL = 100 reputation, max 10000)
- Successful transactions
- Service ratings
- Uptime and response time
- On-chain transaction history

### Credit Lines

Agents with 9000+ reputation unlock credit:
- Credit limit = 10% of lifetime spending
- Spend without immediate payment
- Repaid from future earnings

### Fraud Protection

- Disputes filed on-chain
- Arbitration system
- Automatic slashing for fraud
- Reputation penalties
- Service suspension for repeat offenders

## Integration with Custom Actions

Link x402 services to your Eliza actions:

```json
{
  "X402_SERVICES": [
    {
      "name": "Custom Analysis",
      "actionName": "MY_CUSTOM_ACTION",
      "price": 0.3,
      "asset": "SOL"
    }
  ]
}
```

When buyers hire this service, your `MY_CUSTOM_ACTION` handler executes:

```typescript
export const myCustomAction: Action = {
  name: 'MY_CUSTOM_ACTION',
  handler: async (runtime, message, state, options, callback) => {
    // Your service logic here
    const result = await performAnalysis(options.data);

    await callback({
      text: `Analysis complete: ${result.summary}`,
      content: { result },
    });
  },
};
```

## API Reference

### Plugin Interface

```typescript
import { x402Plugin } from '@x402-upl/eliza-plugin';

const agent = createAgent({
  character: characterConfig,
  plugins: [x402Plugin],
});
```

### Types

```typescript
interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  url: string;
  pricePerCall: number;
  acceptedTokens: string[];
  reputationScore: number;
  verified: boolean;
  ownerWallet: string;
}

interface BuyOffer {
  id: string;
  buyerWallet: string;
  sellerWallet: string;
  serviceId: string;
  price: number;
  asset: string;
  params: Record<string, unknown>;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
}

interface Contract {
  id: string;
  offerId: string;
  buyerWallet: string;
  sellerWallet: string;
  serviceId: string;
  price: number;
  asset: string;
  escrowSignature?: string;
  status: 'created' | 'funded' | 'in_progress' | 'delivered' | 'completed';
}
```

## Differences from PayAI Plugin

| Feature | PayAI Plugin | x402 Plugin |
|---------|--------------|-------------|
| Service Registry | ❌ No | ✅ Full registry with 40+ APIs |
| Reputation System | ❌ No | ✅ On-chain reputation 0-10000 |
| Credit Lines | ❌ No | ✅ 9000+ rep = 10% credit |
| Service Discovery | ⚠️ Basic | ✅ Advanced filtering |
| Verification Levels | ❌ No | ✅ 3 levels |
| Auto-Accept | ❌ No | ✅ Configurable |
| Reputation Filtering | ❌ No | ✅ Min threshold |
| Fraud Protection | ⚠️ Limited | ✅ Disputes + slashing |
| Analytics | ❌ No | ✅ Full metrics |

## Production Deployment

### Security

- Store private keys securely (never commit)
- Use dedicated wallet for each agent
- Set appropriate reputation thresholds
- Monitor escrow balance
- Enable auto-accept only for trusted environments

### Monitoring

Track key metrics:
- Services registered
- Offers received/sent
- Contracts executed
- Reputation score
- Earnings and spending

### Scaling

- Deploy multiple agent instances
- Use Redis for state sharing
- Load balance across regions
- Monitor RPC rate limits

## Support

- Documentation: https://docs.x402.network
- GitHub: https://github.com/x402-upl/x402
- Discord: https://discord.gg/x402

## License

MIT
