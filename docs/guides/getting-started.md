# Getting Started with X402-UPL

Complete step-by-step guide to building your first x402-enabled service and client.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Building Your First Service](#building-your-first-service)
4. [Creating a Client](#creating-a-client)
5. [Testing the Integration](#testing-the-integration)
6. [Deploying to Production](#deploying-to-production)

## Prerequisites

### Required Software

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 9.0.0 or higher
- **Solana CLI**: Latest version
- **Git**: For cloning repositories

### Required Accounts

- **Solana Wallet**: Create using Solana CLI or Phantom
- **GitHub Account**: For deployment (optional)
- **Vercel/Railway Account**: For hosting (optional)

### Recommended Knowledge

- Basic understanding of HTTP/REST APIs
- Familiarity with async/await in JavaScript
- Basic knowledge of blockchain concepts
- Understanding of payment systems

## Installation

### Step 1: Set Up Solana Wallet

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Create a new keypair (or import existing)
solana-keygen new --outfile ~/.config/solana/devnet-wallet.json

# Set to devnet
solana config set --url https://api.devnet.solana.com

# Check your balance
solana balance

# Request airdrop (devnet only)
solana airdrop 2
```

### Step 2: Install X402-UPL CLI

```bash
npm install -g @x402-upl/cli

# Verify installation
x402 --version
```

### Step 3: Initialize Configuration

```bash
# Create configuration directory
x402 init

# Configure your wallet
x402 config set wallet ~/.config/solana/devnet-wallet.json
x402 config set network devnet
x402 config set registry https://registry.x402.network
```

## Building Your First Service

### Step 1: Create Service Project

```bash
# Create a new Express service
npx create-x402-service my-weather-service --template express

# Navigate to project
cd my-weather-service

# Install dependencies
npm install
```

### Step 2: Configure the Service

Edit `src/config.ts`:

```typescript
export const config = {
  port: process.env.PORT || 3000,
  x402: {
    network: 'devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    treasuryWallet: process.env.TREASURY_WALLET,
    acceptedTokens: [
      // USDC devnet
      '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      // CASH
      'CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH',
    ],
    timeout: 300000, // 5 minutes
    redisUrl: process.env.REDIS_URL,
  },
  pricing: {
    '/api/weather/current': {
      pricePerCall: 0.001,
      currency: 'USDC',
    },
    '/api/weather/forecast': {
      pricePerCall: 0.002,
      currency: 'USDC',
    },
  },
};
```

### Step 3: Implement Service Logic

Edit `src/routes/weather.ts`:

```typescript
import { Router } from 'express';
import { createX402Middleware } from '@x402-upl/core';
import { config } from '../config';

const router = Router();

// Apply x402 payment middleware
const x402 = createX402Middleware(config.x402);

// Protected endpoint - requires payment
router.get('/current', x402, async (req, res) => {
  const { city } = req.query;

  // Your business logic here
  const weatherData = await fetchWeatherData(city);

  res.json({
    city,
    temperature: weatherData.temp,
    condition: weatherData.condition,
    timestamp: new Date().toISOString(),
  });
});

// Another protected endpoint
router.get('/forecast', x402, async (req, res) => {
  const { city, days = 7 } = req.query;

  const forecast = await fetchForecastData(city, days);

  res.json({
    city,
    forecast: forecast.map(day => ({
      date: day.date,
      high: day.high,
      low: day.low,
      condition: day.condition,
    })),
  });
});

async function fetchWeatherData(city: string) {
  // Integrate with real weather API (OpenWeather, WeatherAPI, etc.)
  // This is mock data for demonstration
  return {
    temp: 72,
    condition: 'sunny',
  };
}

async function fetchForecastData(city: string, days: number) {
  // Integrate with real forecast API
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.now() + i * 86400000).toISOString(),
    high: 75 + Math.random() * 10,
    low: 60 + Math.random() * 10,
    condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
  }));
}

export default router;
```

### Step 4: Register with X402 Registry

```bash
# Set your treasury wallet address
export TREASURY_WALLET=$(solana address)

# Start your service locally
npm run dev

# In another terminal, register your service
x402 register \
  --url http://localhost:3000/api/weather/current \
  --name "Weather API - Current" \
  --description "Get current weather data for any city" \
  --price 0.001 \
  --currency USDC \
  --category "Data & APIs"

