# x402-upl WooCommerce Plugin

Production WooCommerce plugin for accepting x402 cryptocurrency payments on Solana.

## Installation

```bash
npm install @x402-upl/woocommerce-plugin
```

## Quick Start

```typescript
import { Keypair } from '@solana/web3.js';
import { WooCommerceX402Plugin, WooCommerceX402Server } from '@x402-upl/woocommerce-plugin';

const merchantWallet = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(process.env.MERCHANT_PRIVATE_KEY!))
);

const plugin = new WooCommerceX402Plugin({
  woocommerceUrl: process.env.WOOCOMMERCE_URL!,
  woocommerceKey: process.env.WOOCOMMERCE_KEY!,
  woocommerceSecret: process.env.WOOCOMMERCE_SECRET!,
  solanaNetwork: 'devnet',
  merchantWallet,
});

const server = new WooCommerceX402Server(plugin, 3000);
server.start();
```

## API Endpoints

### Create Payment Session

```http
POST /api/create-payment
Content-Type: application/json

{
  "orderId": "123",
  "amount": "99.99",
  "currency": "USD"
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

### Complete Order

```http
POST /api/complete-order
Content-Type: application/json

{
  "orderId": "123",
  "signature": "transaction-signature"
}
```

### Refund Order

```http
POST /api/refund-order
Content-Type: application/json

{
  "orderId": "123",
  "amount": "99.99",
  "reason": "Customer requested refund"
}
```

### Get Order

```http
GET /api/order/123
```

### List Orders

```http
GET /api/orders?status=pending&page=1&per_page=10
```

### Create Product

```http
POST /api/products
Content-Type: application/json

{
  "name": "Product Name",
  "price": "99.99",
  "description": "Product description",
  "acceptsCrypto": true
}
```

### Get Merchant Address

```http
GET /api/merchant-address
```

## Webhook Integration

```typescript
import { WooCommerceWebhookHandler } from '@x402-upl/woocommerce-plugin';

const webhookHandler = new WooCommerceWebhookHandler(
  process.env.WOOCOMMERCE_SECRET!,
  {
    onOrderCreated: async (order) => {
      console.log('Order created:', order.id);
    },
    onOrderUpdated: async (order) => {
      console.log('Order updated:', order.id);
    },
    onOrderDeleted: async (order) => {
      console.log('Order deleted:', order.id);
    },
    onOrderRestored: async (order) => {
      console.log('Order restored:', order.id);
    },
  }
);

app.post('/webhooks/woocommerce',
  (req, res, next) => webhookHandler.verifyWebhook(req, res, next),
  (req, res) => webhookHandler.handleWebhook(req, res)
);
```

## Configuration

### Environment Variables

```bash
WOOCOMMERCE_URL=https://yourstore.com
WOOCOMMERCE_KEY=ck_xxxxx
WOOCOMMERCE_SECRET=cs_xxxxx
MERCHANT_PRIVATE_KEY=[1,2,3,...]
SOLANA_NETWORK=devnet
```

### WooCommerce REST API Setup

1. Go to WooCommerce > Settings > Advanced > REST API
2. Add new API key
3. Set permissions to Read/Write
4. Copy Consumer Key and Consumer Secret

### Webhook Setup

1. Go to WooCommerce > Settings > Advanced > Webhooks
2. Add webhooks for:
   - `order.created`
   - `order.updated`
   - `order.deleted`
   - `order.restored`
3. Set webhook URL to your server endpoint
4. Set secret to match your configuration

## Payment Flow

1. Customer adds products to cart
2. Customer proceeds to checkout
3. Server creates x402 payment session
4. Customer pays with Solana wallet
5. Server verifies payment on-chain
6. Server marks order as completed
7. Customer receives order confirmation email

## Currency Mapping

| WooCommerce Currency | Solana Asset |
|---------------------|--------------|
| USD | USDC |
| SOL | SOL |
| CASH | CASH |

## Security

- HMAC signature verification for webhooks
- On-chain payment verification
- Secure wallet key management
- Transaction confirmation checking
- WooCommerce REST API authentication

## Testing

```bash
npm test
```

## License

Apache-2.0
