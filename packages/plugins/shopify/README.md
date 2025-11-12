# x402-upl Shopify Plugin

Production Shopify plugin for accepting x402 cryptocurrency payments on Solana.

## Installation

```bash
npm install @x402-upl/shopify-plugin
```

## Quick Start

```typescript
import { Keypair } from '@solana/web3.js';
import { ShopifyX402Plugin, ShopifyX402Server } from '@x402-upl/shopify-plugin';

const merchantWallet = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(process.env.MERCHANT_PRIVATE_KEY!))
);

const plugin = new ShopifyX402Plugin({
  shopifyApiKey: process.env.SHOPIFY_API_KEY!,
  shopifyApiSecret: process.env.SHOPIFY_API_SECRET!,
  shopifyScopes: ['read_orders', 'write_orders', 'read_products'],
  shopifyHostName: process.env.SHOPIFY_HOST_NAME!,
  solanaNetwork: 'devnet',
  merchantWallet,
});

const server = new ShopifyX402Server(plugin, 3000);
server.start();
```

## API Endpoints

### Create Payment Session

```http
POST /api/create-payment
Content-Type: application/json

{
  "orderId": "123456",
  "amount": "99.99",
  "currency": "USD"
}
```

Response:

```json
{
  "sessionId": "shopify_123456_1234567890",
  "paymentUrl": "/pay/shopify_123456_1234567890",
  "payTo": "merchant-solana-address",
  "amount": "99.99",
  "asset": "USDC"
}
```

### Verify Payment

```http
POST /api/verify-payment
Content-Type: application/json

{
  "signature": "transaction-signature",
  "amount": "99.99"
}
```

Response:

```json
{
  "verified": true
}
```

### Fulfill Order

```http
POST /api/fulfill-order
Content-Type: application/json

{
  "orderId": "123456",
  "signature": "transaction-signature"
}
```

Response:

```json
{
  "success": true
}
```

### Refund Order

```http
POST /api/refund-order
Content-Type: application/json

{
  "orderId": "123456",
  "amount": "99.99",
  "reason": "Customer requested refund"
}
```

Response:

```json
{
  "refundId": "refund-id"
}
```

### Get Merchant Address

```http
GET /api/merchant-address
```

Response:

```json
{
  "address": "merchant-solana-address"
}
```

## Webhook Integration

```typescript
import { ShopifyWebhookHandler } from '@x402-upl/shopify-plugin';

const webhookHandler = new ShopifyWebhookHandler(
  process.env.SHOPIFY_API_SECRET!,
  {
    onOrderCreated: async (order) => {
      console.log('Order created:', order.id);
    },
    onOrderPaid: async (order) => {
      console.log('Order paid:', order.id);
    },
    onOrderCancelled: async (order) => {
      console.log('Order cancelled:', order.id);
    },
    onOrderRefunded: async (order) => {
      console.log('Order refunded:', order.id);
    },
  }
);

app.post('/webhooks/shopify',
  (req, res, next) => webhookHandler.verifyWebhook(req, res, next),
  (req, res) => webhookHandler.handleWebhook(req, res)
);
```

## Configuration

### Environment Variables

```bash
SHOPIFY_API_KEY=your-shopify-api-key
SHOPIFY_API_SECRET=your-shopify-api-secret
SHOPIFY_HOST_NAME=your-store.myshopify.com
MERCHANT_PRIVATE_KEY=[1,2,3,...]
SOLANA_NETWORK=devnet
```

### Shopify App Setup

1. Create a Shopify app in your Partner Dashboard
2. Configure OAuth scopes: `read_orders`, `write_orders`, `read_products`
3. Set up webhook subscriptions:
   - `orders/create`
   - `orders/paid`
   - `orders/cancelled`
   - `refunds/create`
4. Install the app in your store

## Payment Flow

1. Customer initiates checkout on Shopify
2. Shopify sends order to your server
3. Server creates x402 payment session
4. Customer pays with Solana wallet
5. Server verifies payment on-chain
6. Server fulfills order in Shopify
7. Customer receives order confirmation

## Currency Mapping

| Shopify Currency | Solana Asset |
|-----------------|--------------|
| USD | USDC |
| SOL | SOL |
| CASH | CASH |

## Security

- HMAC signature verification for webhooks
- On-chain payment verification
- Secure wallet key management
- Transaction confirmation checking

## Testing

```bash
npm test
```

## License

Apache-2.0