x402 register \
  --url http://localhost:3000/api/weather/forecast \
  --name "Weather API - Forecast" \
  --description "Get 7-day weather forecast" \
  --price 0.002 \
  --currency USDC \
  --category "Data & APIs"
```

## Creating a Client

### Step 1: Install SDK

```bash
mkdir weather-client
cd weather-client
npm init -y
npm install @x402-upl/sdk @solana/web3.js
```

### Step 2: Create Client Script

Create `index.js`:

```javascript
const { X402Client } = require('@x402-upl/sdk');
const { Keypair } = require('@solana/web3.js');
const fs = require('fs');

async function main() {
  // Load your wallet
  const walletData = JSON.parse(
    fs.readFileSync(process.env.HOME + '/.config/solana/devnet-wallet.json')
  );
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

  // Create x402 client
  const client = new X402Client({
    network: 'devnet',
    wallet,
    registryApiUrl: 'https://registry.x402.network',
  });

  console.log('Wallet:', wallet.publicKey.toBase58());
  console.log('Balance:', await client.getBalance());

  // Discover weather services
  console.log('\nDiscovering weather services...');
  const services = await client.discover({
    category: 'Data & APIs',
    query: 'weather',
  });

  console.log(`Found ${services.length} weather services:`);
  services.forEach((service, i) => {
    console.log(`${i + 1}. ${service.name} - ${service.pricePerCall} USDC`);
  });

  // Call the weather API (payment handled automatically)
  console.log('\nFetching weather for New York...');
  const response = await client.get(
    'http://localhost:3000/api/weather/current',
    { city: 'New York' }
  );

  console.log('Weather:', response);
  console.log('New Balance:', await client.getBalance());

  // Get payment history
  const history = client.getPaymentHistory();
  console.log('\nPayment History:');
  history.forEach(payment => {
    console.log(`- ${payment.amount} ${payment.currency} to ${payment.service}`);
  });
}

main().catch(console.error);
```

### Step 3: Run the Client

```bash
# Ensure your service is running
node index.js
```

**Expected Output:**
```
Wallet: ABC123...XYZ789
Balance: 1.5 SOL, 10 USDC

Discovering weather services...
Found 2 weather services:
1. Weather API - Current - 0.001 USDC
2. Weather API - Forecast - 0.002 USDC

Fetching weather for New York...
Payment Required: 0.001 USDC
Creating payment transaction...
Payment confirmed: signature_abc123
Weather: { city: 'New York', temperature: 72, condition: 'sunny' }
New Balance: 1.5 SOL, 9.999 USDC

Payment History:
- 0.001 USDC to http://localhost:3000/api/weather/current
```

## Testing the Integration

### Manual Testing with cURL

```bash
# Step 1: Try without payment (should get 402)
curl -v http://localhost:3000/api/weather/current?city=Boston

# Response:
# HTTP/1.1 402 Payment Required
# Content-Type: application/json
#
# {
#   "scheme": "exact",
#   "network": "solana-devnet",
#   "asset": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
#   "payTo": "YOUR_WALLET_ADDRESS",
#   "amount": "0.001",
#   "nonce": "abc123xyz"
# }

# Step 2: Create payment on Solana
# (Use Solana CLI or Phantom to send 0.001 USDC)

# Step 3: Retry with payment proof
curl -v http://localhost:3000/api/weather/current?city=Boston \
  -H "X-Payment: $(echo '{
    "network": "solana-devnet",
    "asset": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    "from": "YOUR_WALLET",
    "to": "SERVICE_WALLET",
    "amount": "0.001",
    "signature": "TRANSACTION_SIGNATURE",
    "timestamp": 1699999999,
    "nonce": "abc123xyz"
  }' | base64)"

# Response:
# HTTP/1.1 200 OK
# {
#   "city": "Boston",
#   "temperature": 68,
#   "condition": "cloudy"
# }
```

### Automated Testing

Create `test/integration.test.js`:

```javascript
const { X402Client } = require('@x402-upl/sdk');
const { Keypair } = require('@solana/web3.js');
const assert = require('assert');

