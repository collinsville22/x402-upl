# x402 Service Provider

Production-ready reference implementation of an x402-enabled API service with multiple endpoints.

## Features

- Express.js server with x402 payment middleware
- 4 paid API endpoints (Weather, Sentiment Analysis, Price Data, Data Analysis)
- USDC payment verification
- Health check endpoint
- Production-ready error handling
- CORS enabled

## Prerequisites

- Node.js 18+
- Solana wallet for treasury
- USDC tokens (devnet or mainnet)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```env
NETWORK=devnet
TREASURY_WALLET=your_wallet_address_here
RPC_URL=https://api.devnet.solana.com

FACILITATOR_URL=https://facilitator.x402.network
RECIPIENT_ADDRESS=your_recipient_wallet_address_here

PORT=4021
```

**Required Variables:**
- `TREASURY_WALLET` - Your Solana wallet address that will receive payments
- `RECIPIENT_ADDRESS` - Wallet address for payment receipts (defaults to TREASURY_WALLET if not set)

**Optional Variables:**
- `FACILITATOR_URL` - x402 facilitator service URL (defaults to https://facilitator.x402.network)
- `RPC_URL` - Solana RPC endpoint
- `NETWORK` - Solana network (devnet, testnet, mainnet-beta)
- `PORT` - Server port (defaults to 4021)

### 3. Run Development Server

```bash
npm run dev
```

Or for production:

```bash
npm run build
npm start
```

The service runs on `http://localhost:4021`.

## API Endpoints

### Protected Endpoints (Require Payment)

**GET /weather?location={location}**
- Price: $0.001 USDC
- Returns mock weather data for specified location
- Example: `GET /weather?location=London`

**POST /sentiment**
- Price: $0.002 USDC
- Analyzes sentiment of provided text
- Body: `{ "text": "Your text here" }`
- Returns sentiment score and classification

**GET /price?symbol={symbol}**
- Price: $0.0015 USDC
- Returns mock crypto price data
- Example: `GET /price?symbol=BTC`
- Supports: BTC, ETH, SOL, USDC, USDT

**POST /analyze**
- Price: $0.003 USDC
- Analyzes data arrays with various analysis types
- Body: `{ "data": [1, 2, 3, 4, 5], "analysisType": "trend" }`
- Analysis types: trend, correlation, prediction

### Public Endpoints

**GET /health**
- Health check endpoint
- No payment required
- Returns service status and configuration

## Payment Flow

1. Client makes request without payment → receives 402 Payment Required
2. Response includes payment requirements (amount, recipient, network)
3. Client sends on-chain payment via Solana
4. Client retries request with `x-payment` header containing transaction signature
5. Middleware verifies payment on-chain
6. If valid, request proceeds to endpoint handler

## Testing with x402 SDK

```typescript
import { X402Client } from '@x402-upl/sdk';

const client = new X402Client({
  network: 'devnet',
  walletPrivateKey: yourPrivateKey,
});

// Automatically handles payment flow
const weather = await client.get('http://localhost:4021/weather?location=Paris');
console.log(weather);
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TREASURY_WALLET` | Yes | - | Solana wallet receiving payments |
| `RECIPIENT_ADDRESS` | No | TREASURY_WALLET | Payment receipt wallet |
| `FACILITATOR_URL` | No | https://facilitator.x402.network | x402 facilitator service |
| `NETWORK` | No | devnet | Solana network |
| `RPC_URL` | No | https://api.devnet.solana.com | Solana RPC endpoint |
| `PORT` | No | 4021 | Server port |

## Production Deployment

### Environment Configuration

For production, set:

```env
NETWORK=mainnet-beta
TREASURY_WALLET=your_mainnet_wallet
RPC_URL=https://api.mainnet-beta.solana.com
RECIPIENT_ADDRESS=your_mainnet_wallet
FACILITATOR_URL=https://facilitator.x402.network
```

### Security Considerations

- Keep private keys secure, never commit to version control
- Use environment-specific RPC endpoints
- Monitor payment verification logs
- Set up proper CORS configuration for your domain
- Consider rate limiting for production

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 4021
CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t x402-service-provider .
docker run -p 4021:4021 --env-file .env x402-service-provider
```

## Customizing Endpoints

### Adding New Endpoints

Add new routes with custom pricing:

```typescript
// In middleware config
pricing: {
  '/your-endpoint': {
    pricePerCall: 0.005,
    currency: 'USDC',
  },
}

// Add route handler
app.get('/your-endpoint', (req, res) => {
  // Your logic here
  res.json({ result: 'data' });
});
```

### Payment Callbacks

The middleware includes callbacks for payment events:

```typescript
onPaymentVerified: async (receipt) => {
  console.log('Payment verified:', receipt.signature);
  // Add custom logic: logging, analytics, settlement tracking
},
onPaymentFailed: async (reason) => {
  console.error('Payment failed:', reason);
  // Add custom logic: alerts, monitoring
},
```

## Monitoring

The service logs important events:

- Server startup with configuration
- Available services and pricing
- Payment verification success/failure
- Request handling

Consider integrating with logging services like Winston or Pino for production.

## Troubleshooting

**Server won't start:**
- Ensure `TREASURY_WALLET` is set and is a valid Solana public key
- Check that port 4021 is available

**Payment verification failing:**
- Verify RPC_URL is accessible and correct for your network
- Ensure TREASURY_WALLET matches the payment recipient
- Check transaction exists on-chain and is confirmed

**402 responses not working:**
- Verify middleware is applied before route handlers
- Check pricing configuration matches your endpoints
- Ensure client includes `x-payment` header with transaction signature

## Support

- Documentation: https://docs.x402.network
- Registry: https://registry.x402.network
- Issues: https://github.com/x402-upl/issues

## License

MIT