describe('X402 Weather Service', () => {
  let client;
  let wallet;

  before(async () => {
    wallet = Keypair.generate();
    // Fund wallet with test tokens
    await fundWallet(wallet.publicKey);

    client = new X402Client({
      network: 'devnet',
      wallet,
      registryApiUrl: 'http://localhost:3001',
    });
  });

  it('should discover weather services', async () => {
    const services = await client.discover({
      category: 'Data & APIs',
      query: 'weather',
    });

    assert(services.length > 0, 'Should find weather services');
    assert(services[0].pricePerCall, 'Service should have price');
  });

  it('should fetch current weather with payment', async () => {
    const initialBalance = await client.getBalance('USDC');

    const weather = await client.get(
      'http://localhost:3000/api/weather/current',
      { city: 'Seattle' }
    );

    assert(weather.city === 'Seattle', 'Should return Seattle weather');
    assert(weather.temperature, 'Should have temperature');

    const newBalance = await client.getBalance('USDC');
    assert(newBalance < initialBalance, 'Balance should decrease');
  });

  it('should handle forecast requests', async () => {
    const forecast = await client.get(
      'http://localhost:3000/api/weather/forecast',
      { city: 'Miami', days: 5 }
    );

    assert(Array.isArray(forecast.forecast), 'Should return array');
    assert(forecast.forecast.length === 5, 'Should have 5 days');
  });

  it('should track payment history', async () => {
    const history = client.getPaymentHistory();

    assert(history.length >= 2, 'Should have at least 2 payments');
    assert(history[0].service.includes('weather'), 'Should be weather service');
  });
});
```

## Deploying to Production

### Prepare for Deployment

1. **Update Configuration**

```bash
# Set production environment variables
export NODE_ENV=production
export SOLANA_NETWORK=mainnet-beta
export SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
export TREASURY_WALLET=your_mainnet_wallet
export REDIS_URL=redis://production-redis:6379
```

2. **Enable Redis for Production**

```bash
# Install Redis
docker run -d \
  --name x402-redis \
  -p 6379:6379 \
  redis:alpine

# Or use managed Redis (Railway, Upstash, etc.)
```

3. **Security Checklist**

- [ ] Use environment variables for all sensitive data
- [ ] Enable CORS only for trusted domains
- [ ] Implement rate limiting
- [ ] Set up monitoring and alerts
- [ ] Use HTTPS for all endpoints
- [ ] Validate all user inputs
- [ ] Enable request logging
- [ ] Set up backup treasury wallet

### Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Add Redis
railway add redis

# Set environment variables
railway variables set TREASURY_WALLET=your_wallet
railway variables set SOLANA_NETWORK=mainnet-beta

# Deploy
railway up
```

### Deploy to Vercel (for Next.js services)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables
vercel env add TREASURY_WALLET
vercel env add SOLANA_NETWORK

# Deploy to production
vercel --prod
```

### Register Production Service

```bash
x402 register \
  --url https://your-service.railway.app/api/weather/current \
  --name "Weather API - Current" \
  --description "Professional weather data API" \
  --price 0.001 \
  --currency USDC \
  --category "Data & APIs" \
  --production
```

## Next Steps

Now that you have a working x402 service, explore:

1. **[Best Practices](best-practices)** - Production tips and optimization
2. **[Component Documentation](../components/)** - Deep dive into core components
3. **[API Reference](../api-reference/)** - Complete API documentation
4. **[Integration Guides](../integrations/)** - Integrate with MCP, Eliza, etc.
5. **[Examples](../examples/)** - Real-world implementation examples

## Troubleshooting

### Service Not Receiving Payments

- Verify treasury wallet address is correct
- Check Redis connection for signature tracking
- Ensure RPC URL is accessible
- Verify token mint addresses match network

### Client Connection Issues

- Confirm service is running and accessible
- Check wallet has sufficient balance
- Verify network configuration (devnet vs mainnet)
- Test with cURL first before using SDK

### Need Help?

- [Troubleshooting Guide](../troubleshooting/common-issues)
- [FAQ](../troubleshooting/faq)
- [GitHub Issues](https://github.com/collinsville22/x402-upl/issues)
- [GitHub Discussions](https://github.com/collinsville22/x402-upl/discussions)
